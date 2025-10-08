import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db';
import userRoutes from './routes/userRoutes';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// CORS middleware - allow requests from frontend
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware to parse JSON bodies
app.use(express.json());

// --- API Routes ---
app.use('/api/users', userRoutes);

// --- Health Check Route ---
app.get('/', (req, res) => {
    res.send('Identity Backend API is running...');
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});