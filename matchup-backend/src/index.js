const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/matches', require('./routes/matches'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'MatchUP backend running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MatchUP backend running on port ${PORT}`);
});