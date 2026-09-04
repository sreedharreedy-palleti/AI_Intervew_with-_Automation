const mongoose = require('mongoose');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'hirepulse_ai_secure_jwt_secret_2026';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, 'Please provide a valid email address']
    },
    passwordHash: {
      type: String,
      required: true
    },
    salt: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['candidate', 'user', 'admin', 'recruiter'],
      default: 'candidate'
    },
    targetRole: {
      type: String,
      default: 'Full Stack Developer',
      trim: true
    },
    phone: {
      type: String,
      default: '',
      trim: true
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active'
    },
    lastLogin: {
      type: Date,
      default: null
    },
    resumeAnalysisId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ResumeAnalysis',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Method to set password hash with cryptographic salt
userSchema.methods.setPassword = function (password) {
  this.salt = crypto.randomBytes(16).toString('hex');
  this.passwordHash = crypto
    .pbkdf2Sync(password, this.salt, 10000, 64, 'sha512')
    .toString('hex');
};

// Method to validate candidate/user password
userSchema.methods.validatePassword = function (password) {
  if (!this.salt || !this.passwordHash) return false;
  const hash = crypto
    .pbkdf2Sync(password, this.salt, 10000, 64, 'sha512')
    .toString('hex');
  return crypto.timingSafeEqual(Buffer.from(this.passwordHash), Buffer.from(hash));
};

// Method to generate secure signed token
userSchema.methods.generateAuthToken = function () {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      id: this._id.toString(),
      email: this.email,
      name: this.name,
      role: this.role,
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 // 7 days expiration
    })
  ).toString('base64url');

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
};

// Static method to verify token
userSchema.statics.verifyAuthToken = function (token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  if (signature !== expectedSignature) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return decoded;
  } catch (err) {
    return null;
  }
};

// Safe JSON serialization
userSchema.methods.toSafeJSON = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    targetRole: this.targetRole,
    phone: this.phone,
    status: this.status,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', userSchema);
