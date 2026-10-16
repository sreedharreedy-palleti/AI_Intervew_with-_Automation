# HirePulse AI — React Frontend Application

HirePulse AI is an enterprise-grade AI Interview & Course Enrollment Platform built with **React**, **Vite**, and **FastAPI / MongoDB** on the backend. It features automated resume parsing, real-time ATS screening with Ollama (Llama 3), role-based access control (Candidates & Administrators), course rosters, and interactive assessment workflows.

---

## 📁 Project Architecture & Folder Structure

The project follows a modular, domain-driven structure designed so that any engineer can immediately understand where components, services, and routes reside:

```
Frontend/
├── .env                              # Environment variables (Backend API base URL)
├── index.html                        # Application HTML root & Google Fonts
├── vite.config.js                    # Vite bundler configuration (port 5173)
├── package.json                      # Project dependencies & scripts
│
└── src/
    ├── api/                          # Centralized API service modules
    │   ├── apiClient.js              # Axios instance with auth interceptors & error handler
    │   ├── authApi.js                # User & Admin login, OTP verification, register, forgot-password
    │   ├── courseApi.js              # Candidate course catalog, details, AI resume enrollment
    │   └── adminApi.js               # Admin courses, rosters, and candidate CRUD management
    │
    ├── context/                      # React Context providers for global state
    │   ├── AuthContext.jsx           # User authentication, token persistence, role state
    │   └── ToastContext.jsx          # Animated floating toast notification system
    │
    ├── hooks/                        # Custom reusable React hooks
    │   ├── useAuth.js                # Hook to access authentication session
    │   └── useToast.js               # Hook to trigger success/error/warning toasts
    │
    ├── components/                   # Modular, reusable UI components
    │   ├── common/                   # Reusable UI primitives
    │   │   ├── Navbar.jsx            # Top navigation with role badge & session actions
    │   │   ├── Sidebar.jsx           # Admin navigation sidebar
    │   │   ├── Button.jsx            # Button variants (primary, secondary, danger, ghost)
    │   │   ├── Modal.jsx             # Accessible animated modal dialogs
    │   │   ├── Input.jsx             # Styled form inputs with validation indicators
    │   │   ├── Badge.jsx             # Role, level, and verification status pills
    │   │   ├── Card.jsx              # Glassmorphic container panels
    │   │   └── Loader.jsx            # Modern loading spinners & skeleton states
    │   │
    │   ├── guards/                   # Route protection guards
    │   │   ├── ProtectedRoute.jsx    # Protects candidate routes from unauthenticated access
    │   │   ├── AdminRoute.jsx        # Enforces administrator role check
    │   │   └── PublicOnlyRoute.jsx   # Redirects authenticated users from login/register
    │   │
    │   └── layout/                   # Structural page templates
    │       ├── MainLayout.jsx        # Candidate layout (Navbar + Content + Footer)
    │       ├── AdminLayout.jsx       # Admin layout (Sidebar + Header Bar + Content)
    │       └── AuthLayout.jsx        # Auth cards layout with quick credentials helper
    │
    ├── pages/                        # Page views mapped to router paths
    │   ├── auth/                     # Authentication pages
    │   │   ├── UserLogin.jsx         # Candidate sign in
    │   │   ├── UserRegister.jsx      # 3-step candidate signup with Gmail OTP verification
    │   │   ├── ForgotPassword.jsx    # 3-step password recovery (Send OTP -> Verify -> Reset)
    │   │   └── AdminLogin.jsx        # Dedicated Admin portal sign in
    │   │
    │   ├── user/                     # Candidate experience
    │   │   ├── CourseCatalog.jsx     # Browse courses with search & level filters
    │   │   ├── CourseDetail.jsx      # Syllabus breakdown & prerequisites
    │   │   ├── CourseEnrollModal.jsx # Resume upload modal with real-time AI ATS report
    │   │   └── MyEnrollments.jsx     # Candidate applications dashboard
    │   │
    │   ├── admin/                    # Admin portal
    │   │   ├── AdminDashboard.jsx    # Aggregated platform statistics & quick actions
    │   │   ├── AdminCourses.jsx      # Course management (Create, List, Delete)
    │   │   ├── AdminCourseRoster.jsx # Course student roster with clickable resume links
    │   │   ├── AdminUsers.jsx        # Candidate directory CRUD (Create, Edit, Delete)
    │   │   └── AdminUserDetail.jsx   # Candidate profile with enrolled course history
    │   │
    │   ├── assignment/               # Shortlisted assessment
    │   │   └── AssignmentView.jsx    # Interactive AI interview assessment for candidates
    │   │
    │   └── NotFound.jsx              # 404 page
    │
    ├── routes/                       # Router definitions
    │   └── AppRouter.jsx             # Route definitions with role-based guards
    │
    ├── styles/                       # CSS design tokens & animations
    │   ├── index.css                 # Base theme variables, typography & reset
    │   └── App.css                   # Glassmorphism, buttons, forms, and keyframe animations
    │
    ├── utils/                        # Utilities & constants
    │   ├── constants.js              # API endpoints, roles, and default credentials
    │   └── formatters.js             # Date formatters, resume URL helper, score styling
    │
    ├── App.jsx                       # Root provider composition
    └── main.jsx                      # Vite React 19 entry point
```

---

## 🔗 Backend API Integration Matrix

| Feature | Backend Endpoint | Frontend Service | UI Component / Page |
| :--- | :--- | :--- | :--- |
| **Send OTP** | `POST /api/v1/auth/user/send-registration-otp` | `authApi.sendRegistrationOtp` | `UserRegister.jsx` (Step 1) |
| **Verify OTP** | `POST /api/v1/auth/user/verify-registration-otp` | `authApi.verifyRegistrationOtp` | `UserRegister.jsx` (Step 2) |
| **User Register** | `POST /api/v1/auth/user/register` | `authApi.registerUser` | `UserRegister.jsx` (Step 3) |
| **User Login** | `POST /api/v1/auth/user/login` | `authApi.loginUser` | `UserLogin.jsx` |
| **Admin Login** | `POST /api/v1/auth/admin/login` | `authApi.loginAdmin` | `AdminLogin.jsx` |
| **Forgot Password** | `POST /api/v1/auth/user/forgot-password-*` | `authApi.forgotPassword*` | `ForgotPassword.jsx` |
| **List Courses** | `GET /api/v1/user/courses` | `courseApi.getCourses` | `CourseCatalog.jsx` |
| **Course Details** | `GET /api/v1/user/courses/{course_id}` | `courseApi.getCourseDetail` | `CourseDetail.jsx` |
| **Resume AI ATS** | `POST /api/v1/user/courses/{course_id}/enroll` | `courseApi.enrollWithResume` | `CourseEnrollModal.jsx` |
| **Admin Courses** | `GET, POST /api/v1/admin/courses` | `adminApi.listCourses, createCourse` | `AdminCourses.jsx` |
| **Delete Course** | `DELETE /api/v1/admin/courses/{course_id}` | `adminApi.deleteCourse` | `AdminCourses.jsx` |
| **Course Roster** | `GET /api/v1/admin/courses/{id}/enrolled-users` | `adminApi.getCourseEnrolledUsers` | `AdminCourseRoster.jsx` |
| **Admin Users** | `GET, POST /api/v1/admin/users` | `adminApi.listUsers, createUser` | `AdminUsers.jsx` |
| **Update User** | `PUT /api/v1/admin/users/{user_id}` | `adminApi.updateUser` | `AdminUsers.jsx` |
| **Delete User** | `DELETE /api/v1/admin/users/{user_id}` | `adminApi.deleteUser` | `AdminUsers.jsx` |
| **User Details** | `GET /api/v1/admin/users/{user_id}` | `adminApi.getUserDetail` | `AdminUserDetail.jsx` |
| **Static Resumes**| `GET http://localhost:8000/uploads/resumes/...`| `getResumeUrl(path)` | `AdminCourseRoster.jsx` |

---

## 🚀 Getting Started

### 1. Start the Backend API
Make sure your MongoDB server or Atlas cluster is reachable and launch FastAPI:
```bash
cd Backend
python main.py
```
The backend starts at `http://localhost:8000` (docs available at `http://localhost:8000/docs`).

To seed the initial admin account:
```bash
cd Backend
python create_admin.py
```

### 2. Start the Frontend
```bash
cd Frontend
npm install
npm run dev
```
The frontend starts at `http://localhost:5173`.

---

## 🔑 Demo & Test Credentials

Quick auto-fill buttons are built directly into the login interfaces for convenient review:

| Role | Email | Password | Access Rights |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@example.com` | `YourAdminPassword123!` | Executive dashboard, course CRUD, rosters & resumes, candidate management |
| **Candidate** | Register with OTP or sign in | Set during signup | Browse courses, upload resume for AI ATS screening, view applications, take AI interview |

---

## 🎨 Design & Aesthetic Highlights

- **Palette**: Deep slate canvas (`#0b0f19`), neon indigo/violet accents (`#6366f1`, `#8b5cf6`), and emerald highlights (`#10b981`).
- **Glassmorphism**: Backdrop blur with translucent borders and soft radiant glows.
- **Micro-Animations**: Animated state transitions, pulse meters, radial ATS score gauges, and fade-in panels.
- **Responsiveness**: Grid cards that seamlessly scale from mobile screens to ultrawide displays.
