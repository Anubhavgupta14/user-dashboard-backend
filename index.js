const express = require('express');
const dotenv = require("dotenv");
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const carRoutes = require('./routes/carRoutes');
const cors = require("cors");

dotenv.config();
const app = express();
connectDB();

app.use(express.json());
app.use(cors());
app.use('/api/auth', authRoutes);
app.use('/api/cars', carRoutes);

app.get('/api/docs', (req, res) => {
  res.json({ message: 'API documentation will be here' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
