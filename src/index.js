const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { chatbotPool, scribePool } = require('../db.js');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes

// Endpoint to update a user by ID in live database
app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const {
    fullName,
    role,
    email,
    phone,
    status,
    locations,
    defaultBusiness,
    defaultProduct,
    productAccess,
    permissions
  } = req.body;
  try {
    const [result] = await scribePool.query(
      `UPDATE users SET
        FULL_NAME = ?,
        ROLE = ?,
        EMAIL = ?,
        PHONE = ?,
        STATUS = ?,
        LOCATIONS = ?,
        DEFAULT_BUSINESS = ?,
        DEFAULT_PRODUCT = ?,
        PRODUCT_ACCESS = ?,
        PERMISSIONS = ?
      WHERE ID = ?`,
      [
        fullName,
        role,
        email,
        phone,
        status,
        Array.isArray(locations) ? locations.join(',') : '',
        defaultBusiness,
        defaultProduct,
        productAccess ? JSON.stringify(productAccess) : '{}',
        permissions ? JSON.stringify(permissions) : '{}',
        id
      ]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});
// Endpoint to save organization/business setup details
app.post('/api/organization', async (req, res) => {
  const {
    name,
    address,
    phone,
    email,
    website,
    taxId,
    npi,
    contactPerson,
    contactPhone,
    contactEmail,
    city,
    state,
    zip,
    ext
  } = req.body;
  
  console.log('📝 Received organization data:', req.body);
  
  try {
    // First try to create the table if it doesn't exist
    await scribePool.query(`
      CREATE TABLE IF NOT EXISTS organization (
        ID INT AUTO_INCREMENT PRIMARY KEY,
        NAME VARCHAR(255),
        ADDRESS TEXT,
        PHONE VARCHAR(50),
        EMAIL VARCHAR(255),
        WEBSITE VARCHAR(255),
        TAX_ID VARCHAR(50),
        NPI VARCHAR(50),
        CONTACT_PERSON VARCHAR(255),
        CONTACT_PHONE VARCHAR(50),
        CONTACT_EMAIL VARCHAR(255),
        CITY VARCHAR(100),
        STATE VARCHAR(50),
        ZIP VARCHAR(20),
        EXT VARCHAR(20),
        CREATE_DATE DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    const [result] = await scribePool.query(
      `INSERT INTO organization (
        NAME, ADDRESS, PHONE, EMAIL, WEBSITE, TAX_ID, NPI, 
        CONTACT_PERSON, CONTACT_PHONE, CONTACT_EMAIL, 
        CITY, STATE, ZIP, EXT, CREATE_DATE
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        name, address, phone, email, website, taxId, npi, 
        contactPerson, contactPhone, contactEmail, 
        city, state, zip, ext
      ]
    );
    
    console.log('✅ Organization saved successfully with ID:', result.insertId);
    
    // Fetch and display the saved data for confirmation
    const [savedData] = await scribePool.query('SELECT * FROM organization WHERE ID = ?', [result.insertId]);    
    res.json({ success: true, id: result.insertId, data: savedData[0] });
  } catch (error) {
    console.error('❌ Error saving organization:', error);
    res.status(500).json({ error: 'Failed to save organization details', details: error.message });
  }
});

// Endpoint to create organization table manually
app.post('/api/organization/create-table', async (req, res) => {
  try {
    await scribePool.query(`
      CREATE TABLE IF NOT EXISTS organization (
        ID INT AUTO_INCREMENT PRIMARY KEY,
        NAME VARCHAR(255),
        ADDRESS TEXT,
        PHONE VARCHAR(50),
        EMAIL VARCHAR(255),
        WEBSITE VARCHAR(255),
        TAX_ID VARCHAR(50),
        NPI VARCHAR(50),
        CONTACT_PERSON VARCHAR(255),
        CONTACT_PHONE VARCHAR(50),
        CONTACT_EMAIL VARCHAR(255),
        CITY VARCHAR(100),
        STATE VARCHAR(50),
        ZIP VARCHAR(20),
        EXT VARCHAR(20),
        CREATE_DATE DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Organization table created successfully!');
    res.json({ success: true, message: 'Organization table created successfully!' });
  } catch (error) {
    console.error('❌ Error creating organization table:', error);
    res.status(500).json({ error: 'Failed to create organization table', details: error.message });
  }
});

// Endpoint to get all organization data
app.get('/api/organization', async (req, res) => {
  try {
    const [results] = await scribePool.query('SELECT * FROM organization ORDER BY CREATE_DATE DESC');
    console.log('📊 Retrieved organizations:', results.length, 'records');
    console.log('📋 Organization Data:');
    res.json(results);
  } catch (error) {
    console.error('❌ Error retrieving organizations:', error);
    res.status(500).json({ error: 'Failed to retrieve organization data', details: error.message });
  }
});

// Endpoint to get all providers/vendors from live database
app.get('/api/providers', async (req, res) => {
  try {
    const [results] = await scribePool.query('SELECT * FROM providers');
    res.json(results);
  } catch (error) {
    console.error('Error fetching providers:', error);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});
// Endpoint to delete a user by ID
app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await chatbotPool.query('DELETE FROM users WHERE ID = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});
// Endpoint to get all users from live database
app.get('/api/users', async (req, res) => {
  try {
    const [results] = await chatbotPool.query('SELECT * FROM users');
    res.json(results);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});
// Endpoint to update an existing location
app.put('/api/locations/:id', async (req, res) => {
  const {
    name,
    address,
    status,
    pms,
    pmsSystem,
    facilityId,
    connectionString,
    locationHours,
    customGreeting,
    templatePreferences,
    departmentSpecialty,
    portalUrl,
    portalContact,
    senderName,
    smsPhone
  } = req.body;
  const { id } = req.params;
  try {
    const [result] = await chatbotPool.query(
      `UPDATE location SET
        LOC_NAME = ?,
        ADDRESS = ?,
        IS_ACTIVE = ?,
        PMS = ?,
        PMS_SYSTEM = ?,
        FACILITY_ID = ?,
        CONNECTION_STRING = ?,
        LOCATION_HOURS = ?,
        CUSTOM_GREETING = ?,
        TEMPLATE_PREFERENCES = ?,
        DEPARTMENT_SPECIALTY = ?,
        PORTAL_URL = ?,
        PORTAL_CONTACT = ?,
        SENDER_NAME = ?,
        SMS_PHONE = ?
      WHERE ID = ?`,
      [
        name,
        address,
        status === 'Active' ? 1 : 0,
        pms,
        pmsSystem,
        facilityId,
        connectionString,
        locationHours,
        customGreeting,
        templatePreferences,
        departmentSpecialty,
        portalUrl,
        portalContact,
        senderName,
        smsPhone,
        id
      ]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});
app.get('/', (req, res) => {
  res.json({ message: 'Unified Scribe Backend API' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Endpoint to get locations from live database
app.get('/api/locations', async (req, res) => {
  try {
    const [results] = await chatbotPool.query('SELECT * FROM location WHERE IS_ACTIVE = 1');
    res.json(results);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// Endpoint to add a new location
app.post('/api/locations', async (req, res) => {
  const fields = req.body;
  // Insert into database using all fields from modalFields
  // Example: scribePool.query('INSERT INTO mi_chatbot_config.location SET ?', fields)
  try {
    const [result] = await chatbotPool.query(
      `INSERT INTO location (
        LOC_NAME, ADDRESS, CITY, STATE, ZIP, IS_ACTIVE,
        PMS, PMS_SYSTEM, FACILITY_ID, CONNECTION_STRING,
        LOCATION_HOURS, CUSTOM_GREETING, TEMPLATE_PREFERENCES, DEPARTMENT_SPECIALTY,
        PORTAL_URL, PORTAL_CONTACT, SENDER_NAME, SMS_PHONE, CREATE_DATE
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        name,
        address,
        city,
        state,
        zip,
        status === 'Active' ? 1 : 0,
        pms,
        pmsSystem,
        facilityId,
        connectionString,
        locationHours,
        customGreeting,
        templatePreferences,
        departmentSpecialty,
        portalUrl,
        portalContact,
        senderName,
        smsPhone
      ]
    );
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    console.error('Error adding location:', error);
    res.status(500).json({ error: 'Failed to add location' });
  }
});

// Endpoint to get all clients from the database
app.get('/api/clients', async (req, res) => {
  try {
    const [results] = await chatbotPool.query('SELECT * FROM client');
    res.json(results);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

app.get('/api/products', async (req, res) => {
  const { clientId, internalName, accountId, doj, llm } = req.query;
  try {
    // Call the stored procedure for product list
    const [results] = await scribePool.query(
      'CALL ai_chatbot_config.GET_PRODUCT_CLIENT_LIST(?, ?, ?, ?)',
      [internalName || null, accountId || clientId || null, doj || null, llm || null]
    );
    res.json(results[0] || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});