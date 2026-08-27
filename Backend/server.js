require('dotenv').config();
const configureDNS = require('./src/config/dnsConfig');

// Configure DNS servers
configureDNS();

const app = require('./src/app');
const mongoose = require('mongoose');

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Connect to MongoDB
if (MONGO_URI) {
  mongoose
    .connect(MONGO_URI)
    .then(() => {
      console.log('MongoDB connected successfully');
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err.message);
      if (err.message && err.message.includes('querySrv')) {
        console.error('DNS SRV Resolution Issue. Using Google DNS (8.8.8.8) or standard connection string resolves this.');
      }
      if (err.message && (err.message.includes('whitelist') || err.message.includes('bad auth') || err.name === 'MongooseServerSelectionError')) {
        console.error('Atlas Network Access Tip: Make sure your current IP address (or 0.0.0.0/0) is added to MongoDB Atlas Network Access whitelist.');
      }
    });
} else {
  console.warn('MONGO_URI is not defined in environment variables.');
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});