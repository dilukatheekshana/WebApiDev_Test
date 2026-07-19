const express = require('express');
const { connectDB } = require('./db');
const { setupRoutes, basicAuth } = require('./routes');

const app = express();

app.use(express.json());

app.get('/', basicAuth, (req, res) => {
  res.json({ status: 'ok', session: 'NB6007CEM S2' });
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    const db = await connectDB();
    setupRoutes(app, db);
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();