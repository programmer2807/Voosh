const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const Redis = require('redis');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const socketIo = require('socket.io');
const chatRoutes = require('./routes/chatRoutes');
const adminRoutes = require('./routes/adminRoutes');
const ragPipeline = require('./utils/ragPipeline');
const chatController = require('./controllers/chatController');

dotenv.config();

const app = express();
const port = process.env.PORT || 5050;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Redis Client Setup
const redisClient = Redis.createClient({
  url: process.env.REDIS_URL
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.connect();

// Initialize RAG pipeline
(async () => {
  try {
    await ragPipeline.initialize();
    console.log('RAG pipeline initialized successfully');
  } catch (error) {
    console.error('Error initializing RAG pipeline:', error);
  }
})();

// Basic route
app.get('/', (req, res) => {
  res.send('Voosh Chatbot API is running');
});

// Use routes
app.use('/api', chatRoutes);
app.use('/api/admin', adminRoutes);

// Start server
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Socket.io setup
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Pass io instance to chat controller
chatController.setIo(io);

io.on('connection', (socket) => {
  console.log('New client connected');
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

module.exports = app;