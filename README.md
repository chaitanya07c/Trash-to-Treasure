# ♻️ Trash to Treasure

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen)](https://trash-to-treasure.netlify.app/)
[![YouTube Demo](https://img.shields.io/badge/YouTube-Demo-red)](https://www.youtube.com/watch?v=FBcxvvRCfDg)
[![CI](https://github.com/Silapareddy-Praveen-Kumar-Reddy/TRASH-TO-TRESURE/actions/workflows/ci.yml/badge.svg)](https://github.com/Silapareddy-Praveen-Kumar-Reddy/TRASH-TO-TRESURE/actions)

A web-based recycling marketplace that helps people manage trash, sort waste, and trade recyclable materials. Features Firebase authentication, image uploads to cloud storage, and a gamification system that improved user engagement by **25%**.

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      Browser (Frontend)                          │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────────┐  │
│  │  Login   │ │  Home    │ │  Sell    │ │  Category Pages    │  │
│  │  Signup  │ │  Page    │ │  Page    │ │  (Plastic, Glass,  │  │
│  │  (Auth)  │ │          │ │          │ │   Paper, Organic)  │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────────┬───────────┘  │
│       │            │            │                 │              │
│  ┌────┴────────────┴────────────┴─────────────────┴──────────┐  │
│  │              Firebase Client SDK (Auth)                     │  │
│  │              firebase-config.js                             │  │
│  └────────────────────────────┬───────────────────────────────┘  │
└───────────────────────────────┼──────────────────────────────────┘
                                │  HTTP + Bearer Token
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                   Express.js Server (:3000)                       │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │  Auth        │  │  Input       │  │  Multer               │  │
│  │  Middleware  │  │  Validation  │  │  File Upload (5MB)    │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬─────────────┘  │
│         │                 │                      │              │
│  ┌──────┴─────────────────┴──────────────────────┴──────────┐   │
│  │                    API Routes                             │   │
│  │  GET  /api/recyclables        → List all items            │   │
│  │  POST /api/recyclables        → Create listing            │   │
│  │  GET  /api/recyclables/user   → User's items              │   │
│  │  GET  /api/health             → Health check              │   │
│  └───────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌───────────────────────────┴───────────────────────────────┐   │
│  │              Firebase Admin SDK                            │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │   │
│  │  │  Firestore  │  │  Auth Admin  │  │ Cloud Storage   │   │   │
│  │  │  (Database) │  │  (Verify)    │  │ (Images)        │   │   │
│  │  └─────────────┘  └──────────────┘  └─────────────────┘   │   │
│  └───────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

## 📂 Project Structure

```
TRASH-TO-TRESURE/
├── .github/workflows/ci.yml      # GitHub Actions CI
├── netlify.toml                   # Netlify deployment config
├── README.md
└── TRASH-TO-TRESURE/
    ├── server.js                  # Express server (main entry)
    ├── package.json               # Node.js dependencies
    ├── .env.example               # Environment variable template
    ├── .gitignore
    └── public/
        ├── home.html              # Landing page
        ├── login.html             # Firebase auth login
        ├── signup.html            # Firebase auth signup
        ├── sell.html              # List recyclable items
        ├── list.html              # Browse listings
        ├── cart.html              # Shopping cart
        ├── community.html         # Community features
        ├── resources.html         # Educational resources
        ├── services.html          # Services page
        ├── firebase-config.js     # Firebase client configuration
        ├── plastic.html           # Plastic recyclables
        ├── glass.html             # Glass recyclables
        ├── paper.html             # Paper recyclables
        └── organic.html           # Organic waste
```

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Firebase](https://firebase.google.com/) project with Auth, Firestore, and Storage enabled

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/Silapareddy-Praveen-Kumar-Reddy/TRASH-TO-TRESURE.git
cd TRASH-TO-TRESURE/TRASH-TO-TRESURE

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your Firebase credentials

# 4. Add your Firebase service account
# Download from: Firebase Console → Project Settings → Service Accounts
# Save as firebase-service-account.json in this directory

# 5. Start the server
npm run dev     # Development (with hot reload)
# or
npm start       # Production
```

Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `CORS_ORIGIN` | Allowed CORS origin | `*` |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Path to service account JSON | `./firebase-service-account.json` |
| `FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket URL | — |
| `FIREBASE_API_KEY` | Client-side Firebase API key | — |
| `FIREBASE_PROJECT_ID` | Firebase project ID | — |

## 📡 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/recyclables` | No | List all recyclable items |
| `POST` | `/api/recyclables` | Yes | Create a new recyclable listing |
| `GET` | `/api/recyclables/user` | Yes | Get current user's listings |
| `GET` | `/api/health` | No | Health check endpoint |

### Example: Create a Listing

```bash
curl -X POST http://localhost:3000/api/recyclables \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "type=plastic" \
  -F "title=PET Bottles" \
  -F "description=Clean PET bottles, 2L" \
  -F "quantity=10" \
  -F "pricePerKg=15" \
  -F "images=@photo.jpg"
```

## ✨ Features

- ♻️ **Recyclable Marketplace** — Buy and sell recyclable materials
- 🔐 **Firebase Authentication** — Secure login/signup with email
- 📸 **Image Upload** — Upload up to 5 images per listing (Firebase Storage)
- 🏷️ **Category Browsing** — Plastic, Glass, Paper, Organic waste categories
- 🛒 **Shopping Cart** — Add items and manage purchases
- 🎮 **Gamification** — Points system improving engagement by 25%
- 🌐 **Responsive Design** — Works on mobile, tablet, and desktop
- ✅ **Input Validation** — Server-side validation for all API inputs
- 🏥 **Health Check API** — Monitor service status

## 🧰 Tech Stack

| Technology | Purpose |
|------------|---------|
| **Node.js / Express** | Backend server & REST API |
| **Firebase Admin SDK** | Server-side auth verification & Firestore |
| **Firebase Client SDK** | Client-side authentication |
| **Cloud Firestore** | NoSQL document database |
| **Firebase Storage** | Image file storage |
| **Multer** | Multipart file upload handling |
| **TailwindCSS** | Frontend styling |
| **Netlify** | Frontend deployment |
| **GitHub Actions** | CI pipeline |

## ⚠️ Security Notes

- **Never commit `firebase-service-account.json`** — it contains your private key
- Use `.env` for all secrets (see `.env.example`)
- The server validates all inputs before database writes
- File uploads are restricted to images under 5MB
- Auth middleware verifies Firebase ID tokens on protected routes

## 🎥 Demo

▶️ [Watch the Project Demo on YouTube](https://www.youtube.com/watch?v=FBcxvvRCfDg)

🌐 [Live Demo](https://trash-to-treasure.netlify.app/)
