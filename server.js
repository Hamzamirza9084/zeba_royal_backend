const express = require('express');
const colors = require('colors'); // Optional: npm install colors
const dotenv = require('dotenv').config();
const { errorHandler } = require('./middleware/errorMiddleware');
const connectDB = require('./config/db');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const port = process.env.PORT || 5000;

connectDB();

const app = express();

// --- Extra Goodies ---
app.use(helmet()); // Security Headers
app.use(morgan('dev')); // Logging
app.use(cors({
    origin: [
        'https://anvorafinder.netlify.app',
        'https://anvora.in',
        'http://localhost:5173'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: false }));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Health check / root route
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Zeba Royal Backend is running 🚀",
    status: "OK",
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/authRoutes'));
app.use('/api/universities', require('./routes/uniRoutes'));
app.use('/api/applications', require('./routes/applicationRoutes'));
app.use('/api/destinations', require('./routes/destinationRoutes'));
app.use('/api/institutions', require('./routes/institutionRoutes'));

// Error Handler (Must be last)
app.use(errorHandler);

app.listen(port, () => console.log(`Server started on port ${port}`));