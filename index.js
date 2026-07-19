const express = require('express');
const { setupRoutes, basicAuth } = require('./routes');

const app = express();

app.use(express.json());

app.get('/', basicAuth, (req, res) => {
  res.json({ status: 'ok', session: 'NB6007CEM S2' });
});

setupRoutes(app);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});