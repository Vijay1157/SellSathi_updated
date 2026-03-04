# 🛒 Sellsathi - E-Commerce Platform Setup Guide

## 📦 Installation & Setup Guide

### Prerequisites
Before you start, make sure you have the following installed on your machine:

- Node.js (v16 or higher recommended)
- Git
- npm (comes with Node.js) or yarn
- Firebase project setup
- Razorpay account setup

---

### Step-by-Step Setup

**Step 1. Clone the repository** 
Clone the repository to your local machine and navigate into the main project folder.
```bash
git clone <repository-url>
cd Sellsathi
```

**Step 2. Install Root Dependencies** 
This command installs the dependencies required at the root level (like `concurrently` which helps run multiple servers at once).
```bash
npm install
```

**Step 3. Install Backend Dependencies** 
Navigate into the backend folder and install its specific dependencies.
```bash
cd backend
npm install
```

**Step 4. Install Frontend Dependencies** 
Navigate into the frontend folder and install its packages.
```bash
cd ../frontend
npm install
cd ..
```

**Step 5. Configure environment variables** 
- Put your `.env` file in the `backend/` folder (with Firebase, Razorpay, Cloudinary keys).
- Put your `.env` file in the `frontend/` folder (with `VITE_API_BASE_URL=http://localhost:5000`).
- Crucially, place your Firebase Admin `serviceAccountKey.json` inside the `backend/` directory so the backend can communicate with your Firestore database.

**Step 6. Start the development servers** 
From the main project root directory (`Sellsathi/`), you can launch both the frontend and backend instantly with one command:
```bash
npm run dev
```

**Step 7. Access the Application** 
Once the terminal shows that both the backend and frontend are running, open your web browser and go to:
- **Frontend** (Main website): `http://localhost:5173`
- **Backend API**: `http://localhost:5000`