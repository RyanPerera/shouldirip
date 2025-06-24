// server.js

// Load Environment Variables
require("dotenv").config();

// Import Necessary Modules
const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

// Initialize Express App
const app = express();
const port = process.env.PORT || 3000; // Use port from .env or default to 3000

// Middleware Setup
// Enable CORS
// TODO: Modify for PROD
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173", // React dev server
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

// Enable JSON body parsing
app.use(express.json());

// Enable URL-encoded body parsing (for form data)
app.use(express.urlencoded({ extended: true }));

// Database Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10, // Max number of connections
  queueLimit: 0,
});

// Test the database connection
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log(
      "Successfully connected to MySQL database! Connection ID:",
      connection.threadId
    );
    connection.release();
  } catch (error) {
    console.error("Failed to connect to the database:", error.message);
  }
})();

// *API Routes

// --- Basic Test Route ---
app.get("/", (req, res) => {
  res.status(200).send("Welcome to the Shipment & Packing Backend API!");
});

// --- Locations Routes ---
app.get("/api/locations", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM locations");
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching locations:", error);
    res
      .status(500)
      .json({ message: "Error retrieving locations", error: error.message });
  }
});

app.get('/api/shipping-rates', verifyToken, async (req, res) => {
    try {
        const [shippingRates] = await pool.query('SELECT DISTINCT rma_num FROM shipping_rates');
        res.json(shippingRates);
    } catch (error) {
        console.error('Error fetching shipping rates:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- User Authentication Routes (Login/Signup) ---
app.post("/api/signup", async (req, res) => {
  const { username, email, password } = req.body;
  // TODO: Implement user registration logic:
  // 1. Validate input
  // 2. Hash password (e.g., using bcrypt)
  // 3. Save user to database
  // 4. Respond with success or error
  res.status(501).json({ message: "Signup endpoint not yet implemented." });
});

// Placeholder for user login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  // TODO: Implement user login logic:
  // 1. Find user by email
  // 2. Compare hashed password
  // 3. Generate and return a token (e.g., JWT) or set a session
  res.status(501).json({ message: "Login endpoint not yet implemented." });
});

// --- Other future routes (Pick Up, Admin, etc.) ---
// app.get('/api/lockers', async (req, res) => { ... });
// app.put('/api/users/:id', async (req, res) => { ... });

// Error Handling Middleware
// This should be the last `app.use()` call, before `app.listen`.
app.use((err, req, res, next) => {
  console.error("An unhandled error occurred:", err.stack);
  res.status(500).json({
    message: "Something went wrong on the server.",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal Server Error",
  });
});

// 8. Start the Server
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log("Environment:", process.env.NODE_ENV || "development");
});
