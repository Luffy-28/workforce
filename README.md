# WorkForce Pro — Complete Full-Stack App

Employee Sign-In/Sign-Out & Real-Time Inventory Management  
**Stack:** React + React Router + Redux Toolkit + Bootstrap 5 | Node.js + Express + Socket.IO + MongoDB

---

## 🚀 Getting Started

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env
# ── Edit .env: add your MONGODB_URI and JWT_SECRET ──
npm run dev       # starts on port 5000
```

### 2. Frontend
```bash
cd frontend
npm install
cp .env.example .env
# ── Edit .env if your backend is not on localhost:5000 ──
npm start         # starts on port 3000
```

---

## 🔧 Connection Strings (Replace These)

### `backend/.env`
| Variable | Replace With |
|---|---|
| `MONGODB_URI` | Your MongoDB Atlas URI |
| `JWT_SECRET` | A long random string |
| `CLIENT_URL` | Your frontend URL |

### `frontend/.env`
| Variable | Replace With |
|---|---|
| `REACT_APP_API_URL` | Your backend URL + `/api` |
| `REACT_APP_SOCKET_URL` | Your backend root URL |

---

## 📁 Project Structure

```
workforce-app/
│
├── backend/
│   ├── config/
│   │   └── db.js                  ← MongoDB connection
│   ├── middleware/
│   │   └── auth.js                ← JWT auth + RBAC
│   ├── models/
│   │   ├── User.js
│   │   ├── Attendance.js
│   │   ├── Shift.js
│   │   ├── Task.js
│   │   ├── Inventory.js
│   │   ├── InventoryRequest.js
│   │   ├── InventoryLog.js
│   │   └── Notification.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── attendance.js
│   │   ├── inventory.js           ← incl. requests + auto deduction
│   │   ├── shifts.js
│   │   ├── tasks.js
│   │   ├── notifications.js
│   │   └── reports.js
│   ├── server.js                  ← Express + Socket.IO
│   └── .env.example
│
└── frontend/
    └── src/
        ├── components/
        │   ├── common/
        │   │   ├── Modal.jsx
        │   │   ├── Badge.jsx
        │   │   ├── StatCard.jsx
        │   │   ├── Spinner.jsx
        │   │   └── EmptyState.jsx
        │   └── layout/
        │       ├── AppLayout.jsx  ← Main layout + Socket.IO listener
        │       ├── Sidebar.jsx    ← Navigation with role-based items
        │       └── Topbar.jsx     ← Search + notifications
        ├── pages/
        │   ├── LoginPage.jsx
        │   ├── DashboardPage.jsx
        │   ├── AttendancePage.jsx ← Clock in/out with live timer
        │   ├── InventoryPage.jsx  ← CRUD stock items
        │   ├── RequestsPage.jsx   ← Submit/approve/deliver requests
        │   ├── ShiftsPage.jsx     ← Grid + list view, kanban
        │   ├── TasksPage.jsx      ← Kanban board
        │   ├── UsersPage.jsx      ← Admin user management
        │   ├── NotificationsPage.jsx
        │   └── ReportsPage.jsx    ← Attendance + inventory analytics
        ├── store/
        │   ├── index.js           ← Redux store
        │   └── slices/
        │       ├── authSlice.js
        │       ├── attendanceSlice.js
        │       ├── inventorySlice.js
        │       ├── shiftsSlice.js
        │       ├── tasksSlice.js
        │       ├── usersSlice.js
        │       └── notificationsSlice.js
        ├── services/
        │   └── api.js             ← Axios instance with auto token refresh
        ├── utils/
        │   ├── socket.js          ← Socket.IO client manager
        │   └── helpers.js         ← Formatting utilities
        └── styles/
            └── custom.css         ← Design system (Syne + DM Sans fonts)
```

---

## 🔐 User Roles & Permissions

| Role | Access |
|---|---|
| **Admin** | All pages incl. User Management + delete items |
| **Manager** | All pages except User Management, can approve/deliver requests |
| **Employee** | Attendance, own requests, assigned shifts & tasks |

---

## ⚡ Real-Time Events (Socket.IO)

| Event | Trigger |
|---|---|
| `attendance:update` | Clock in/out |
| `inventory:update` | Stock level changes |
| `inventory:lowStock` | Item drops below threshold |
| `request:new` | New stock request submitted |
| `request:updated` | Request approved/delivered/rejected |
| `shift:new` | New shift created |
| `notification:new` | New notification for user |

---

## 📡 API Reference

| Route | Method | Description |
|---|---|---|
| `/api/auth/login` | POST | Login |
| `/api/auth/refresh-token` | POST | Refresh JWT |
| `/api/auth/logout` | POST | Logout |
| `/api/users` | GET/POST/PUT/DELETE | User CRUD |
| `/api/attendance/clock-in` | POST | Clock in |
| `/api/attendance/clock-out` | POST | Clock out |
| `/api/inventory` | GET/POST/PUT/DELETE | Stock items |
| `/api/inventory/requests` | GET/POST | Stock requests |
| `/api/inventory/requests/:id/approve` | PUT | Approve request |
| `/api/inventory/requests/:id/deliver` | PUT | Deliver + deduct stock |
| `/api/shifts` | GET/POST/PUT/DELETE | Shifts |
| `/api/tasks` | GET/POST/PUT/DELETE | Tasks |
| `/api/notifications` | GET | Notifications |
| `/api/reports/attendance` | GET | Attendance report |
| `/api/reports/inventory` | GET | Inventory report |
