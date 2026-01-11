# 💼 GigFlow – Mini Freelance Marketplace

**GigFlow** is a full-stack freelance marketplace where **Clients** can post jobs (“Gigs”) and **Freelancers** can bid on them.  
It features secure authentication, real-time notifications, and **atomic database transactions** to ensure hiring integrity.

---

## 🚀 Live Demo

👉 **[Click Here to Visit Live App](https://gigfl.netlify.app)**

**Hosting:**
- **Frontend:** Netlify  
- **Backend:** Render (Free Tier)

> ⚠️ **Note:** The backend server spins down after inactivity.  
> Please allow **50–60 seconds** for the first request to wake it up.

---

## ✨ Key Features & Bonus Challenges

### 🏆 1. Transactional Hiring (MongoDB Transactions)
Hiring a freelancer is handled with **atomic MongoDB transactions** to prevent race conditions.
- Opens a database session
- Marks the selected bid as `hired`
- Marks the gig as `assigned`
- Automatically rejects all other pending bids
- Rolls back the entire operation if any step fails

### 🔔 2. Real-time Notifications (Socket.io)
- Instant toast notification when a freelancer is hired
- No page refresh required
- Secure mapping of User IDs to Socket IDs

### 🧩 3. Core Functionality
- JWT authentication via **HttpOnly Cookies**
- Dynamic roles (Client & Freelancer)
- Gig creation, bidding, hiring, and closing
- Persistent UI state for applied gigs

---

## 🛠️ Tech Stack

### Frontend
- React.js (Vite)
- Tailwind CSS
- Lucide React
- Axios
- Socket.io Client

### Backend
- Node.js & Express.js
- MongoDB Atlas (Mongoose ODM)
- Socket.io
- Bcrypt.js
- Cookie-Parser

---

## ⚙️ Local Installation & Setup

### 1. Clone the Repository
```bash
git clone [https://github.com/](https://github.com/)[YOUR_USERNAME]/gigflow.git
cd gigflow
```

### 2. Backend Setup
```bash
cd server
npm install

# Create a .env file in the /server directory with the following values:
# PORT=5000
# MONGO_URI=your_mongodb_atlas_connection_string
# JWT_SECRET=supersecretrandomstring
# CLIENT_URL=http://localhost:5173

# Start the server
node server.js

# (Optional) Seed the database with demo users
node seed.js
```

### 3. Frontend Setup
```bash
cd client  # or 'gigflow' depending on folder structure
npm install

# Create a .env file in the /client directory with the following values:
# VITE_API_URL=http://localhost:5000/api
# VITE_SOCKET_URL=http://localhost:5000

# Start the React app
npm run dev
```

---

## 📚 API Endpoints

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/register` | Create a new user account | Public |
| **POST** | `/api/auth/login` | Login & receive HttpOnly cookie | Public |
| **POST** | `/api/auth/logout` | Logout user | Private |
| **GET** | `/api/auth/me` | Get current user session | Private |
| **GET** | `/api/gigs` | Fetch all open gigs (`?search` supported) | Public |
| **POST** | `/api/gigs` | Create a new gig | Private |
| **POST** | `/api/bids` | Submit a bid | Private |
| **GET** | `/api/bids/:gigId` | View bids for a gig | Owner Only |
| **GET** | `/api/bids/my-bids` | Get gigs user has applied to | Private |
| **PATCH** | `/api/bids/:id/hire` | Atomic hire & reject others | Owner Only |

---

## 🧪 Demo Credentials
*(Available after running `node seed.js`)*

- **Client:** `alice@example.com` / `123456`
- **Developer:** `bob@example.com` / `123456`
- **Designer:** `charlie@example.com` / `123456`
