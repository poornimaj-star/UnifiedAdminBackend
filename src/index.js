const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('../db'); // Import the database connection

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Unified Scribe Backend API' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// New endpoint to get client list
app.get('/api/clients', async (req, res) => {
  try {
    // Extract query parameters (all optional)
    const { clientId, accountId, clientName } = req.query;
    
    // Convert clientId to integer if provided, otherwise pass null
    const parsedClientId = clientId ? parseInt(clientId) : null;
    
    // Call the stored procedure with correct syntax
    const [results] = await pool.query(
      'CALL ai_chatbot_config.CB_GET_CHATBOT_CLIENTS(?, ?, ?);',
      [parsedClientId, accountId || null, clientName || null]
    );
    
    // The first element of results contains the actual data
    res.json(results[0]);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});