import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db';
import userRoutes from './routes/userRoutes';

console.log('--- Backend server file loaded and running ---');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// CORS middleware - allow requests from frontend
app.use(cors({
    origin: [
        'http://localhost:5173', 
        'http://localhost:3000', 
        'http://127.0.0.1:5173',
        'https://sui-id.vercel.app',
        'https://sui-id-fe.vercel.app'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware to parse JSON bodies
app.use(express.json());

// Log every incoming request for debugging
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.originalUrl}`);
    next();
});

// --- API Routes ---
app.use('/api/users', userRoutes);

// --- Health Check Route ---
app.get('/', (req, res) => {
    res.send('Identity Backend API is running...');
});

// Global error handler to catch and log all errors
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('[GLOBAL ERROR HANDLER]', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});