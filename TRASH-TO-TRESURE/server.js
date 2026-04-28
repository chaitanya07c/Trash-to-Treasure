const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
require("dotenv").config();

// ---------------------------------------------------------------------------
// Firebase Admin SDK
// ---------------------------------------------------------------------------
const admin = require("firebase-admin");

const SERVICE_ACCOUNT_PATH =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "./firebase-service-account.json";

let serviceAccount;
try {
  serviceAccount = require(SERVICE_ACCOUNT_PATH);
} catch (err) {
  console.error(
    `Failed to load service account from ${SERVICE_ACCOUNT_PATH}:`,
    err.message
  );
  console.error(
    "Make sure firebase-service-account.json exists. See .env.example for setup."
  );
  process.exit(1);
}

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket:
      process.env.FIREBASE_STORAGE_BUCKET || "trash-to-treasure-990bc.appspot.com",
  });
  console.log("Firebase Admin SDK initialized successfully");
} catch (error) {
  console.error("Error initializing Firebase Admin SDK:", error);
  process.exit(1);
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

// ---------------------------------------------------------------------------
// Express App
// ---------------------------------------------------------------------------
const app = express();

// CORS — use env var so it works in both dev and production
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    exposedHeaders: ["Content-Type", "Authorization"],
  })
);

// Middleware
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Root route
app.get("/", (req, res) => {
  res.redirect("/home.html");
});

// Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (JPEG, PNG, WebP, GIF) are allowed"));
    }
  },
});

// ---------------------------------------------------------------------------
// Authentication Middleware
// ---------------------------------------------------------------------------
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid authorization header" });
    }

    const token = authHeader.split("Bearer ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Authentication error:", error.message);
    res.status(401).json({
      error: "Invalid token",
      message: "Please make sure you are logged in and try again",
    });
  }
};

// ---------------------------------------------------------------------------
// Input Validation Helpers
// ---------------------------------------------------------------------------
function validateRecyclableInput(body) {
  const errors = [];
  const { type, title, description, quantity, pricePerKg } = body;

  if (!type || typeof type !== "string" || type.trim().length === 0) {
    errors.push("type is required and must be a non-empty string");
  }
  if (!title || typeof title !== "string" || title.trim().length < 2) {
    errors.push("title is required and must be at least 2 characters");
  }
  if (!description || typeof description !== "string") {
    errors.push("description is required");
  }
  if (quantity === undefined || isNaN(parseFloat(quantity)) || parseFloat(quantity) <= 0) {
    errors.push("quantity must be a positive number");
  }
  if (pricePerKg === undefined || isNaN(parseFloat(pricePerKg)) || parseFloat(pricePerKg) < 0) {
    errors.push("pricePerKg must be a non-negative number");
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Helper: Upload file to Firebase Storage (Promise-based)
// ---------------------------------------------------------------------------
function uploadToFirebaseStorage(file, userId) {
  return new Promise((resolve, reject) => {
    const fileName = `${userId}/${Date.now()}-${file.originalname}`;
    const fileUpload = bucket.file(fileName);

    const stream = fileUpload.createWriteStream({
      metadata: { contentType: file.mimetype },
    });

    stream.on("error", (err) => reject(err));

    stream.on("finish", async () => {
      try {
        await fileUpload.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        resolve(publicUrl);
      } catch (err) {
        reject(err);
      }
    });

    stream.end(file.buffer);
  });
}

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// GET /api/recyclables — List all recyclable items
app.get("/api/recyclables", async (req, res) => {
  try {
    const recyclablesSnapshot = await db
      .collection("recyclables")
      .orderBy("createdAt", "desc")
      .get();

    const recyclables = [];
    recyclablesSnapshot.forEach((doc) => {
      recyclables.push({ id: doc.id, ...doc.data() });
    });

    res.json({ data: recyclables, count: recyclables.length });
  } catch (error) {
    console.error("Error fetching recyclables:", error);
    res.status(500).json({ error: "Failed to fetch recyclables" });
  }
});

// POST /api/recyclables — Create a new recyclable listing
app.post(
  "/api/recyclables",
  authenticateUser,
  upload.array("images", 5),
  async (req, res) => {
    try {
      // Validate input
      const validationErrors = validateRecyclableInput(req.body);
      if (validationErrors.length > 0) {
        return res.status(400).json({ error: "Validation failed", details: validationErrors });
      }

      const { type, title, description, quantity, pricePerKg } = req.body;
      const userId = req.user.uid;

      // Upload images to Firebase Storage (with proper await)
      const imageUrls = [];
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const url = await uploadToFirebaseStorage(file, userId);
          imageUrls.push(url);
        }
      }

      const parsedQty = parseFloat(quantity);
      const parsedPrice = parseFloat(pricePerKg);

      const now = admin.firestore.FieldValue.serverTimestamp();
      const recyclableData = {
        type: type.trim(),
        title: title.trim(),
        description: description.trim(),
        quantity: parsedQty,
        pricePerKg: parsedPrice,
        images: imageUrls,
        userId,
        status: "available",
        createdAt: now,
        updatedAt: now,
        totalPrice: parsedQty * parsedPrice,
      };

      const docRef = await db.collection("recyclables").add(recyclableData);
      console.log("Recyclable created:", docRef.id);

      res.status(201).json({
        message: "Recyclable item created successfully",
        id: docRef.id,
        data: recyclableData,
      });
    } catch (error) {
      console.error("Error creating recyclable:", error);
      res.status(500).json({ error: "Failed to create recyclable item" });
    }
  }
);

// GET /api/recyclables/user — List current user's items
app.get("/api/recyclables/user", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const recyclablesSnapshot = await db
      .collection("recyclables")
      .where("userId", "==", userId)
      .get();

    const recyclables = [];
    recyclablesSnapshot.forEach((doc) => {
      recyclables.push({ id: doc.id, ...doc.data() });
    });

    // Sort in memory (avoids composite index requirement)
    recyclables.sort((a, b) => {
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      return dateB - dateA;
    });

    res.json({ data: recyclables, count: recyclables.length });
  } catch (error) {
    console.error("Error fetching user recyclables:", error);
    res.status(500).json({ error: "Failed to fetch user recyclables" });
  }
});

// GET /api/health — Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    firebase: "connected",
  });
});

// ---------------------------------------------------------------------------
// Error Handling
// ---------------------------------------------------------------------------
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File too large. Maximum 5MB per file." });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
