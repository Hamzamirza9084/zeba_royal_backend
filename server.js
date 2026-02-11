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
        'https://thriving-kashata-36c146.netlify.app',
        'http://localhost:5173'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: false }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/universities', require('./routes/uniRoutes'));

// Error Handler (Must be last)
app.use(errorHandler);

app.listen(port, () => console.log(`Server started on port ${port}`));