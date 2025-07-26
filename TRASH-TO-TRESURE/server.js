const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
require("dotenv").config();

// Import Firebase Admin SDK
const admin = require("firebase-admin");
const serviceAccount = require("./firebase-service-account.json");

// Initialize Firebase Admin
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "trash-to-treasure-990bc.appspot.com", // Add your Firebase Storage bucket
  });
  console.log("Firebase Admin SDK initialized successfully");
} catch (error) {
  console.error("Error initializing Firebase Admin SDK:", error);
  process.exit(1);
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

const app = express();

// Configure CORS
app.use(
  cors({
    origin: "http://localhost:3000",
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

// Root route handler
app.get("/", (req, res) => {
  res.redirect("/home.html");
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Authentication middleware
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log("Auth header received:", authHeader); // Debug log

    if (!authHeader) {
      console.log("No authorization header found");
      return res.status(401).json({ message: "No authorization header" });
    }

    if (!authHeader.startsWith("Bearer ")) {
      console.log("Invalid authorization format - should be 'Bearer <token>'");
      return res.status(401).json({ message: "Invalid authorization format" });
    }

    const token = authHeader.split("Bearer ")[1];
    console.log("Token extracted:", token.substring(0, 10) + "..."); // Only log first 10 chars for security

    if (!token) {
      console.log("No token found after 'Bearer '");
      return res.status(401).json({ message: "No token provided" });
    }

    console.log("Verifying token...");
    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log("Token verified successfully for user:", decodedToken.uid);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Error authenticating user:", error);
    res.status(401).json({
      message: "Invalid token",
      error: error.message,
      details: "Please make sure you are logged in and try again",
    });
  }
};

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Routes
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
    res.json(recyclables);
  } catch (error) {
    console.error("Error fetching recyclables:", error);
    res
      .status(500)
      .json({ message: "Error fetching recyclables", error: error.message });
  }
});

app.post(
  "/api/recyclables",
  authenticateUser,
  upload.array("images", 5),
  async (req, res) => {
    try {
      console.log("Received request body:", req.body);
      console.log("Received files:", req.files);

      const { type, title, description, quantity, pricePerKg } = req.body;
      const userId = req.user.uid;
      console.log("Processing request for user:", userId);

      // Upload images to Firebase Storage
      const imageUrls = [];
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const fileName = `${userId}/${Date.now()}-${file.originalname}`;
          const fileUpload = bucket.file(fileName);

          const stream = fileUpload.createWriteStream({
            metadata: {
              contentType: file.mimetype,
            },
          });

          stream.on("error", (error) => {
            console.error("Error uploading file:", error);
            throw error;
          });

          stream.on("finish", async () => {
            // Make the file publicly accessible
            await fileUpload.makePublic();
          });

          stream.end(file.buffer);

          // Get the public URL
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
          imageUrls.push(publicUrl);
        }
      }

      const now = admin.firestore.FieldValue.serverTimestamp();
      const recyclableData = {
        type,
        title,
        description,
        quantity: parseFloat(quantity),
        pricePerKg: parseFloat(pricePerKg),
        images: imageUrls, // Store the image URLs
        userId,
        status: "available",
        createdAt: now,
        updatedAt: now,
        addedToCartAt: now,
        totalPrice: parseFloat(quantity) * parseFloat(pricePerKg),
      };

      console.log("Saving recyclable data:", recyclableData);
      const docRef = await db.collection("recyclables").add(recyclableData);
      console.log("Recyclable item created with ID:", docRef.id);

      res.status(201).json({
        message: "Recyclable item created successfully",
        id: docRef.id,
        data: recyclableData,
      });
    } catch (error) {
      console.error("Error creating recyclable:", error);
      res.status(500).json({
        message: "Error creating recyclable item",
        error: error.message,
      });
    }
  }
);

// Add endpoint to get user's listed items
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

    // Sort the results in memory instead of in the query
    recyclables.sort((a, b) => {
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      return dateB - dateA;
    });

    res.json(recyclables);
  } catch (error) {
    console.error("Error fetching user's recyclables:", error);
    res.status(500).json({
      message: "Error fetching user's recyclables",
      error: error.message,
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
