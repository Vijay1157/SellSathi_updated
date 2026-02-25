# �️ Sellsathi - E-Commerce Platform Setup Guide

## �📦 Installation & Setup Guide

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
This command installs the dependencies required at the root level (like `concurrently` which helps run multiple servers at once). Ensure you are in the `Sellsathi` folder and run:
```bash
npm install
```

**Step 3. Install Backend Dependencies** 
Navigate into the backend folder and install its specific dependencies.
```bash
cd back
npm install
```

**Step 4. Install Frontend Dependencies** 
Navigate into the frontend folder from the backend folder, and install its packages.
```bash
cd ../front
npm install
```

**Step 5. Configure environment variables** 
Navigate back to the root folder (or do this in your code editor):
```bash
cd ..
```
- Open the `.env.example` file (if available) or create a new `.env` file in the root and appropriate subfolders.
- Add your API keys (Razorpay, Firebase, Nodemailer config) following the examples provided in the Environment Variables section.
- Crucially, place your Firebase Admin `serviceAccountKey.json` inside the `back/` directory so the backend can communicate with your Firestore database.

**Step 6. Start the development servers** 
From the main project root directory (`Sellsathi/`), you can launch both the frontend and backend instantly with one command:
```bash
npm run dev
```

**Step 7. Access the Application** 
Once the terminal shows that both the backend and frontend are running, open your web browser and go to:
- **Frontend** (Main website): `http://localhost:5173`
- **Backend API**: `http://localhost:5000`
- **Dashboard Direct URL**: `http://localhost:5173/dashboard`