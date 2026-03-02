const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8001';

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'backend', mlServiceUrl });
});

app.listen(port, () => {
  console.log(`Backend API running on http://localhost:${port}`);
});

