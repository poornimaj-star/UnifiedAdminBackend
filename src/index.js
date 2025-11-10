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
    const [result] = await evaaConfigPool.query(
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
// Endpoint to save organizations data according to organizations table schema
app.post('/api/organizations', async (req, res) => {
  console.log('🚀 POST /api/organizations endpoint hit!');
  console.log('📝 Request headers:', req.headers);
  console.log('📝 Request body:', req.body);
  
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
    CREATE_PROCESS
  } = req.body;
  
  console.log('📝 Received organizations data:', req.body);
  
  try {
    // First, let's check what columns actually exist in the organizations table
    const [columns] = await evaaConfigPool.query("SHOW COLUMNS FROM organizations");
    const availableColumns = columns.map(col => col.Field);
    console.log('📋 Available columns in organizations table:', availableColumns);
    
    // Start with minimal data that should definitely work
    const desiredData = {
      ORGANIZATION_NAME,
      ACCOUNT_ID,
      IS_ACTIVE,
      CREATE_BY,
      CREATE_PROCESS
    };
    
    console.log('🔍 Desired data keys:', Object.keys(desiredData));
    console.log('🔍 Available columns:', availableColumns);
    
    // Filter to only include columns that exist in the table
    const validColumns = [];
    const validValues = [];
    
    Object.keys(desiredData).forEach(column => {
      console.log(`🔎 Processing column: ${column}, Available: ${availableColumns.includes(column)}`);
      if (availableColumns.includes(column) && column !== 'CREATE_DATE') {
        console.log(`✅ Including column: ${column} with value: ${desiredData[column]}`);
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
    
    console.log('🔧 Dynamic query:', query);
    console.log('📝 Values to insert:', validValues);
    console.log('📋 Final columns:', validColumns);
    console.log('🔢 Column count:', validColumns.length, 'Value count:', validValues.length);
    
    const [result] = await evaaConfigPool.query(query, validValues);
    
    console.log('✅ Organization saved successfully with ID:', result.insertId);
    
    // Fetch and display the saved data for confirmation
    const [savedData] = await evaaConfigPool.query('SELECT * FROM organizations WHERE ORGANIZATION_ID = ?', [result.insertId]);    
    res.json({ success: true, id: result.insertId, data: savedData[0] });
  } catch (error) {
    console.error('❌ Error saving organization:', error);
    res.status(500).json({ error: 'Failed to save organization details', details: error.message });
  }
});

// Endpoint to get all organizations data from organizations table
app.get('/api/organizations', async (req, res) => {
  try {
    const [results] = await evaaConfigPool.query('SELECT * FROM organizations ORDER BY CREATE_DATE DESC');
    console.log('📊 Retrieved organizations:', results.length, 'records');
    console.log('📋 Organizations Data:');
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
    
    console.log('✅ Organization updated successfully');
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error updating organization:', error);
    res.status(500).json({ error: 'Failed to update organization', details: error.message });
  }
});

// Endpoint to delete an organization by ID
app.delete('/api/organizations/:id', async (req, res) => {
  const { id } = req.params;
  
  console.log('🗑️ Deleting organization ID:', id);
  
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
    
    console.log('✅ Organization marked as inactive successfully');
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting organization:', error);
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
    
    console.log('📊 Retrieved organization ID:', id);
    res.json(results[0]);
  } catch (error) {
    console.error('❌ Error retrieving organization:', error);
    res.status(500).json({ error: 'Failed to retrieve organization', details: error.message });
  }
});

// Endpoint to get all providers/vendors from live database
app.get('/api/providers', async (req, res) => {
  try {
    console.log('🔍 Fetching all providers...');
    
    const [results] = await evaaConfigPool.query('SELECT * FROM providers');
    console.log('� Found', results.length, 'providers');
    
    // Convert Buffer fields to proper numbers
    const processedResults = results.map(provider => ({
      ...provider,
      is_active: provider.is_active ? (Buffer.isBuffer(provider.is_active) ? provider.is_active[0] : provider.is_active) : 0,
      is_enabled: provider.is_enabled ? (Buffer.isBuffer(provider.is_enabled) ? provider.is_enabled[0] : provider.is_enabled) : 0
    }));
    
    console.log('📋 Processed first provider:', processedResults[0]);
    
    res.json(processedResults);
  } catch (error) {
    console.error('❌ Error fetching providers:', error);
    res.status(500).json({ error: 'Failed to fetch providers', details: error.message });
  }
});

// Endpoint to save provider data according to providers table schema
app.post('/api/providers', async (req, res) => {
  console.log('🚀 POST /api/providers endpoint hit!');
  console.log('📝 Request body:', req.body);
  
  const {
    first_name,
    last_name,
    middle_name,
    specialty,
    NPI,
    is_enabled,
    is_active,
    create_by,
    create_process
  } = req.body;
  
  console.log('📝 Received provider data:', req.body);
  
  try {
    // Check what columns actually exist in the providers table
    const [columns] = await evaaConfigPool.query("SHOW COLUMNS FROM providers");
    const availableColumns = columns.map(col => col.Field);
    console.log('📋 Available columns in providers table:', availableColumns);
    
    // Prepare the data for insertion
    const desiredData = {
      first_name,
      last_name,
      middle_name,
      specialty,
      NPI,
      is_enabled: is_enabled !== undefined ? is_enabled : 1,
      is_active: is_active !== undefined ? is_active : 1,
      create_by: create_by || 1,
      create_process: create_process || 1
    };
    
    console.log('🔍 Desired data keys:', Object.keys(desiredData));
    console.log('🔍 Available columns:', availableColumns);
    
    // Filter to only include columns that exist in the table
    const validColumns = [];
    const validValues = [];
    
    Object.keys(desiredData).forEach(column => {
      console.log(`🔎 Processing column: ${column}, Available: ${availableColumns.includes(column)}`);
      if (availableColumns.includes(column) && column !== 'create_date') {
        console.log(`✅ Including column: ${column} with value: ${desiredData[column]}`);
        validColumns.push(column);
        validValues.push(desiredData[column]);
      } else if (column === 'create_date') {
        console.log(`📅 Using NOW() for create_date column`);
      } else {
        console.log(`⚠️ Skipping column '${column}' - not found in table schema`);
      }
    });
    
    // Add create_date with NOW() if the column exists
    if (availableColumns.includes('create_date')) {
      validColumns.push('create_date');
    }
    
    // Build the dynamic query with special handling for create_date
    const placeholders = validColumns.map(col => col === 'create_date' ? 'NOW()' : '?').join(', ');
    const query = `INSERT INTO providers (${validColumns.join(', ')}) VALUES (${placeholders})`;
    
    console.log('🔧 Dynamic query:', query);
    console.log('📝 Values to insert:', validValues);
    console.log('📋 Final columns:', validColumns);
    console.log('🔢 Column count:', validColumns.length, 'Value count:', validValues.length);
    
    const [result] = await evaaConfigPool.query(query, validValues);
    
    console.log('✅ Provider saved successfully with ID:', result.insertId);
    
    // Fetch and display the saved data for confirmation
    const [savedData] = await evaaConfigPool.query('SELECT * FROM providers WHERE provider_id = ?', [result.insertId]);    
    res.json({ success: true, id: result.insertId, data: savedData[0] });
  } catch (error) {
    console.error('❌ Error saving provider:', error);
    res.status(500).json({ error: 'Failed to save provider details', details: error.message });
  }
});

// Endpoint to update provider data according to providers table schema
app.put('/api/providers/:id', async (req, res) => {
  console.log('🚀 PUT /api/providers/:id endpoint hit!');
  const { id } = req.params;
  console.log('📝 Updating provider ID:', id);
  console.log('📝 Request body:', req.body);
  

  
  const {
    first_name,
    last_name,
    middle_name,
    specialty,
    NPI,
    is_enabled,
    is_active,
    update_by,
    update_process
  } = req.body;
  
  try {
    console.log('🔍 Starting provider update...');
    
    // First check what columns actually exist
    const [columns] = await evaaConfigPool.query('SHOW COLUMNS FROM providers');
    const columnNames = columns.map(col => col.Field);
    console.log('📋 Available columns:', columnNames);
    
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
      updateValues.push(is_enabled || 1);
    }
    if (columnNames.includes('is_active')) {
      updateFields.push('is_active = ?');
      updateValues.push(is_active || 1);
    }
    if (columnNames.includes('update_date')) {
      updateFields.push('update_date = NOW()');
    }
    
    const updateQuery = `UPDATE providers SET ${updateFields.join(', ')} WHERE provider_id = ?`;
    updateValues.push(id);
    
    console.log('� Update query:', updateQuery);
    console.log('� Update values:', updateValues);
    
    const [result] = await evaaConfigPool.query(updateQuery, updateValues);
    
    console.log('✅ Provider updated successfully, affected rows:', result.affectedRows);
    
    if (result.affectedRows === 0) {
      console.log('⚠️ No rows were affected - provider might not exist');
      return res.status(404).json({ error: 'Provider not found or no changes made' });
    }
    
    // Fetch and return the updated data
    const [updatedData] = await evaaConfigPool.query('SELECT * FROM providers WHERE provider_id = ?', [id]);
    
    if (updatedData.length === 0) {
      console.log('⚠️ Provider not found after update');
      return res.status(404).json({ error: 'Provider not found after update' });
    }
    
    // Process the updated data to convert Buffer fields
    const processedData = {
      ...updatedData[0],
      is_active: updatedData[0].is_active ? (Buffer.isBuffer(updatedData[0].is_active) ? updatedData[0].is_active[0] : updatedData[0].is_active) : 0,
      is_enabled: updatedData[0].is_enabled ? (Buffer.isBuffer(updatedData[0].is_enabled) ? updatedData[0].is_enabled[0] : updatedData[0].is_enabled) : 0
    };
    
    console.log('📊 Processed updated provider data:', processedData);
    res.json({ 
      success: true, 
      id: parseInt(id), 
      data: processedData 
    });
    
  } catch (error) {
    console.error('❌ Error updating provider:', error);
    res.status(500).json({ error: 'Failed to update provider details', details: error.message });
  }
});

// Test endpoint for simple provider update
app.put('/api/providers/:id/test', async (req, res) => {
  const { id } = req.params;
  const { first_name, last_name } = req.body;
  
  try {
    console.log('🧪 Test update for provider ID:', id);
    console.log('🧪 Test update data:', { first_name, last_name });
    
    const query = 'UPDATE providers SET first_name = ?, last_name = ? WHERE provider_id = ?';
    const values = [first_name, last_name, id];
    
    console.log('🧪 Test query:', query);
    console.log('🧪 Test values:', values);
    
    const [result] = await evaaConfigPool.query(query, values);
    
    console.log('🧪 Test result:', result);
    
    res.json({ success: true, message: 'Test update successful', affectedRows: result.affectedRows });
  } catch (error) {
    console.error('🧪 Test update error:', error);
    res.status(500).json({ error: 'Test update failed', details: error.message });
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
  const { id } = req.params;
  console.log('📝 Updating location ID:', id);
  console.log('📝 Received update data:', req.body);
  
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
        UPDATE_PROCESS = ?
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
        id
      ]
    );
    
    console.log('✅ Location updated successfully:', { affectedRows: result.affectedRows });
    res.json({ success: true, affectedRows: result.affectedRows });
  } catch (error) {
    console.error('❌ Error updating location:', error);
    console.error('SQL Error details:', {
      code: error.code,
      errno: error.errno,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState
    });
    res.status(500).json({ 
      error: 'Failed to update location',
      details: error.sqlMessage || error.message
    });
  }
});

// Endpoint to delete a location
app.delete('/api/locations/:id', async (req, res) => {
  const { id } = req.params;
  console.log('🗑️ Deleting location ID:', id, 'Type:', typeof id);
  
  try {
    // First check if location exists
    console.log('🔍 Checking if location exists with ID:', id);
    const [existingLocation] = await evaaConfigPool.query(
      'SELECT LOCATION_ID, LOCATION_NAME, IS_ACTIVE FROM locations WHERE LOCATION_ID = ?',
      [id]
    );
    
    console.log('📋 Found locations:', existingLocation);
    
    if (existingLocation.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Location not found' 
      });
    }
    
    console.log('📍 Found location to delete:', existingLocation[0].LOCATION_NAME, 'Current IS_ACTIVE:', existingLocation[0].IS_ACTIVE);
    
    // Perform soft delete by setting IS_ACTIVE = 0 instead of hard delete
    console.log('🔄 Executing UPDATE query with ID:', id);
    const updateQuery = `UPDATE locations SET 
        IS_ACTIVE = 0,
        UPDATE_BY = 1,
        UPDATE_DATE = NOW(),
        UPDATE_PROCESS = 3
      WHERE LOCATION_ID = ?`;
    console.log('📝 Update Query:', updateQuery);
    console.log('📝 Update Values:', [id]);
    
    const [result] = await evaaConfigPool.query(updateQuery, [id]);
    
    console.log('✅ Location soft deleted successfully:', { 
      affectedRows: result.affectedRows,
      changedRows: result.changedRows,
      info: result.info 
    });
    
    // Verify the update worked
    const [verifyLocation] = await evaaConfigPool.query(
      'SELECT LOCATION_ID, LOCATION_NAME, IS_ACTIVE FROM locations WHERE LOCATION_ID = ?',
      [id]
    );
    console.log('🔍 Verification after update:', verifyLocation);
    
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
    console.error('❌ Error deleting location:', error);
    console.error('SQL Error details:', {
      code: error.code,
      errno: error.errno,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState
    });
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete location',
      details: error.sqlMessage || error.message
    });
  }
});

// Endpoint to hard delete inactive locations (permanently remove from database)
app.delete('/api/locations/cleanup', async (req, res) => {
  console.log('🗑️ Hard deleting all inactive locations (IS_ACTIVE = 0)');
  
  try {
    // First, get list of locations that will be deleted for logging
    const [inactiveLocations] = await evaaConfigPool.query(
      'SELECT LOCATION_ID, LOCATION_NAME FROM locations WHERE IS_ACTIVE = 0'
    );
    
    console.log('📋 Found inactive locations to delete:', inactiveLocations.length);
    inactiveLocations.forEach(loc => {
      console.log(`  - ID: ${loc.LOCATION_ID}, Name: ${loc.LOCATION_NAME}`);
    });
    
    // Perform hard delete - permanently remove records
    const [result] = await evaaConfigPool.query(
      'DELETE FROM locations WHERE IS_ACTIVE = 0'
    );
    
    console.log('✅ Hard delete completed:', { 
      affectedRows: result.affectedRows,
      deletedCount: result.affectedRows 
    });
    
    res.json({ 
      success: true, 
      message: `Permanently deleted ${result.affectedRows} inactive locations`,
      deletedCount: result.affectedRows,
      deletedLocations: inactiveLocations.map(loc => ({
        id: loc.LOCATION_ID,
        name: loc.LOCATION_NAME
      }))
    });
    
  } catch (error) {
    console.error('❌ Error performing hard delete:', error);
    console.error('SQL Error details:', {
      code: error.code,
      errno: error.errno,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState
    });
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
  
  console.log('🗑️ Calling delete_locations stored procedure:', { locationId, isActive, deleteType });
  
  try {
    // Call the stored procedure
    const [result] = await evaaConfigPool.query(
      'CALL delete_locations(?, ?, ?)',
      [locationId, isActive, deleteType]
    );
    
    console.log('✅ Stored procedure completed:', result);
    
    res.json({ 
      success: true, 
      message: 'Stored procedure executed successfully',
      result: result
    });
    
  } catch (error) {
    console.error('❌ Error calling stored procedure:', error);
    console.error('SQL Error details:', {
      code: error.code,
      errno: error.errno,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState
    });
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
        UPDATE_PROCESS
      FROM locations 
      WHERE IS_ACTIVE = 1
      ORDER BY CREATE_DATE DESC
    `);
    
    console.log(`📍 Fetched ${results.length} active locations from database`);
    res.json(results);
  } catch (error) {
    console.error('❌ Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// Endpoint to add a new location
app.post('/api/locations', async (req, res) => {
  console.log('📝 Received location data:', req.body);
  
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
  
  try {
    const [result] = await evaaConfigPool.query(
      `INSERT INTO locations (
        LOCATION_NAME, BUSINESS_ID, IS_DEFAULT, TIME_ZONE, IS_ENABLED, IS_ACTIVE,
        CREATE_BY, CREATE_DATE, UPDATE_PROCESS
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
      [
        LOCATION_NAME,
        BUSINESS_ID,
        IS_DEFAULT,
        TIME_ZONE,
        IS_ENABLED,
        IS_ACTIVE,
        CREATE_BY,
        UPDATE_PROCESS
      ]
    );
    
    console.log('✅ Location created successfully:', { id: result.insertId, affectedRows: result.affectedRows });
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    console.error('❌ Error adding location:', error);
    console.error('SQL Error details:', {
      code: error.code,
      errno: error.errno,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState
    });
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
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /api/health`);
  console.log(`   GET  /api/organizations/test`);
  console.log(`   POST /api/organizations`);
  console.log(`   GET  /api/organizations`);
  console.log(`   PUT  /api/organizations/:id`);
  console.log(`   DELETE /api/organizations/:id`);
  console.log(`   GET  /api/organizations/:id`);
  console.log(`🌍 Server accessible at: https://unifiedadminbackend-tex0.onrender.com`);
});