# 🌿 Habit Tracker

A full-stack **MERN** habit tracking application with a futuristic sci-fi themed UI, featuring separate **User** and **Admin** dashboards, streak tracking, analytics, and password reset functionality.

> **Live Demo:** [habit-tracker-rose-eight.vercel.app](https://habit-tracker-rose-eight.vercel.app)

---

## ✨ Features

### 👤 User Panel
- **Signup & Login** — Secure JWT-based authentication
- **Habit CRUD** — Create, view, mark done, undo, and delete habits
- **Streak System** — Daily streaks with restore points when you miss a day
- **Weekly Analytics** — Visual progress graphs for the past 7 days
- **Calendar View** — Monthly habit completion calendar
- **Snapshot History** — View habit data for any past date
- **Forgot Password** — Self-service password reset portal

### 🛡️ Admin Panel
- **Dashboard** — Real-time platform statistics (users, habits, streaks)
- **User Management** — View all users, inspect details, delete accounts
- **Habit Management** — Browse and remove any habit across the platform
- **Analytics** — Platform-wide analytics and insights
- **Activity Log** — Track admin actions with timestamps
- **Reset Controls** — Bulk reset all habits across the platform
- **Settings** — Configure platform-level settings

### 🎨 Design
- **Sci-Fi / Futuristic UI** — Glassmorphism, neon accents, particle backgrounds
- **Responsive Design** — Works on desktop, tablet, and mobile
- **Smooth Animations** — Micro-interactions and hover effects throughout

---

## 🏗️ Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | HTML, CSS, Vanilla JavaScript     |
| Backend    | Node.js, Express.js               |
| Database   | MongoDB Atlas (Mongoose ODM)      |
| Auth       | JWT (JSON Web Tokens), bcryptjs   |
| Hosting    | Vercel (Serverless)               |

---

## 📁 Project Structure

```
habit-tracker/
├── .env                    # Environment variables (root level)
├── .gitignore
├── vercel.json             # Vercel deployment config
├── README.md
│
├── backend/
│   ├── server.js           # Express entry point
│   ├── seedAdmin.js        # Admin account seeder
│   ├── package.json
│   ├── config/
│   │   └── db.js           # MongoDB connection (auto-retry)
│   ├── controllers/
│   │   ├── authController.js    # User auth (signup, login, reset)
│   │   ├── habitController.js   # Habit CRUD & analytics
│   │   └── adminController.js   # Admin dashboard & management
│   ├── middleware/
│   │   ├── authMiddleware.js    # JWT verification
│   │   └── adminMiddleware.js   # Admin role guard
│   ├── models/
│   │   ├── User.js         # User schema (bcrypt hashing)
│   │   ├── Habit.js        # Habit schema (streaks, done status)
│   │   ├── Snapshot.js     # Daily habit snapshots
│   │   └── AdminLog.js     # Admin activity logs
│   ├── routes/
│   │   ├── authRoutes.js   # /api/auth/*
│   │   ├── habitRoutes.js  # /api/habits/*
│   │   └── adminRoutes.js  # /api/admin/*
│   ├── services/
│   │   ├── resetService.js      # Daily habit reset logic
│   │   ├── streakService.js     # Streak calculations
│   │   ├── snapshotService.js   # Snapshot management
│   │   └── analyticsService.js  # Analytics computations
│   └── utils/
│       ├── validators.js   # Input validation
│       └── dateUtils.js    # Date helper functions
│
└── frontend/
    ├── landing.html        # Landing page
    ├── login.html          # Unified login/signup (User & Admin)
    ├── forgot-password.html # Password reset page
    ├── futuristic.css      # Main sci-fi theme stylesheet
    ├── sci-fi-theme.css    # Extended theme overrides
    ├── user/
    │   ├── index.html      # User dashboard
    │   ├── script.js       # Dashboard logic
    │   ├── style.css       # User panel styles
    │   └── api.js          # API helper
    └── admin/
        ├── admin.html      # Admin dashboard
        ├── admin.js        # Admin panel logic
        ├── admin.css       # Admin panel styles
        └── api.js          # API helper
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18+)
- **MongoDB Atlas** account (or local MongoDB)
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/RajeshL2005/Habit-Tracker.git
cd Habit-Tracker
```

### 2. Install Dependencies

```bash
cd backend
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the **project root** (not inside backend):

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

### 4. Seed Admin Account (Optional)

```bash
cd backend
node seedAdmin.js
```

### 5. Start the Server

```bash
cd backend
npm run dev
```

The app will be available at:

| Page        | URL                            |
|-------------|--------------------------------|
| Landing     | http://localhost:5000/          |
| Login       | http://localhost:5000/login     |
| User Panel  | http://localhost:5000/user/     |
| Admin Panel | http://localhost:5000/admin/    |
| Health Check| http://localhost:5000/api/health|

---

## 🔌 API Endpoints

### Auth (`/api/auth`)
| Method | Endpoint           | Auth | Description            |
|--------|--------------------|------|------------------------|
| POST   | `/signup`          | ❌   | Register new user      |
| POST   | `/login`           | ❌   | User login             |
| POST   | `/reset-password`  | ❌   | Reset user password    |
| GET    | `/profile`         | ✅   | Get user profile       |

### Habits (`/api/habits`)
| Method | Endpoint                  | Auth | Description              |
|--------|---------------------------|------|--------------------------|
| GET    | `/`                       | ✅   | Get all user habits      |
| POST   | `/`                       | ✅   | Create new habit         |
| DELETE | `/:id`                    | ✅   | Delete a habit           |
| PUT    | `/:id/done`               | ✅   | Mark habit as done       |
| PUT    | `/:id/undo`               | ✅   | Undo habit completion    |
| GET    | `/weekly`                 | ✅   | Weekly analytics data    |
| GET    | `/snapshot/:date`         | ✅   | Snapshot for a date      |
| GET    | `/calendar/:year/:month`  | ✅   | Monthly calendar data    |

### Admin (`/api/admin`)
| Method | Endpoint          | Auth   | Description              |
|--------|-------------------|--------|--------------------------|
| POST   | `/signup`         | ❌     | Create admin account     |
| POST   | `/login`          | ❌     | Admin login              |
| GET    | `/check`          | ❌     | Check if admin exists    |
| GET    | `/dashboard`      | 🛡️ Admin | Dashboard statistics    |
| GET    | `/users`          | 🛡️ Admin | List all users          |
| GET    | `/users/:id`      | 🛡️ Admin | User detail             |
| DELETE | `/users/:id`      | 🛡️ Admin | Delete user             |
| GET    | `/habits`         | 🛡️ Admin | List all habits         |
| DELETE | `/habits/:id`     | 🛡️ Admin | Delete any habit        |
| GET    | `/analytics`      | 🛡️ Admin | Platform analytics      |
| GET    | `/logs`           | 🛡️ Admin | Activity log            |
| DELETE | `/logs`           | 🛡️ Admin | Clear activity log      |
| POST   | `/reset-habits`   | 🛡️ Admin | Reset all habits        |
| PUT    | `/settings`       | 🛡️ Admin | Update settings         |

---

## ☁️ Deployment (Vercel)

This project is configured for **Vercel** deployment with `vercel.json`.

### Steps:

1. **Import** your GitHub repo in [Vercel Dashboard](https://vercel.com)
2. **Add Environment Variables** in Settings → Environment Variables:
   - `MONGO_URI` — Your MongoDB Atlas connection string
   - `JWT_SECRET` — Your JWT secret key
   - `PORT` — `5000`
3. **Deploy** — Vercel auto-deploys on every push to `main`

### MongoDB Atlas Setup:
- Go to **Network Access** → Add `0.0.0.0/0` to allow connections from Vercel's dynamic IPs

---

## 📸 Screenshots

| Landing Page | Login Page |
|:---:|:---:|
| Sci-fi themed landing with particle effects | Unified login for User & Admin roles |

| User Dashboard | Admin Panel |
|:---:|:---:|
| Habit tracking with streaks & analytics | Full platform management & insights |

---

## 🔒 Security

- Passwords hashed with **bcryptjs** (salt rounds: 10)
- JWT tokens with **7-day** expiry
- Admin routes protected with role-based middleware
- Input validation on all endpoints
- `.env` excluded from version control via `.gitignore`

---

## 📄 License

This project is for educational purposes as part of ISM Assignments.

---

## 👤 Author

**Rajesh L**
- GitHub: [@RajeshL2005](https://github.com/RajeshL2005)
