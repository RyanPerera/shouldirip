// Load Environment Variables
require("dotenv").config();

const express = require('express');
const mysql = require('mysql2/promise'); // Use mysql2 for promise support
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000; // or any port you prefer

// Middleware
app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // Parse JSON bodies

// MySQL connection pool
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10, // Max number of connections
  queueLimit: 0,
});

// Read all entries
app.get('/api/get_values', async (req, res) => {
    console.log('Received request to /api/get_values');
    const query = 'SELECT * FROM test';
    
    try {
        console.log('Executing query:', query);
        const [results] = await db.query(query); // Use await to handle the promise
        console.log('Query results:', results);
        res.json(results);
    } catch (err) {
        console.error('Error executing query:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

// Read all entries
app.get('/api/get_shipping_rates', async (req, res) => {
    console.log('Received request to /api/get_shipping_rates... ');
    const { column } = req.query;

    const allowedColumns = ['first_cost', 'second_cost', 'add more here'];
    if (!allowedColumns.includes(column)) {
        return res.status(400).json({ error: 'Invalid table name' });
    }

    if (!column) return res.status(400).json({ error: 'col is required' });
    const query = `SELECT ${column} FROM shipping_rates`;
    
    try {
        console.log('Executing query:', query);
        const [results] = await db.query(query); // Use await to handle the promise
        console.log('Query results:', results);
        res.json(results);
    } catch (err) {
        console.error('Error executing query:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});