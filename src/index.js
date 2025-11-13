const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { chatbotPool, scribePool, evaaConfigPool } = require('./db.js');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Routes

// Endpoint to update a user by ID in live database
app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const {
    FIRST_NAME,
    LAST_NAME,
    EMAIL,
    IS_ACTIVE,
    IS_BLOCKED,
    IS_PROVIDER,
    IS_TECHNICIAN,
    IS_REFERRING_PHYSICIAN,
    USER_INITITALS
  } = req.body;
  
  console.log('🔄 Updating user:', id);
  console.log('📝 Update data:', req.body);
  
  try {
    const [result] = await evaaConfigPool.query(
      `UPDATE users SET
        FIRST_NAME = ?,
        LAST_NAME = ?,
        EMAIL = ?,
        IS_ACTIVE = ?,
        IS_BLOCKED = ?,
        IS_PROVIDER = ?,
        IS_TECHNICIAN = ?,
        IS_REFERRING_PHYSICIAN = ?,
        USER_INITITALS = ?,
        UPDATE_DATE = NOW(),
        UPDATE_BY = ?
      WHERE USER_ID = ?`,
      [
        FIRST_NAME,
        LAST_NAME,
        EMAIL,
        IS_ACTIVE,
        IS_BLOCKED,
        IS_PROVIDER,
        IS_TECHNICIAN,
        IS_REFERRING_PHYSICIAN,
        USER_INITITALS,
        1, // UPDATE_BY
        id
      ]
    );
    
    console.log('✅ User updated successfully:', { id, affectedRows: result.affectedRows });
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});
// Endpoint to save organizations data according to organizations table schema
app.post('/api/organizations', async (req, res) => {  
  const {
    ORGANIZATION_NAME,
    ACCOUNT_ID,
    CHAT_ENABLED,
    CONNECTION_STRING,
    IS_MAXIMEYES_PRACTICE,
    IS_CLOUD_HOSTED,
    IOPF_URL,
    IS_AUTO_TAG_ENABLED,
    ENVIRONMENT,
    MAXIMEYES_URL,
    IS_VA_ENABLED,
    IS_SCRIBE_ENABLED,
    IS_ACTIVE,
    CREATE_BY,
    CREATE_DATE,
    CREATE_PROCESS,
    ADDRESS_LINE_ONE,
    ADDRESS_LINE_TWO,
    TAX_ID
  } = req.body;
    
  try {
    // First, let's check what columns actually exist in the organizations table
    const [columns] = await evaaConfigPool.query("SHOW COLUMNS FROM organizations");
    const availableColumns = columns.map(col => col.Field);   
    
    // Start with minimal data that should definitely work
    const desiredData = {
      ORGANIZATION_NAME,
      ACCOUNT_ID,
      IS_ACTIVE,
      CREATE_BY,
      CREATE_PROCESS,
      ADDRESS_LINE_ONE,
      ADDRESS_LINE_TWO,
      TAX_ID
    };
     
    // Filter to only include columns that exist in the table
    const validColumns = [];
    const validValues = [];
    
    Object.keys(desiredData).forEach(column => {
      console.log(`🔎 Processing column: ${column}, Available: ${availableColumns.includes(column)}`);
      if (availableColumns.includes(column) && column !== 'CREATE_DATE') {        
        validColumns.push(column);
        validValues.push(desiredData[column]);
      } else if (column === 'CREATE_DATE') {
        // Skip CREATE_DATE from desiredData, we'll add it separately with NOW()
        console.log(`📅 Using NOW() for CREATE_DATE column`);
      } else {
        console.log(`⚠️ Skipping column '${column}' - not found in table schema`);
      }
    });
    
    // Add CREATE_DATE with NOW() if the column exists
    if (availableColumns.includes('CREATE_DATE')) {
      validColumns.push('CREATE_DATE');
      // We'll handle this in the query building
    }
    
    // Build the dynamic query with special handling for CREATE_DATE
    const placeholders = validColumns.map(col => col === 'CREATE_DATE' ? 'NOW()' : '?').join(', ');
    const query = `INSERT INTO organizations (${validColumns.join(', ')}) VALUES (${placeholders})`;        
    
    const [result] = await evaaConfigPool.query(query, validValues);    
    
    // Fetch and display the saved data for confirmation
    const [savedData] = await evaaConfigPool.query('SELECT * FROM organizations WHERE ORGANIZATION_ID = ?', [result.insertId]);    
    res.json({ success: true, id: result.insertId, data: savedData[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save organization details', details: error.message });
  }
});

// Endpoint to get all organizations data from organizations table
app.get('/api/organizations', async (req, res) => {
  try {
    const [results] = await evaaConfigPool.query('SELECT * FROM organizations ORDER BY CREATE_DATE DESC'); 
    res.json(results);
  } catch (error) {
    console.error('❌ Error retrieving organizations:', error);
    res.status(500).json({ error: 'Failed to retrieve organizations data', details: error.message });
  }
});

// Endpoint to update an organization by ID
app.put('/api/organizations/:id', async (req, res) => {
  const { id } = req.params;
  const {
    ORGANIZATION_NAME,
    ACCOUNT_ID,
    CHAT_ENABLED,
    CONNECTION_STRING,
    IS_MAXIMEYES_PRACTICE,
    IS_CLOUD_HOSTED,
    IOPF_URL,
    IS_AUTO_TAG_ENABLED,
    ENVIRONMENT,
    MAXIMEYES_URL,
    IS_VA_ENABLED,
    IS_SCRIBE_ENABLED,
    IS_ACTIVE,
    UPDATE_BY,
    UPDATE_PROCESS
  } = req.body;
  
  console.log('📝 Updating organization ID:', id, 'with data:', req.body);
  
  try {
    const [result] = await evaaConfigPool.query(
      `UPDATE organizations SET
        ORGANIZATION_NAME = ?,
        ACCOUNT_ID = ?,
        CHAT_ENABLED = ?,
        CONNECTION_STRING = ?,
        IS_MAXIMEYES_PRACTICE = ?,
        IS_CLOUD_HOSTED = ?,
        IOPF_URL = ?,
        IS_AUTO_TAG_ENABLED = ?,
        ENVIRONMENT = ?,
        MAXIMEYES_URL = ?,
        IS_VA_ENABLED = ?,
        IS_SCRIBE_ENABLED = ?,
        IS_ACTIVE = ?,
        UPDATE_BY = ?,
        UPDATE_DATE = NOW(),
        UPDATE_PROCESS = ?
      WHERE ORGANIZATION_ID = ?`,
      [
        ORGANIZATION_NAME,
        ACCOUNT_ID,
        CHAT_ENABLED,
        CONNECTION_STRING,
        IS_MAXIMEYES_PRACTICE,
        IS_CLOUD_HOSTED,
        IOPF_URL,
        IS_AUTO_TAG_ENABLED,
        ENVIRONMENT,
        MAXIMEYES_URL,
        IS_VA_ENABLED,
        IS_SCRIBE_ENABLED,
        IS_ACTIVE,
        UPDATE_BY || 1, // Changed to integer
        UPDATE_PROCESS || 2, // Changed to integer (2 = organization update process)
        id
      ]
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update organization', details: error.message });
  }
});

// Endpoint to delete an organization by ID
app.delete('/api/organizations/:id', async (req, res) => {
  const { id } = req.params;  
  
  try {
    // Soft delete - just mark as inactive instead of actual delete
    const [result] = await evaaConfigPool.query(
      `UPDATE organizations SET 
        IS_ACTIVE = 0,
        UPDATE_BY = 1,
        UPDATE_DATE = NOW(),
        UPDATE_PROCESS = 3
      WHERE ORGANIZATION_ID = ?`,
      [id]
    );    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete organization', details: error.message });
  }
});

// Endpoint to get single organization by ID
app.get('/api/organizations/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const [results] = await evaaConfigPool.query('SELECT * FROM organizations WHERE ORGANIZATION_ID = ?', [id]);
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    res.json(results[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve organization', details: error.message });
  }
});

// Endpoint to get all providers/vendors from live database
app.get('/api/providers', async (req, res) => {
  try {
    
    const [results] = await evaaConfigPool.query('SELECT * FROM providers');
    
    // Convert Buffer fields to proper numbers
    const processedResults = results.map(provider => ({
      ...provider,
      is_active: provider.is_active ? (Buffer.isBuffer(provider.is_active) ? provider.is_active[0] : provider.is_active) : 0,
      is_enabled: provider.is_enabled ? (Buffer.isBuffer(provider.is_enabled) ? provider.is_enabled[0] : provider.is_enabled) : 0
    }));    
    
    res.json(processedResults);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch providers', details: error.message });
  }
});

// Endpoint to save provider data according to providers table schema
app.post('/api/providers', async (req, res) => {
  
  const {
    first_name,
    last_name,
    middle_name,
    specialty,
    NPI,
    is_enabled,
    is_active,
    create_by,
    create_process,
    suffix,
    credentials,
    email,
    phone
  } = req.body;
  
  try {
    // Check what columns actually exist in the providers table
    const [columns] = await evaaConfigPool.query("SHOW COLUMNS FROM providers");
    const availableColumns = columns.map(col => col.Field);
    
    // Prepare the data for insertion
    const desiredData = {
      first_name,
      last_name,
      middle_name,
      specialty,
      NPI,
      is_enabled: typeof is_enabled === 'string' ? (is_enabled === 'Active' ? 1 : 0) : (is_enabled !== undefined ? is_enabled : 1),
      is_active: typeof is_active === 'string' ? (is_active === 'Active' ? 1 : 0) : (is_active !== undefined ? is_active : 1),
      create_by: create_by || 1,
      create_process: create_process || 1,
      suffix,
      credentials,
      email,
      phone
    };
    
    // Filter to only include columns that exist in the table
    const validColumns = [];
    const validValues = [];
    
    Object.keys(desiredData).forEach(column => {
      if (availableColumns.includes(column) && column !== 'create_date') {
        validColumns.push(column);
        validValues.push(desiredData[column]);
      } else if (column === 'create_date') {
      } else {
      }
    });
    
    // Add create_date with NOW() if the column exists
    if (availableColumns.includes('create_date')) {
      validColumns.push('create_date');
    }
    
    // Build the dynamic query with special handling for create_date
    const placeholders = validColumns.map(col => col === 'create_date' ? 'NOW()' : '?').join(', ');
    const query = `INSERT INTO providers (${validColumns.join(', ')}) VALUES (${placeholders})`;      
    
    const [result] = await evaaConfigPool.query(query, validValues);
    
    // Fetch and display the saved data for confirmation
    const [savedData] = await evaaConfigPool.query('SELECT * FROM providers WHERE provider_id = ?', [result.insertId]);    
    res.json({ success: true, id: result.insertId, data: savedData[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save provider details', details: error.message });
  }
});

// Endpoint to update provider data according to providers table schema
app.put('/api/providers/:id', async (req, res) => {
  const { id } = req.params;  
  
  const {
    first_name,
    last_name,
    middle_name,
    specialty,
    NPI,
    is_enabled,
    is_active,
    update_by,
    update_process,
    suffix,
    credentials,
    email,
    phone
  } = req.body;
  
  try {
    
    // First check what columns actually exist
    const [columns] = await evaaConfigPool.query('SHOW COLUMNS FROM providers');
    const columnNames = columns.map(col => col.Field);
    
    // Build update query with all the fields we want to update
    let updateFields = [];
    let updateValues = [];
    
    // Only include fields that exist in the table
    if (columnNames.includes('first_name')) {
      updateFields.push('first_name = ?');
      updateValues.push(first_name);
    }
    if (columnNames.includes('last_name')) {
      updateFields.push('last_name = ?');
      updateValues.push(last_name);
    }
    if (columnNames.includes('middle_name')) {
      updateFields.push('middle_name = ?');
      updateValues.push(middle_name || '');
    }
    if (columnNames.includes('specialty')) {
      updateFields.push('specialty = ?');
      updateValues.push(specialty || '');
    }
    if (columnNames.includes('NPI')) {
      updateFields.push('NPI = ?');
      updateValues.push(NPI);
    }
    if (columnNames.includes('is_enabled')) {
      updateFields.push('is_enabled = ?');
      updateValues.push(typeof is_enabled === 'string' ? (is_enabled === 'Active' ? 1 : 0) : (is_enabled !== undefined ? is_enabled : 1));
    }
    if (columnNames.includes('is_active')) {
      updateFields.push('is_active = ?');
      updateValues.push(typeof is_active === 'string' ? (is_active === 'Active' ? 1 : 0) : (is_active !== undefined ? is_active : 1));
    }
    if (columnNames.includes('suffix')) {
      updateFields.push('suffix = ?');
      updateValues.push(suffix || '');
    }
    if (columnNames.includes('credentials')) {
      updateFields.push('credentials = ?');
      updateValues.push(credentials || '');
    }
    if (columnNames.includes('email')) {
      updateFields.push('email = ?');
      updateValues.push(email || '');
    }
    if (columnNames.includes('phone')) {
      updateFields.push('phone = ?');
      updateValues.push(phone || '');
    }
    if (columnNames.includes('update_date')) {
      updateFields.push('update_date = NOW()');
    }
    
    const updateQuery = `UPDATE providers SET ${updateFields.join(', ')} WHERE provider_id = ?`;
    updateValues.push(id);    
    
    const [result] = await evaaConfigPool.query(updateQuery, updateValues);
    
    if (result.affectedRows === 0) {
      console.log('⚠️ No rows were affected - provider might not exist');
      return res.status(404).json({ error: 'Provider not found or no changes made' });
    }
    
    // Fetch and return the updated data
    const [updatedData] = await evaaConfigPool.query('SELECT * FROM providers WHERE provider_id = ?', [id]);
    
    if (updatedData.length === 0) {
      return res.status(404).json({ error: 'Provider not found after update' });
    }
    
    // Process the updated data to convert Buffer fields
    const processedData = {
      ...updatedData[0],
      is_active: updatedData[0].is_active ? (Buffer.isBuffer(updatedData[0].is_active) ? updatedData[0].is_active[0] : updatedData[0].is_active) : 0,
      is_enabled: updatedData[0].is_enabled ? (Buffer.isBuffer(updatedData[0].is_enabled) ? updatedData[0].is_enabled[0] : updatedData[0].is_enabled) : 0
    };    
    res.json({ 
      success: true, 
      id: parseInt(id), 
      data: processedData 
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to update provider details', details: error.message });
  }
});

// Test endpoint for simple provider update
app.put('/api/providers/:id/test', async (req, res) => {
  const { id } = req.params;
  const { first_name, last_name } = req.body;
  
  try {
    
    const query = 'UPDATE providers SET first_name = ?, last_name = ? WHERE provider_id = ?';
    const values = [first_name, last_name, id];
    
    const [result] = await evaaConfigPool.query(query, values);
    
    res.json({ success: true, message: 'Test update successful', affectedRows: result.affectedRows });
  } catch (error) {
    res.status(500).json({ error: 'Test update failed', details: error.message });
  }
});

// Endpoint to delete a user by ID
app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  
  console.log('🗑️ Deleting user with ID:', id);
  
  try {
    // First check if user exists
    const [existingUser] = await evaaConfigPool.query(
      'SELECT USER_ID, FIRST_NAME, LAST_NAME, EMAIL FROM users WHERE USER_ID = ?',
      [id]
    );
    
    if (existingUser.length === 0) {
      console.log('❌ User not found:', id);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('👤 Found user to delete:', existingUser[0]);
    
    // Delete the user
    const [result] = await evaaConfigPool.query('DELETE FROM users WHERE USER_ID = ?', [id]);
    
    console.log('✅ User deleted successfully:', { id, affectedRows: result.affectedRows });
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    console.error('SQL Error details:', {
      code: error.code,
      errno: error.errno,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState
    });
    res.status(500).json({ error: 'Failed to delete user', details: error.message });
  }
});
// Endpoint to get all users from live database
app.get('/api/users', async (req, res) => {
  try {
    const [results] = await evaaConfigPool.query('SELECT * FROM users');
    
    console.log(`👥 Fetched ${results.length} users from database`);
    
    // Convert Buffer fields to proper numbers for JSON response
    const processedResults = results.map(user => ({
      ...user,
      IS_ACTIVE: Buffer.isBuffer(user.IS_ACTIVE) ? user.IS_ACTIVE[0] : Number(user.IS_ACTIVE || 0),
      IS_BLOCKED: Buffer.isBuffer(user.IS_BLOCKED) ? user.IS_BLOCKED[0] : Number(user.IS_BLOCKED || 0),
      IS_PROVIDER: Buffer.isBuffer(user.IS_PROVIDER) ? user.IS_PROVIDER[0] : Number(user.IS_PROVIDER || 0),
      IS_TECHNICIAN: Buffer.isBuffer(user.IS_TECHNICIAN) ? user.IS_TECHNICIAN[0] : Number(user.IS_TECHNICIAN || 0),
      IS_REFERRING_PHYSICIAN: Buffer.isBuffer(user.IS_REFERRING_PHYSICIAN) ? user.IS_REFERRING_PHYSICIAN[0] : Number(user.IS_REFERRING_PHYSICIAN || 0)
    }));
    
    processedResults.forEach(user => {
      console.log(`   - ${user.FIRST_NAME} ${user.LAST_NAME}: IS_ACTIVE=${user.IS_ACTIVE}, IS_BLOCKED=${user.IS_BLOCKED}`);
    });
    
    res.json(processedResults);
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

// Endpoint to create a new user in the database
app.post('/api/users', async (req, res) => {
  console.log('📝 Creating new user');
  console.log('📝 Received user data:', req.body);
  
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

  // Split fullName into first and last name for database columns
  const nameParts = (fullName || '').split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Convert status to boolean fields
  const isActive = status === 'Active' ? 1 : 0;
  const isBlocked = status === 'Inactive' ? 1 : 0;

  // Convert role to boolean fields
  const isProvider = role === 'Provider' ? 1 : 0;
  const isTechnician = role === 'Technician' ? 1 : 0;
  const isReferringPhysician = role === 'Referring Physician' ? 1 : 0;

  try {
    // Check if email already exists
    console.log('🔍 Checking if email already exists:', email);
    const [existingUsers] = await evaaConfigPool.query(
      'SELECT USER_ID, EMAIL FROM users WHERE EMAIL = ?',
      [email]
    );
    
    if (existingUsers.length > 0) {
      console.log('❌ Email already exists in database:', email);
      return res.status(400).json({ 
        error: 'Email already exists', 
        message: `A user with email "${email}" already exists. Please use a different email address.` 
      });
    }

    // Generate a temporary password and user initials
    const tempPassword = 'TempPass123!'; // Default temporary password
    const userInitials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

    console.log('🗄️ Mapped database fields for new user:', {
      EMAIL: email,
      LOGIN_PASSWORD: '[TEMP PASSWORD]',
      FIRST_NAME: firstName,
      LAST_NAME: lastName,
      USER_INITITALS: userInitials,
      IS_PROVIDER: isProvider,
      IS_TECHNICIAN: isTechnician,
      IS_REFERRING_PHYSICIAN: isReferringPhysician,
      IS_BLOCKED: isBlocked,
      IS_ACTIVE: isActive,
      CREATE_BY: 1,
      IS_ENABLED: 1,
      IS_PASSWORD_SET: 0
    });

    const [result] = await evaaConfigPool.query(
      `INSERT INTO users (
        EMAIL,
        LOGIN_PASSWORD,
        FIRST_NAME,
        LAST_NAME,
        USER_INITITALS,
        IS_PROVIDER,
        IS_TECHNICIAN,
        IS_REFERRING_PHYSICIAN,
        IS_BLOCKED,
        IS_ACTIVE,
        CREATE_BY,
        CREATE_DATE,
        IS_ENABLED,
        IS_PASSWORD_SET
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
      [
        email,
        tempPassword,
        firstName,
        lastName,
        userInitials,
        isProvider,
        isTechnician,
        isReferringPhysician,
        isBlocked,
        isActive,
        1, // CREATE_BY - default user ID
        1, // IS_ENABLED - default to enabled
        0  // IS_PASSWORD_SET - false since it's a temp password
      ]
    );
    
    console.log('✅ User created successfully:', { id: result.insertId, affectedRows: result.affectedRows });
    
    // Verify the created user
    const [verification] = await evaaConfigPool.query(
      'SELECT USER_ID, FIRST_NAME, LAST_NAME, EMAIL, USER_INITITALS, IS_ACTIVE, IS_BLOCKED, IS_PROVIDER FROM users WHERE USER_ID = ?',
      [result.insertId]
    );
    console.log('🔍 Verification after creation:', verification[0]);
    
    res.json({ success: true, id: result.insertId, user: verification[0] });
  } catch (error) {
    console.error('❌ Error creating user:', error);
    console.error('SQL Error details:', {
      code: error.code,
      errno: error.errno,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState
    });
    
    // Handle specific error cases
    if (error.code === 'ER_DUP_ENTRY' && error.sqlMessage.includes('EMAIL_UNIQUE')) {
      return res.status(400).json({ 
        error: 'Email already exists', 
        message: `A user with this email address already exists. Please use a different email.` 
      });
    }
    
    res.status(500).json({ error: 'Failed to create user', details: error.message });
  }
});

// Endpoint to update an existing location
app.put('/api/locations/:id', async (req, res) => {
  const { id } = req.params;
  
  // Handle both field mapping formats
  const locationData = req.body;
  
  // Map the incoming data to database column names based on actual table structure
  const LOCATION_NAME = locationData.LOCATION_NAME || locationData.name || '';
  const BUSINESS_ID = locationData.BUSINESS_ID || locationData.businessId || 1;
  const IS_DEFAULT = locationData.IS_DEFAULT !== undefined ? locationData.IS_DEFAULT : 0;
  const TIME_ZONE = locationData.TIME_ZONE || locationData.timeZone || 'UTC';
  const IS_ENABLED = locationData.IS_ENABLED !== undefined ? locationData.IS_ENABLED : 1;
  const IS_ACTIVE = locationData.IS_ACTIVE !== undefined ? locationData.IS_ACTIVE : (locationData.status === 'Active' ? 1 : 0);
  const UPDATE_BY = locationData.UPDATE_BY || locationData.updateBy || 1;
  const UPDATE_PROCESS = locationData.UPDATE_PROCESS || locationData.updateProcess || 2; // 2 for update process
  const PHONE_NUMBER = locationData.PHONE_NUMBER || locationData.phone_number || null;
  const ADDRESS = locationData.ADDRESS || locationData.address || null;

  try {
    const [result] = await evaaConfigPool.query(
      `UPDATE locations SET
        LOCATION_NAME = ?,
        BUSINESS_ID = ?,
        IS_DEFAULT = ?,
        TIME_ZONE = ?,
        IS_ENABLED = ?,
        IS_ACTIVE = ?,
        UPDATE_BY = ?,
        UPDATE_DATE = NOW(),
        UPDATE_PROCESS = ?,
        PHONE_NUMBER = ?,
        ADDRESS = ?
      WHERE LOCATION_ID = ?`,
      [
        LOCATION_NAME,
        BUSINESS_ID,
        IS_DEFAULT,
        TIME_ZONE,
        IS_ENABLED,
        IS_ACTIVE,
        UPDATE_BY,
        UPDATE_PROCESS,
        PHONE_NUMBER,
        ADDRESS,
        id
      ]
    );
    
    // Verify the update by checking the current state
    const [verification] = await evaaConfigPool.query(
      'SELECT LOCATION_ID, LOCATION_NAME, IS_ACTIVE, IS_ENABLED FROM locations WHERE LOCATION_ID = ?',
      [id]
    );
    
    res.json({ success: true, affectedRows: result.affectedRows });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to update location',
      details: error.sqlMessage || error.message
    });
  }
});

// Endpoint to delete a location
app.delete('/api/locations/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // First check if location exists
    const [existingLocation] = await evaaConfigPool.query(
      'SELECT LOCATION_ID, LOCATION_NAME, IS_ACTIVE FROM locations WHERE LOCATION_ID = ?',
      [id]
    );
    
    if (existingLocation.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Location not found' 
      });
    }
        
    // Perform soft delete by setting IS_ACTIVE = 0 instead of hard delete
    const updateQuery = `UPDATE locations SET 
        IS_ACTIVE = 0,
        UPDATE_BY = 1,
        UPDATE_DATE = NOW(),
        UPDATE_PROCESS = 3
      WHERE LOCATION_ID = ?`;
    
    const [result] = await evaaConfigPool.query(updateQuery, [id]); 
    
    // Verify the update worked
    const [verifyLocation] = await evaaConfigPool.query(
      'SELECT LOCATION_ID, LOCATION_NAME, IS_ACTIVE FROM locations WHERE LOCATION_ID = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Location not found or already deleted' 
      });
    }
    
    res.json({ 
      success: true, 
      message: `Location "${existingLocation[0].LOCATION_NAME}" deleted successfully`,
      affectedRows: result.affectedRows 
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete location',
      details: error.sqlMessage || error.message
    });
  }
});

// Endpoint to hard delete inactive locations (permanently remove from database)
app.delete('/api/locations/cleanup', async (req, res) => {
  
  try {
    // First, get list of locations that will be deleted for logging
    const [inactiveLocations] = await evaaConfigPool.query(
      'SELECT LOCATION_ID, LOCATION_NAME FROM locations WHERE IS_ACTIVE = 0'
    );    
    
    if (inactiveLocations.length === 0) {
      return res.json({ 
        success: true, 
        message: 'No inactive locations found to delete',
        deletedCount: 0,
        deletedLocations: []
      });
    }
    
    inactiveLocations.forEach(loc => {
    });
    
    // Perform hard delete using primary key to avoid safe mode issues
    // Delete each location individually using LOCATION_ID (primary key)
    let totalDeleted = 0;
    const deletedLocations = [];
    
    for (const location of inactiveLocations) {
      
      const [result] = await evaaConfigPool.query(
        'DELETE FROM locations WHERE LOCATION_ID = ? AND IS_ACTIVE = 0',
        [location.LOCATION_ID]
      );
      
      if (result.affectedRows > 0) {
        totalDeleted += result.affectedRows;
        deletedLocations.push({
          id: location.LOCATION_ID,
          name: location.LOCATION_NAME
        });
      }
    }        
    
    res.json({ 
      success: true, 
      message: `Permanently deleted ${totalDeleted} inactive locations`,
      deletedCount: totalDeleted,
      processedCount: inactiveLocations.length,
      deletedLocations: deletedLocations
    });
    
  } catch (error) {  
    res.status(500).json({ 
      success: false,
      error: 'Failed to perform hard delete',
      details: error.sqlMessage || error.message
    });
  }
});

// Endpoint to call stored procedure for location cleanup
app.post('/api/locations/cleanup-procedure', async (req, res) => {
  const { locationId = null, isActive = 1, deleteType = 'hard' } = req.body;  
  
  try {
    // Call the stored procedure
    const [result] = await evaaConfigPool.query(
      'CALL delete_locations(?, ?, ?)',
      [locationId, isActive, deleteType]
    );    
    
    res.json({ 
      success: true, 
      message: 'Stored procedure executed successfully',
      result: result
    });
    
  } catch (error) {   
    res.status(500).json({ 
      success: false,
      error: 'Failed to execute stored procedure',
      details: error.sqlMessage || error.message
    });
  }
});

app.get('/', (req, res) => {
  res.json({ message: 'Unified Scribe Backend API' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test endpoint to verify organizations endpoint exists
app.get('/api/organizations/test', (req, res) => {
  res.json({ 
    message: 'Organizations endpoint is working!', 
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET /api/organizations',
      'POST /api/organizations', 
      'PUT /api/organizations/:id',
      'DELETE /api/organizations/:id',
      'GET /api/organizations/:id'
    ]
  });
});

// Endpoint to get locations from live database
app.get('/api/locations', async (req, res) => {
  try {
    const [results] = await evaaConfigPool.query(`
      SELECT 
        LOCATION_ID as id,
        BUSINESS_ID,
        LOCATION_NAME as name,
        IS_DEFAULT,
        TIME_ZONE,
        IS_ENABLED,
        IS_ACTIVE,
        CREATE_BY,
        CREATE_DATE,
        UPDATE_BY,
        UPDATE_DATE,
        UPDATE_PROCESS,
        PHONE_NUMBER,
        ADDRESS
      FROM locations 
      ORDER BY CREATE_DATE DESC
    `);    
    
    // Convert Buffer fields to proper numbers for JSON response
    const processedResults = results.map(location => ({
      ...location,
      IS_ACTIVE: Buffer.isBuffer(location.IS_ACTIVE) ? location.IS_ACTIVE[0] : Number(location.IS_ACTIVE),
      IS_ENABLED: Buffer.isBuffer(location.IS_ENABLED) ? location.IS_ENABLED[0] : Number(location.IS_ENABLED)
    }));    
    
    res.json(processedResults);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// Endpoint to add a new location
app.post('/api/locations', async (req, res) => {
  
  // Handle both field mapping formats
  const locationData = req.body;
  
  // Map the incoming data to database column names based on actual table structure
  const LOCATION_NAME = locationData.LOCATION_NAME || locationData.name || '';
  const BUSINESS_ID = locationData.BUSINESS_ID || locationData.businessId || 1; // Default business ID
  const IS_DEFAULT = locationData.IS_DEFAULT !== undefined ? locationData.IS_DEFAULT : 0;
  const TIME_ZONE = locationData.TIME_ZONE || locationData.timeZone || 'UTC';
  const IS_ENABLED = locationData.IS_ENABLED !== undefined ? locationData.IS_ENABLED : 1;
  const IS_ACTIVE = locationData.IS_ACTIVE !== undefined ? locationData.IS_ACTIVE : (locationData.status === 'Active' ? 1 : 0);
  const CREATE_BY = locationData.CREATE_BY || locationData.createBy || 1; // Default user ID
  const UPDATE_PROCESS = locationData.UPDATE_PROCESS || locationData.updateProcess || 1; // Default process ID
  const PHONE_NUMBER = locationData.PHONE_NUMBER || locationData.phone_number || null;
  const ADDRESS = locationData.ADDRESS || locationData.address || null;
  
  try {
    const [result] = await evaaConfigPool.query(
      `INSERT INTO locations (
        LOCATION_NAME, BUSINESS_ID, IS_DEFAULT, TIME_ZONE, IS_ENABLED, IS_ACTIVE,
        CREATE_BY, CREATE_DATE, UPDATE_PROCESS,PHONE_NUMBER, ADDRESS
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)`,
      [
        LOCATION_NAME,
        BUSINESS_ID,
        IS_DEFAULT,
        TIME_ZONE,
        IS_ENABLED,
        IS_ACTIVE,
        CREATE_BY,
        UPDATE_PROCESS,
        PHONE_NUMBER,
        ADDRESS
      ]
    );
    
    
    // Verify the created location
    const [verification] = await evaaConfigPool.query(
      'SELECT LOCATION_ID, LOCATION_NAME, IS_ACTIVE, IS_ENABLED FROM locations WHERE LOCATION_ID = ?',
      [result.insertId]
    );
    
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to add location',
      details: error.sqlMessage || error.message
    });
  }
});

// Endpoint to get all clients from the database
app.get('/api/clients', async (req, res) => {
  try {
    const [results] = await chatbotPool.query('SELECT * FROM client');
    res.json(results);
  } catch (error) {
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

app.get('/api/businesses', async (req, res) => {
  try {
    const [results] = await evaaConfigPool.query('SELECT * FROM businesses');
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch businesses' });
  }
});
// Add new business
app.post('/api/businesses', async (req, res) => {
  try {
    const {
      organization_id,
      business_name,
      is_enabled = 1,
      is_active = 1,
      create_by = null,
      create_process = null,
      update_by = null,
      update_process = null,
      dba_name = null,
      address_line_one = null,
      address_line_two = null,
      phone_number = null,
      extension = null
    } = req.body;

    // Insert into businesses table
    const [result] = await evaaConfigPool.query(
      `INSERT INTO businesses (
        organization_id, business_name, is_enabled, is_active, create_by, create_date, create_process, update_by, update_date, update_process, dba_name, address_line_one, address_line_two, phone_number, extension
      ) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, NOW(), ?, ?, ?, ?, ?, ?)`,
      [
        organization_id,
        business_name,
        is_enabled,
        is_active,
        create_by,
        create_process,
        update_by,
        update_process,
        dba_name,
        address_line_one,
        address_line_two,
        phone_number,
        extension
      ]
    );
    res.status(201).json({ success: true, business_id: result.insertId });
  } catch (error) {
    console.error('Error inserting business:', error);
    res.status(500).json({ error: 'Failed to add business' });
  }
});
// Update business by ID
app.put('/api/businesses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      organization_id,
      business_name,
      is_enabled = 1,
      is_active = 1,
      update_by = null,
      update_process = null,
      dba_name = null,
      address_line_one = null,
      address_line_two = null,
      phone_number = null,
      extension = null
    } = req.body;

    const [result] = await evaaConfigPool.query(
      `UPDATE businesses SET 
        organization_id = ?,
        business_name = ?,
        is_enabled = ?,
        is_active = ?,
        update_by = ?,
        update_date = NOW(),
        update_process = ?,
        dba_name = ?,
        address_line_one = ?,
        address_line_two = ?,
        phone_number = ?,
        extension = ?
      WHERE business_id = ?`,
      [
        organization_id,
        business_name,
        is_enabled,
        is_active,
        update_by,
        update_process,
        dba_name,
        address_line_one,
        address_line_two,
        phone_number,
        extension,
        id
      ]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating business:', error);
    res.status(500).json({ error: 'Failed to update business' });
  }
});
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /api/health`);
  console.log(`   GET  /api/users`);
  console.log(`   PUT  /api/users/:id`);
  console.log(`   GET  /api/locations`);
  console.log(`   POST /api/locations`);
  console.log(`   PUT  /api/locations/:id`);
  console.log(`   DELETE /api/locations/:id`);
  console.log(`   GET  /api/organizations`);
  console.log(`   POST /api/organizations`);
  console.log(`   PUT  /api/organizations/:id`);
  console.log(`   DELETE /api/organizations/:id`);
  console.log(`   GET  /api/providers`);
  console.log(`   POST /api/providers`);
  console.log(`   PUT  /api/providers/:id`);
  console.log(`🌍 Server accessible at: http://localhost:${PORT}`);
});
