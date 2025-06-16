const express = require('express');
const mysql = require('mysql2/promise'); // Import the promise-based version
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;
const cookieParser = require('cookie-parser');

// Allow cross-origin requests from front-end
const cors = require('cors');

const allowedOrigins = [
    'http://localhost:5173',
    'file://',
    'http://etcsc.com'
]; // NOTE: added ETCSC, not sure if needed

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));

app.options('*', cors()); // NOTE: added for testing purposes

app.use(express.json({ limit: '10mb' })); // Increase the limit for upload
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Ensure URL-encoded payloads are handled too

app.use(cookieParser());

// MySQL connection setup
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
});

const SECRET_KEY = process.env.JWT_SECRET;

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    console.log('Incoming request from origin:', req.headers.origin);
    const token = req.cookies.token || req.headers['authorization']?.split(' ')[1]; // Check both cookie and Authorization header

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.userId = decoded.userId; // Store userId from token payload
        next(); // Allow access to the next middleware/route
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

//test
app.get('/api/test', verifyToken, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT username, role FROM users WHERE id = ?', [req.userId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = rows[0];
        res.json({ userId: req.userId, username: user.username, role: user.role }); // Include username in the response
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API endpoint to fetch carrier options
app.get('/api/carriers', verifyToken, async (req, res) => {
    try {
        const [carriers] = await pool.query('SELECT DISTINCT name FROM carriers');
        res.json(carriers.map(row => row.name));
    } catch (error) {
        console.error('Error fetching carriers:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// User login endpoint
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const msToMin = 60 * 1000; // or minutes_in_milliseconds for maxAge

    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }

        const user = rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Generate JWT with 4-hour expiry
        const token = jwt.sign({ userId: user.id }, SECRET_KEY, { expiresIn: '4h' });

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Set to true in production
            sameSite: 'Lax',
            // This property sets the cookie duration in ms
            // maxAge: 4 * 60 * msToMin // 4 hours
            maxAge: 30 * msToMin // 30 minutes
            // maxAge: 15*60*1000 // 15 minutes
        });

        // Include the token in the response body
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// User logout endpoint
app.post('/api/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
    });
    res.json({ message: 'Logged out successfully' });
});

// API endpoint for fetching items
app.get('/api/items', verifyToken, async (req, res) => {
    const filters = req.query;

    // console.log('Received filters:', filters); // Log the received filters

    // Build the SQL query based on filters
    const sqlConditions = [];
    const queryParams = [];

    Object.keys(filters).forEach((key) => {
        if (filters[key]) {
            sqlConditions.push(`${key} LIKE ?`);
            queryParams.push(`%${filters[key]}%`); // Use LIKE for partial matching
        }
    });

    // Handle cases with no filters
    const sqlQuery = sqlConditions.length
        ? `SELECT *,  DATE_FORMAT(date_released, '%Y/%m/%d') AS date_released FROM items WHERE ${sqlConditions.join(' AND ')}`
        : `SELECT *,  DATE_FORMAT(date_released, '%Y/%m/%d') AS date_released FROM items`; // Just select all items if no filters

    //console.log('Generated SQL query:', sqlQuery); // Log the generated SQL query
    //console.log('Query params:', queryParams); // Log the query parameters

    try {
        const [results] = await pool.query(sqlQuery, queryParams);
        res.json(results);
    } catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API endpoint for fetching RMA numbers
app.get('/api/rma-numbers', verifyToken, async (req, res) => {
    try {
        const [rmaNumbers] = await pool.query('SELECT DISTINCT rma_num FROM rma_receiving');
        res.json(rmaNumbers);
    } catch (error) {
        console.error('Error fetching RMA numbers:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

//LOCATION PAGE
// Endpoint to fetch item by serial number
app.get('/api/items-by-serial', verifyToken, async (req, res) => {
    const { serial_num } = req.query;

    if (!serial_num) {
        return res.status(400).json({ error: 'Serial number is required' });
    }
    try {
        const [rows] = await pool.query(
            `SELECT inventory.id, 
            inventory.serial_num, 
            inventory.location_current,
            inventory.location_previous,
            items.model,
            items.description,
            inventory.grade,
            inventory.status,
            inventory.notes,
            DATE_FORMAT(inventory.date_updated, '%Y/%m/%d') as date_updated
             FROM inventory            
             JOIN items on inventory.item_id = items.id
             WHERE serial_num = ?`,
            [serial_num]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }

        res.json(rows[0]); // Return the first matching item
    } catch (error) {
        console.error('Error fetching item by serial number:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Endpoint to update location for selected items
app.post('/api/update-location', verifyToken, async (req, res) => {
    const { serialNumbers, location, user } = req.body;

    if (!serialNumbers || !Array.isArray(serialNumbers) || serialNumbers.length === 0) {
        return res.status(400).json({ error: 'No serial numbers provided' });
    }

    if (!location) {
        return res.status(400).json({ error: 'New location is required' });
    }

    try {
        const placeholders = serialNumbers.map(() => '?').join(', '); // Create placeholders for query

        // First, update previous_location before updating location
        const updatePreviousLocationQuery = `
            UPDATE inventory 
            SET location_previous = location_current 
            WHERE serial_num IN (${placeholders}) AND location_previous <> ?
        `;
        await pool.query(updatePreviousLocationQuery, [...serialNumbers, location]);

        // Now update the location
        const updateLocationQuery = `
            UPDATE inventory 
            SET location_current = ?, date_shelved = CASE WHEN date_shelved IS NULL THEN NOW() ELSE date_shelved END,
            user_last_updated = ?
            WHERE serial_num IN (${placeholders})
        `;

        await pool.query(updateLocationQuery, [location, user, ...serialNumbers]);

        res.status(200).json({ message: 'Locations updated successfully' });
    } catch (error) {
        console.error('Error updating locations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Generate location list with item counts
app.get('/api/locations', verifyToken, async (req, res) => {
    try {
        const [locations] = await pool.query(
            `SELECT 'Unassigned' AS name, '' AS description, COUNT(*) AS itemCount
            FROM inventory
            WHERE location_current IS NULL

            UNION
            
            SELECT l.name AS name, l.description as description, COUNT(i.id) AS itemCount
            FROM locations l
            LEFT JOIN inventory i ON l.name = i.location_current
            GROUP BY l.name

            ORDER BY
                CASE WHEN name='Unassigned' THEN 0 ELSE 1 END, name;`
        );
        res.json(locations);
    } catch (error) {
        console.error('Error fetching locations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get items by location
app.get('/api/items-by-location', verifyToken, async (req, res) => {
    const { location } = req.query;

    try {
        let query;
        let queryParams;
        if (location === 'Unassigned') {
            // Handle items where location is NULL
            query = `
                SELECT inventory.*, items.*,
                    inventory.id AS id,
                    DATE_FORMAT(dock_receiving.date_created, '%Y/%m/%d %H:%i') AS date_created,
                    DATE_FORMAT(inventory.date_shelved, '%Y/%m/%d %H:%i') AS date_shelved,
                    DATE_FORMAT(inventory.date_updated, '%Y/%m/%d %H:%i') AS date_updated,
                    inventory.user_last_updated,
                    DATE_FORMAT(inventory.date_rma_received, '%Y/%m/%d %H:%i') AS date_rma_received
                FROM inventory            
                JOIN items on inventory.item_id = items.id
                INNER JOIN dock_receiving ON inventory.tracking_num = dock_receiving.tracking_num
                WHERE inventory.location_current IS NULL
            `;
            queryParams = [];
        } else {
            // Handle regular location filtering
            query = `
                SELECT inventory.*, items.*,
                    inventory.id AS id,
                    DATE_FORMAT(dock_receiving.date_created, '%Y/%m/%d %H:%i') AS dock_received_at,
                    DATE_FORMAT(inventory.date_shelved, '%Y/%m/%d %H:%i') AS date_shelved,
                    DATE_FORMAT(inventory.date_updated, '%Y/%m/%d %H:%i') AS date_updated,
                    inventory.user_last_updated,
                    DATE_FORMAT(inventory.date_rma_received, '%Y/%m/%d %H:%i') AS date_rma_received
                FROM inventory            
                JOIN items on inventory.item_id = items.id
                INNER JOIN dock_receiving ON inventory.tracking_num = dock_receiving.tracking_num
                WHERE inventory.location_current = ?
            `;
            queryParams = [location];
        }

        const [items] = await pool.query(query, queryParams);
        res.json(items);
    } catch (error) {
        console.error('Error fetching items by location:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API endpoint to add a new location to the locations table
app.post('/api/add-location', verifyToken, async (req, res) => {
    const { name, description } = req.body;

    // Validate required fields
    if (!name) {
        return res.status(400).json({ error: 'Name is required.' });
    }
    try {
        const insertQuery = `
            INSERT INTO locations (name, description)
            VALUES (?, ?)
        `;

        const [result] = await pool.query(insertQuery, [name, description]);

        res.status(201).json({ message: 'Location added successfully', insertId: result.insertId });
    } catch (error) {
        console.error('Error inserting new location:', error);
        res.status(500).json({ error: error.message });
    }
});

// API endpoint to delete a location from the locations table
app.delete('/api/delete-location/:name', verifyToken, async (req, res) => {
    const { name } = req.params;

    // Validate the location ID
    if (!name) {
        return res.status(400).json({ error: 'Location Name is required.' });
    }

    try {
        const deleteQuery = `
            DELETE FROM locations
            WHERE name = ?
        `;
        const [result] = await pool.query(deleteQuery, [name]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Location not found.' });
        }

        res.status(200).json({ message: 'Location deleted successfully' });
    } catch (error) {
        console.error('Error deleting location:', error);
        res.status(500).json({ error: error.message });
    }
});

//RMA RECEIVING
// API endpoint to fetch items based on RMA number
app.get('/api/inventory-items', verifyToken, async (req, res) => {
    const { rma_num, brand } = req.query;

    let sqlQuery = `
        SELECT
            rma_receiving.id,
            rma_receiving.rma_num,
            rma_receiving.rma_type,
            rma_receiving.item_id,
            DATE_FORMAT(rma_receiving.date_created, '%Y/%m/%d %H:%i') AS date_created,
            rma_receiving.import_id,
            rma_receiving.user_id,
            items.model,
            items.part_num,
            items.product_type,
            rma_receiving.quantity_reported,
            rma_receiving.quantity_received
        FROM rma_receiving
        JOIN items ON rma_receiving.item_id = items.id
    `;
    const queryParams = [];
    const conditions = [];

    if (rma_num) {
        conditions.push('rma_receiving.rma_num = ?');
        queryParams.push(rma_num);
    }

    if (brand) {
        conditions.push('items.brand = ?');
        queryParams.push(brand);
    }

    if (conditions.length > 0) {
        sqlQuery += ` WHERE ${conditions.join(' AND ')}`;
    }

    try {
        const [items] = await pool.query(sqlQuery, queryParams);
        res.json(items);
    } catch (error) {
        console.error('Error fetching items by RMA number:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API endpoint to GET all inventory items for the rma-receiving page
app.get('/api/inventory', verifyToken, async (req, res) => {
    const { page = 1, limit = 5, order = 'desc', orderBy = 'date_rma_received', brand } = req.query;

    if (!brand) {
        return res.status(400).json({ error: 'brand is required' });
    }

    const offset = (page - 1) * limit;
    const validColumns = ['id', 'rma_num', 'item_id', 'brand', 'serial_num', 'tracking_num', 'location_current', 'grade', 'status', 'notes', 'user', 'date_rma_received'];
    const sortColumn = validColumns.includes(orderBy) ? orderBy : 'date_rma_received';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    try {
        const [rows] = await pool.query(
            `SELECT 
                inventory.*
                inventory.item_id AS item_id, 
                items.model,
                items.upc,
                items.brand,
                items.product_type,
                DATE_FORMAT(dock_receiving.date_created, '%Y/%m/%d %H:%i') AS dock_received_at,
                DATE_FORMAT(inventory.date_shelved, '%Y/%m/%d %H:%i') AS date_shelved,
                DATE_FORMAT(inventory.date_updated, '%Y/%m/%d %H:%i') AS date_updated,
                inventory.user_last_updated,
                DATE_FORMAT(inventory.date_rma_received, '%Y/%m/%d %H:%i') AS date_rma_received
            FROM inventory
            INNER JOIN items ON inventory.item_id = items.id
            INNER JOIN dock_receiving ON inventory.tracking_num = dock_receiving.tracking_num
            WHERE items.brand = ?
            ORDER BY ${sortColumn === 'serial_num' || sortColumn === 'rma_num'
                ? `CAST(${sortColumn} AS UNSIGNED)`
                : `inventory.${sortColumn}`
            } ${sortOrder}
            LIMIT ? OFFSET ?`,
            [brand, parseInt(limit), parseInt(offset)]
        );

        const [countRows] = await pool.query(
            `SELECT COUNT(*) AS count 
             FROM inventory 
             INNER JOIN items ON inventory.item_id = items.id
             WHERE items.brand = ?`,
            [brand]
        );
        //console.log("Fetching for ", brand)
        const totalCount = countRows[0].count;
        res.json({ rows, totalCount });
    } catch (error) {
        console.error('Error fetching inventory items:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API endpoint to add an item to the inventory table and return full details
//removed brand check
app.post('/api/inventory', verifyToken, async (req, res) => {
    const {
        rma_num, serial_num, tracking_num, item_id, location_current, grade,
        status, progress, lamp_hours, missing_accessories, notes, user_created
    } = req.body;

    if (!rma_num || !serial_num || !tracking_num || !item_id || !grade || !status || !user_created || !progress) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        // Optional: Validate item belongs to brand
        const [itemCheck] = await pool.query(`SELECT id FROM items WHERE id = ?`, [item_id]);
        if (itemCheck.length === 0) {
            return res.status(400).json({ error: 'Item ID does not belong to the specified brand' });
        }

        // Check the RMA type
        const [rmaRows] = await pool.query(`SELECT rma_type FROM rma_receiving WHERE rma_num = ? LIMIT 1`, [rma_num]);
        const rmaType = rmaRows[0]?.rma_type;

        // Get brand from item
        let ownership = null;
        // Potentially check other rma types here?
        if (rmaType === 'Mass Merchant') {
            const [itemRows] = await pool.query(`SELECT brand FROM items WHERE id = ? LIMIT 1`, [item_id]);
            ownership = itemRows[0]?.brand || null;
        }

        // Insert into inventory with ownership
        const insertQuery = `
            INSERT INTO inventory (
                rma_num, serial_num, tracking_num, item_id, location_current, grade,
                status, progress, lamp_hours, missing_accessories, notes, user_created, ownership
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

        const [result] = await pool.query(insertQuery, [
            rma_num, serial_num, tracking_num, item_id, location_current, grade,
            status, progress, lamp_hours, missing_accessories, notes, user_created, ownership
        ]);

        await pool.query(
            `UPDATE rma_receiving 
            SET quantity_received = quantity_received + 1 
            WHERE rma_num = ? AND item_id = ?`,
            [rma_num, item_id]
        );

        const fetchQuery = `
            SELECT inv.*, i.*, 
                DATE_FORMAT(d.date_created, '%Y/%m/%d %H:%i') AS dock_received_at, 
                DATE_FORMAT(inv.date_rma_received, '%Y/%m/%d %H:%i') AS date_rma_received, 
                DATE_FORMAT(i.date_released, '%Y/%m/%d') AS date_released,
                inv.id AS id
            FROM inventory AS inv
            INNER JOIN items AS i ON inv.item_id = i.id
            LEFT JOIN dock_receiving AS d ON inv.tracking_num = d.tracking_num
            WHERE inv.id = ?
        `;

        const [inventoryItem] = await pool.query(fetchQuery, [result.insertId]);

        res.status(201).json({ message: 'Inventory item added successfully', item: inventoryItem[0] });
    } catch (error) {
        console.error('Error inserting inventory item:', error);

        // MySQL foreign key error (tracking number doesn't exist)
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({ error: 'Tracking # not found. Please ensure it was dock received first.' });
        }

        // MySQL duplicate entry error (duplicate serial)
        if (error.code === 'ER_DUP_ENTRY') {
            if (error.message.includes('serial_num')) {
                return res.status(400).json({ error: 'Duplicate Serial # exists. Please check the item history.' });
            }
        }

        // Other SQL or unexpected errors
        res.status(500).json({ error: 'An unexpected server error occurred. Please try again.' });
    }

});

// Update inventory item
app.put('/api/update-inventory/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { rma_num, serial_num, tracking_num, status, grade, lamp_hours, location_current, notes, user, progress, item_id, brand } = req.body;

    if (!item_id || !brand) {
        return res.status(400).json({ error: 'item_id and brand are required' });
    }

    try {
        // Validate brand
        const [itemCheck] = await pool.query(`SELECT id FROM items WHERE id = ? AND brand = ?`, [item_id, brand]);
        if (itemCheck.length === 0) {
            return res.status(400).json({ error: 'Item ID does not belong to the specified brand' });
        }

        const [result] = await pool.query(
            `UPDATE inventory 
            SET rma_num = ?, serial_num = ?, tracking_num = ?, status = ?, progress = ?,
            grade = ?, lamp_hours = ?, location_current = ?, notes = ?, user_last_updated = ?
            WHERE id = ?`,
            [rma_num, serial_num, tracking_num, status, progress, grade, lamp_hours, location_current, notes, user, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }

        res.json({ message: 'Inventory item updated successfully' });
    } catch (error) {
        console.error('Error updating inventory item:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Endpoint for inserting a new dock receiving entry
app.post('/api/dock-receiving', verifyToken, async (req, res) => {
    const { tracking_num, carrier, rma_num, rma_type, quantity, user_created, customer_name } = req.body;

    // Validate required fields (excluding customer details)
    if (!rma_type || !user_created) {
        return res.status(400).json({ error: 'Required fields are missing.' });
    }

    let customer_id = null; // Default to null if no customer info is provided

    try {
        if (customer_name) { // Only process customer if a name is provided
            const [existingCustomer] = await pool.query('SELECT id FROM customers WHERE name = ?', [customer_name]);

            if (existingCustomer.length > 0) {
                customer_id = existingCustomer[0].id; // Use existing customer ID
            }
        }

        // Insert into dock_receiving table, customer_id remains null if no customer info was provided
        const [result] = await pool.query(
            `INSERT INTO dock_receiving (tracking_num, carrier, rma_num, rma_type, quantity, user_created, customer_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [tracking_num, carrier, rma_num, rma_type, quantity, user_created, customer_id]
        );

        res.status(201).json({ message: 'Dock receiving entry added successfully.', insertId: result.insertId });
    } catch (error) {
        console.error('Error inserting dock receiving entry:', error);
        res.status(500).json({ error: error.message });
    }
});

// API endpoint to add a new customer to the customers table
app.post('/api/add-customer', verifyToken, async (req, res) => {
    const { name, address, city, province, postal_code, country, phone, email } = req.body;

    // Validate required fields
    if (!name) {
        return res.status(400).json({ error: 'Customer name is required.' });
    }

    try {
        const insertQuery = `
            INSERT INTO customers (name, address, city, province, postal_code, country, phone, email)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await pool.query(insertQuery, [name, address, city, province, postal_code, country, phone, email]);

        res.status(201).json({ message: 'Customer added successfully', insertId: result.insertId });
    } catch (error) {
        console.error('Error inserting new customer:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to fetch all dock-receiving data
app.get('/api/dock-receiving', verifyToken, async (req, res) => {
    const { page = 1, limit = 5, order = 'desc', orderBy = 'date_created' } = req.query;
    const offset = (page - 1) * limit;
    const validColumns = ['date_created', 'tracking_num', 'carrier', 'rma_num', 'rma_type', 'quantity', 'user'];
    const sortColumn = validColumns.includes(orderBy) ? orderBy : 'date_created'; // Prevent SQL injection
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    try {
        const [rows] = await pool.query(
            `SELECT 
                customers.*,
                customers.id AS customer_id,
                dock_receiving.*, 
                dock_receiving.id AS id,
                DATE_FORMAT(date_created, '%Y/%m/%d %H:%i') AS date_created
             FROM dock_receiving
             LEFT JOIN customers ON customers.id = dock_receiving.customer_id
             ORDER BY ${sortColumn} ${sortOrder} 
             LIMIT ? OFFSET ?`,
            [parseInt(limit), parseInt(offset)]
        );

        const [countRows] = await pool.query('SELECT COUNT(*) AS count FROM dock_receiving');
        const totalCount = countRows[0].count;

        res.json({ rows, totalCount });
    } catch (error) {
        console.error('Error fetching dock receiving entries:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Endpoint to delete a dock receiving entry
app.delete('/api/dock-receiving/:id', verifyToken, async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ error: 'ID is required.' });
    }

    try {
        const [result] = await pool.query('DELETE FROM dock_receiving WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Dock receiving entry not found.' });
        }

        res.status(200).json({ message: 'Dock receiving entry deleted successfully.' });
    } catch (error) {
        console.error('Error deleting dock receiving entry:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// update dock-receiving data from modal
app.put('/api/update-dock-receiving/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { tracking_num, carrier, rma_num, rma_type, quantity,
        name, address, city, province, country, postal_code, phone, email, customer_id } = req.body;

    try {
        // Update dock receiving record
        const [dockResult] = await pool.query(
            `UPDATE dock_receiving 
            SET tracking_num = ?, carrier = ?, rma_num = ?, rma_type = ?, quantity = ? 
            WHERE id = ?`,
            [tracking_num, carrier, rma_num, rma_type, quantity, id]
        );

        if (dockResult.affectedRows === 0) {
            return res.status(404).json({ error: 'Dock receiving record not found' });
        }

        // If customer details exist, update the customer record
        if (customer_id) {
            const [customerResult] = await pool.query(
                `UPDATE customers 
                SET name = ?, address = ?, city = ?, province = ?, country = ?, postal_code = ?, phone = ?, email = ?
                WHERE id = ?`,
                [name, address, city, province, country, postal_code, phone, email, customer_id]
            );

            if (customerResult.affectedRows === 0) {
                return res.status(404).json({ error: 'Customer record not found' });
            }
        }

        res.json({ message: 'Dock receiving record updated successfully' });
    } catch (error) {
        console.error('Error updating dock receiving:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// INVENTORY LOOKUP
app.get('/api/inventory-lookup', verifyToken, async (req, res) => {
    const { page = 1, limit = 25, order = 'asc', orderBy = 'id', shipout, startDate, endDate, groupByModel, ...filters } = req.query;
    const offset = (page - 1) * limit;

    const validColumns = [
        'inv.id', 'inv.rma_num', 'inv.serial_num', 'inv.tracking_num', 'inv.location_current', 'inv.status', 'inv.grade',
        'inv.date_rma_received', 'inv.ownership', 'inv.shipped', 'dock_received_at'
    ];
    const sortColumn = validColumns.includes(`inv.${orderBy}`) ? `inv.${orderBy}` : 'inv.id';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    const sqlConditions = [];
    const queryParams = [];

    if (shipout) {
        sqlConditions.push("inv.status = 'Unowned'");
    }

    if (startDate) {
        sqlConditions.push("DATE(inv.date_rma_received) >= ?");
        queryParams.push(startDate);
    }

    if (endDate) {
        sqlConditions.push("DATE(inv.date_rma_received) <= ?");
        queryParams.push(endDate);
    }

    // for each filter selected in front-end, choose whether to query from inventory, items, or dock-receiving table
    Object.keys(filters).forEach((key) => {
        if (filters[key]) {
            if (key === 'brand' && filters[key] === 'All') return;
            // query inventory table
            if (['id', 'rma_num', 'serial_num', 'tracking_num', 'location_current', 'status', 'grade', 'shipped'].includes(key)) {
                sqlConditions.push(`inv.${key} LIKE ?`);
            }
            // if there's an ownership filter set, add query accordingly
            if (['ownership'].includes(key)) {
                // Check if filtering in or out shipped items
                if (filters[key].startsWith("!")) {
                    sqlConditions.push(`inv.${key} NOT LIKE ?`);
                    filters[key] = filters[key].substring(1); // remove the "!"
                } else {
                    sqlConditions.push(`inv.${key} LIKE ?`);
                }
            }
            // query items table
            else if (['model', 'brand', 'product_type', 'part_num'].includes(key)) {
                sqlConditions.push(`i.${key} LIKE ?`);
            }
            // query dock_receiving table
            else if (['date_created', 'dock_received_at'].includes(key)) {
                sqlConditions.push(`d.${key} LIKE ?`);
            }
            queryParams.push(`%${filters[key]}%`);
        }
    });

    let whereClause = sqlConditions.length ? ` WHERE ${sqlConditions.join(' AND ')}` : '';

    try {
        if (groupByModel === 'true') {
            // group by model
            // First, retrieve all distinct statuses
            const statusQuery = `
                SELECT DISTINCT status 
                FROM inventory
                WHERE status IS NOT NULL
                `;

            const [statusRows] = await pool.query(statusQuery);

            const statusColumns = statusRows.map(row => `COUNT(CASE WHEN inv.status = '${row.status}' THEN 1 END) AS status_${row.status.replace(/[^a-zA-Z0-9]/g, '_')}`);

            const statusColumnsString = statusColumns.join(', '); // This will generate the dynamic COUNT columns for each status

            // Now, build the group query dynamically based on the distinct statuses
            const groupQuery = `
                SELECT 
                    i.model, 
                    i.brand, 
                    i.product_type,
                    COUNT(inv.id) AS quantity,
                    DATE_FORMAT(MAX(inv.date_rma_received), '%Y/%m/%d %H:%i') AS latest_received,
                    ${statusColumnsString} 
                FROM inventory AS inv
                INNER JOIN items AS i ON inv.item_id = i.id
                LEFT JOIN dock_receiving AS d ON inv.tracking_num = d.tracking_num
                ${whereClause}
                GROUP BY i.model, i.brand, i.product_type
                ORDER BY i.model ASC
                LIMIT ? OFFSET ?
                `;

            const fullQueryParams = [...queryParams, parseInt(limit), parseInt(offset)];

            const countGroupQuery = `
                SELECT COUNT(*) AS count FROM (
                    SELECT i.model
                    FROM inventory AS inv
                    INNER JOIN items AS i ON inv.item_id = i.id
                    LEFT JOIN dock_receiving AS d ON inv.tracking_num = d.tracking_num
                    ${whereClause}
                    GROUP BY i.model, i.brand, i.product_type
                ) AS grouped
                `;

            const [groupedRows] = await pool.query(groupQuery, fullQueryParams);
            const [countRows] = await pool.query(countGroupQuery, queryParams);

            return res.json({
                rows: groupedRows,
                totalCount: countRows[0].count,
                inStockCount: null // not relevant in group mode, or could be added with separate logic
            });

        } else {
            // ungrouped results
            const countQuery = `
                SELECT COUNT(inv.id) AS count
                FROM inventory AS inv
                INNER JOIN items AS i ON inv.item_id = i.id
                LEFT JOIN dock_receiving AS d ON inv.tracking_num = d.tracking_num
                ${whereClause}
            `;

            const inStockQuery = `
                SELECT COUNT(inv.id) AS count
                FROM inventory AS inv
                INNER JOIN items AS i ON inv.item_id = i.id
                LEFT JOIN dock_receiving AS d ON inv.tracking_num = d.tracking_num
                ${whereClause ? `${whereClause} AND inv.ownership = 'EdTech'` : `WHERE inv.ownership = 'EdTech'`}
            `;

            const [countRows] = await pool.query(countQuery, queryParams);
            const totalCount = countRows[0].count;

            const [inStockRows] = await pool.query(inStockQuery, queryParams);
            const inStockCount = inStockRows[0].count;

            let sqlQuery = `
                SELECT inv.*, i.*, 
                DATE_FORMAT(d.date_created, '%Y/%m/%d %H:%i') AS dock_received_at, 
                DATE_FORMAT(inv.date_rma_received, '%Y/%m/%d %H:%i') AS date_rma_received, 
                DATE_FORMAT(i.date_released, '%Y/%m/%d') AS date_released,
                DATE_FORMAT(inv.date_updated, '%Y/%m/%d %H:%i') AS date_updated, 
                DATE_FORMAT(inv.date_shelved, '%Y/%m/%d %H:%i') AS date_shelved, 
                DATE_FORMAT(inv.date_shipped, '%Y/%m/%d %H:%i') AS date_shipped,
                i.id AS item_id,
                inv.id AS id
                FROM inventory AS inv
                INNER JOIN items AS i ON inv.item_id = i.id
                LEFT JOIN dock_receiving AS d ON inv.tracking_num = d.tracking_num
                ${whereClause}
                ORDER BY ${sortColumn} ${sortOrder}
                LIMIT ? OFFSET ?
            `;

            const fullQueryParams = [...queryParams, parseInt(limit), parseInt(offset)];
            // send full query to db
            const [rows] = await pool.query(sqlQuery, fullQueryParams);

            res.json({ rows, totalCount, inStockCount });
        }
    } catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ITEM LOOKUP
// Update inventory item
app.put('/api/update-item/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { upc, asin, model, brand, product_type, description, date_released, msrp } = req.body;

    try {
        const [result] = await pool.query(
            `UPDATE items
            SET upc = ?, asin = ?, model = ?, brand = ?,
                product_type = ?, description = ?, date_released = ?, msrp = ? 
            WHERE id = ?`,
            [upc, asin, model, brand, product_type, description, date_released, msrp, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }

        res.json({ message: 'Inventory item updated successfully' });
    } catch (error) {
        console.error('Error updating inventory item:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// IMPORT RMA
app.post('/api/import-rma', verifyToken, async (req, res) => {
    const entries = req.body;

    if (!Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({ error: 'Invalid or empty data' });
    }

    try {
        let addedCount = 0;
        let skippedEntries = [];

        // Get highest ID from import_id column. Will be assigned to all items in current import
        var maxId = await pool.query(`SELECT max(import_id) AS max FROM rma_receiving`);
        maxId = (maxId[0]?.[0]?.max || 0) + 1;

        for (const entry of entries) {
            const { model, part_num, rma_num, rma_type } = entry;

            // Keep only letters, numbers, and dashes
            const fixedPartNo = part_num.replace(/[^a-zA-Z0-9-]/g, '');

            // Find item_id using both model and part_num
            const [itemRows] = await pool.query(
                'SELECT id FROM items WHERE model = ? AND part_num = ? LIMIT 1',
                [model, fixedPartNo]
            );

            if (itemRows.length === 0) {
                console.warn(`Item with model '${model}' and part_num '${fixedPartNo}' not found. Skipping entry.`);
                skippedEntries.push(`Model: ${model}, Part No: ${fixedPartNo} not found.`);
                continue;
            }

            const item_id = itemRows[0].id;

            // Check if rma_num + item_id combination exists
            const [existingEntries] = await pool.query(
                'SELECT id, quantity_reported FROM rma_receiving WHERE rma_num = ? AND item_id = ?',
                [rma_num, item_id]
            );

            if (existingEntries.length > 0) {
                // Entry exists, increment quantity_reported
                await pool.query(
                    'UPDATE rma_receiving SET quantity_reported = quantity_reported + 1 WHERE id = ?',
                    [existingEntries[0].id]
                );
            } else {
                // Insert new entry with quantity_reported = 1
                await pool.query(
                    `INSERT INTO rma_receiving (rma_num, rma_type, item_id, user_id, quantity_reported, import_id) 
                     VALUES (?, ?, ?, ?, 1, ?)`,
                    [rma_num, rma_type, item_id, req.userId, maxId]
                );
            }
            addedCount++;
        }

        if (addedCount === 0) {
            return res.status(400).json({ error: 'No entries were added.', skippedEntries });
        }

        if (skippedEntries.length > 0) {
            return res.status(207).json({
                message: `Some entries were added, but ${skippedEntries.length} were skipped.`,
                skippedEntries
            });
        }

        res.status(201).json({ message: 'All RMA entries added successfully' });

    } catch (error) {
        console.error('Error inserting RMA data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// SHIPOUT
// Save new pick list to db. This is the top left table in the shipout tab
app.post("/api/pick-list", verifyToken, async (req, res) => {
    const { transaction_id, customer_id, user, transaction_type, items, courier, license_plate } = req.body;

    if (!customer_id || !user || !transaction_type || !items || items.length === 0) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        let existingTransaction = null;

        if (transaction_id) {
            const [existingRows] = await pool.query(
                `SELECT id FROM shipout_transactions WHERE id = ?`,
                [transaction_id]
            );
            if (existingRows.length > 0) {
                existingTransaction = existingRows[0];
            }
        }

        let finalTransactionId;

        if (existingTransaction) {
            // Update transaction
            await pool.query(
                `UPDATE shipout_transactions SET customer_id = ?, user = ?, transaction_type = ?, courier = ?, license_plate = ? WHERE id = ?`,
                [customer_id, user, transaction_type, courier, license_plate, transaction_id]
            );

            // Remove old items
            await pool.query(`DELETE FROM shipout_items WHERE transaction_id = ?`, [transaction_id]);

            finalTransactionId = transaction_id;
        } else {
            // Create new transaction
            const [transactionResult] = await pool.query(
                `INSERT INTO shipout_transactions (customer_id, user, transaction_type, status, courier, license_plate)
                 VALUES (?, ?, ?, 'Pending', ?, ?)`,
                [customer_id, user, transaction_type, courier, license_plate]
            );
            finalTransactionId = transactionResult.insertId;
        }

        // Resolve item IDs and values
        const resolvedItems = await Promise.all(
            items.map(async (item) => {
                const [rows] = await pool.query(
                    `SELECT id FROM items WHERE model = ? LIMIT 1`,
                    [item.model]
                );

                if (rows.length === 0) {
                    throw new Error(`Item with model "${item.model}" not found`);
                }

                const item_id = rows[0].id;

                return [
                    finalTransactionId,
                    item_id,
                    item.quantity || 1,
                    item.skid_number || null,
                    item.length || null,
                    item.width || null,
                    item.height || null,
                    item.weight || null
                ];
            })
        );

        await pool.query(
            `INSERT INTO shipout_items 
             (transaction_id, item_id, requested_quantity, skid_number, length, width, height, weight)
             VALUES ?`,
            [resolvedItems]
        );

        res.json({ success: true, transaction_id: finalTransactionId });
    } catch (error) {
        console.error("Error processing transaction:", error);
        res.status(500).json({ error: "Failed to process transaction" });
    }
});

// Fetch existing transactions with customer details
app.get("/api/shipout-transactions", verifyToken, async (req, res) => {
    try {
        // Fetch transactions with customer details
        const [transactionRows] = await pool.query(`
            SELECT st.id, st.customer_id, st.date_created, st.status, st.transaction_type AS transaction_type, 
                   c.name AS customer_name, c.address AS customer_address, c.phone AS customer_phone,
                   c.city AS customer_city, c.country as customer_country, c.province as customer_province, c.postal_code as customer_postal_code,
                   c.email as customer_email
            FROM shipout_transactions st
            LEFT JOIN customers c ON st.customer_id = c.id;
        `);

        res.json(transactionRows);
    } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(500).json({ error: "Failed to fetch transactions" });
    }
});

//get list of pending transactions
app.get("/api/shipout-transactions/pending", verifyToken, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT id, customer_info, transaction_type
            FROM shipout_transactions
            WHERE status = 'Pending'
        `);

        res.json(rows);
    } catch (error) {
        console.error("Error fetching pending transactions:", error);
        res.status(500).json({ error: "Failed to fetch transactions" });
    }
});

// Create a new shipout transaction
app.post("/api/shipout-transactions", verifyToken, async (req, res) => {
    const { customer_id, user, courier, license_plate, status, transaction_type } = req.body;

    if (!customer_id || !user || !status || !transaction_type) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        // insert new record into shipout transactions
        const [result] = await pool.query(`
            INSERT INTO shipout_transactions (customer_id, user, courier, license_plate, status, transaction_type)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [customer_id, user, courier, license_plate, status, transaction_type]
        );

        // return id
        res.json({ id: result.insertId });
        console.log("Updated shipout_transactions")
    } catch (error) {
        console.error("Error creating shipout transaction:", error);
        res.status(500).json({ error: "Failed to create shipout transaction" });
    }
});

//update existing shipout transaction record
app.put("/api/shipout-transactions/:id", verifyToken, async (req, res) => {
    const { id } = req.params;
    const { customer_id, user, courier, license_plate, status, transaction_type } = req.body;

    if (!id || !customer_id || !user || !status || !transaction_type) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        // First, check transaction status
        const [checkRows] = await pool.query(`SELECT status FROM shipout_transactions WHERE id = ?`, [id]);
        if (checkRows.length === 0) {
            return res.status(404).json({ error: "Transaction not found" });
        }
        if (checkRows[0].status === "Shipped") {
            return res.status(400).json({ error: "Cannot modify a completed transaction" });
        }

        const [result] = await pool.query(`
            UPDATE shipout_transactions 
            SET customer_id = ?, user = ?, courier = ?, license_plate = ?, status = ?, transaction_type = ?
            WHERE id = ?`,
            [customer_id, user, courier, license_plate, status, transaction_type, id]
        );

        res.json({ message: "Transaction updated successfully" });
        console.log("Updated shipout_transactions")
    } catch (error) {
        console.error("Error updating transaction:", error);
        res.status(500).json({ error: "Failed to update transaction" });
    }
});

// mark transaction as shipped + scan serials DEPRECATED
app.post("/api/shipout-transactions/shipout", verifyToken, async (req, res) => {
    const { transaction_id, serials } = req.body;

    if (!transaction_id || !serials || serials.length === 0) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {

        for (const serial of serials) {
            await pool.query(`
                UPDATE inventory
                SET status = 'Shipped'
                WHERE serial_num = ?
            `, [serial]);
        }

        await pool.query(`
            UPDATE shipout_transactions
            SET status = 'Shipped'
            WHERE id = ?
        `, [transaction_id]);

        res.json({ success: true });
    } catch (error) {
        console.error("Error shipping out transaction:", error);
        res.status(500).json({ error: "Failed to ship out transaction" });
    }
});

// finalized api route for completing a shipout transaction
app.post("/api/shipout-transactions/complete", verifyToken, async (req, res) => {
    const { transaction_id, items } = req.body;

    if (!transaction_id || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        // Get transaction type
        const [rows] = await pool.query(`
            SELECT transaction_type FROM shipout_transactions WHERE id = ?
        `, [transaction_id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: "Transaction not found" });
        }

        const transactionType = rows[0].transaction_type;

        // for each inventory item marked for ship out
        for (const item of items) {
            const { inventory_id, item_id, serial_num, skid_number, dimensions, weight } = item;

            // Update inventory
            await pool.query(`
                UPDATE inventory
                SET shipped = true, shipout_id = ?, date_shipped = NOW()
                WHERE serial_num = ?
            `, [transaction_id, serial_num]);

        }

        // Mark transaction as shipped
        await pool.query(`
            UPDATE shipout_transactions
            SET status = 'Shipped'
            WHERE id = ?
        `, [transaction_id]);

        res.json({ success: true });
    } catch (error) {
        console.error("Error completing shipout transaction:", error);
        res.status(500).json({ error: "Failed to complete shipout transaction" });
    }
});

// Fetch customers for lookup
app.get("/api/customers", verifyToken, async (req, res) => {
    try {
        const [customerRows] = await pool.query(`
            SELECT id, name, address, city, province, postal_code, country, phone, email
            FROM customers`);
        res.json(customerRows);
    } catch (error) {
        console.error("Error fetching customers:", error);
        res.status(500).json({ error: "Failed to fetch customers" });
    }
});

app.post("/api/shipout-items", verifyToken, async (req, res) => {
    const shipoutItems = req.body;

    if (!Array.isArray(shipoutItems) || shipoutItems.length === 0) {
        return res.status(400).json({ error: "Shipout items are required" });
    }

    try {
        for (const item of shipoutItems) {
            const { transaction_id, inventory_id, skid_number, dimensions, weight } = item;

            if (!transaction_id || !inventory_id) {
                continue; // skip invalid item
            }

            // Fetch transaction type
            const [transactionRows] = await pool.query(`
                SELECT transaction_type FROM shipout_transactions WHERE id = ?`,
                [transaction_id]
            );

            if (transactionRows.length === 0) {
                continue; // transaction doesn't exist
            }

            const transactionType = transactionRows[0].transaction_type;

            if (transactionType === "Skid") {
                // For Skid type transactions
                await pool.query(`
                    INSERT INTO shipout_items (transaction_id, inventory_id, skid_number)
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE skid_number = VALUES(skid_number)`,
                    [transaction_id, inventory_id, skid_number]
                );
            } else {
                // For Single-item or Multiple-item types
                await pool.query(`
                    INSERT INTO shipout_items (transaction_id, inventory_id, package_dimensions, package_weight)
                    VALUES (?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE package_dimensions = VALUES(package_dimensions), package_weight = VALUES(package_weight)`,
                    [transaction_id, inventory_id, dimensions, weight]
                );
            }
        }

        res.json({ message: "Shipout items processed successfully" });
    } catch (error) {
        console.error("Error processing shipout items:", error);
        res.status(500).json({ error: "Failed to process shipout items" });
    }
});

// retrieve pick-list items upon selecting an existing transaction
app.get("/api/shipout-items/:transaction_id", verifyToken, async (req, res) => {
    const { transaction_id } = req.params;

    try {
        const [transactionTypeRows] = await pool.query(`
            SELECT transaction_type FROM shipout_transactions WHERE id = ?`, [transaction_id]);

        if (transactionTypeRows.length === 0) {
            return res.status(404).json({ error: "Transaction not found" });
        }

        const transactionType = transactionTypeRows[0].transaction_type;

        let query;
        if (transactionType === "Skid") {
            query = `
                SELECT si.item_id, si.requested_quantity as quantity, si.skid_number, i.model
                FROM shipout_items si
                LEFT JOIN items i ON si.item_id = i.id
                WHERE si.transaction_id = ?`;
        } else {
            query = `
                SELECT  i.model, si.requested_quantity as quantity, si.item_id, si.length, si.width, si.height, si.weight, inv.serial_num
                LEFT JOIN inventory inv ON si.item_id = inv.id
                LEFT JOIN items i ON si.item_id = i.id
                WHERE si.transaction_id = ?`;
        }

        const [itemRows] = await pool.query(query, [transaction_id]);
        res.json(itemRows);
    } catch (error) {
        console.error("Error fetching shipout items:", error);
        res.status(500).json({ error: "Failed to fetch shipout items" });
    }
});

// search items by model to create pick list
app.get("/api/items/search", verifyToken, async (req, res) => {
    const { model } = req.query;

    if (!model) {
        return res.status(400).json({ error: "Model query parameter is required" });
    }

    try {
        const [rows] = await pool.query(`
            SELECT id, model
            FROM items
            WHERE model LIKE ?
            LIMIT 10
        `, [`%${model}%`]);

        res.json(rows); // <--- return the full array
    } catch (error) {
        console.error("Error searching for items:", error);
        res.status(500).json({ error: "Failed to search for items" });
    }
});

// Upsert for customers
app.put("/api/customers", verifyToken, async (req, res) => {
    const { name, address, city, province, postal_code, country, phone, email } = req.body;

    try {
        // Check if customer already exists
        const [existingCustomerRows] = await pool.query(
            `SELECT id FROM customers WHERE name = ?`, [name]
        );

        let customerId;
        if (existingCustomerRows.length > 0) {
            // If customer exists, update their details
            customerId = existingCustomerRows[0].id;

            await pool.query(`
                UPDATE customers
                SET address = ?, city = ?, province = ?, postal_code = ?, country = ?, phone = ?, email = ?
                WHERE id = ?`,
                [address, city, province, postal_code, country, phone, email, customerId]
            );
        } else {
            // If customer doesn't exist, create a new customer
            const [result] = await pool.query(`
                INSERT INTO customers (name, address, city, province, postal_code, country, phone, email)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [name, address, city, province, postal_code, country, phone, email]
            );
            customerId = result.insertId; // Get the ID of the newly created customer
        }

        // Return the customer ID
        res.json({ id: customerId });
    } catch (error) {
        console.error("Error creating or updating customer:", error);
        res.status(500).json({ error: "Failed to create or update customer" });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});