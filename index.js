const express = require('express');
const { connectDB } = require('./db');
const { setupRoutes, basicAuth } = require('./routes');

const app = express();

// Middleware to establish database connection lazily on request
app.use(async (req, res, next) => {
  try {
    req.db = await connectDB();
    next();
  } catch (err) {
    console.error('Database connection error:', err);
    res.status(500).json({ error: 'Database connection failed: ' + err.message });
  }
});

app.use(express.json());

app.get('/', basicAuth, (req, res) => {
  res.json({ status: 'ok', session: 'NB6007CEM S2' });
});

// Setup routes synchronously so Vercel can inspect endpoints
setupRoutes(app);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;