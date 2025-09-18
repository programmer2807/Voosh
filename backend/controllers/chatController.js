const Session = require('../models/Session');
const ragPipeline = require('../utils/ragPipeline');
const Redis = require('redis');
const { v4: uuidv4 } = require('uuid');

const redisClient = Redis.createClient({
  url: process.env.REDIS_URL
});

redisClient.connect();

const CACHE_TTL = 3600; // 1 hour in seconds

let io;

const chatController = {
  setIo: (socketIo) => {
    io = socketIo;
  },

  // Get all sessions
  getSessions: async (req, res) => {
    try {
      // Get sessions from MongoDB
      const sessions = await Session.find()
        .sort({ createdAt: -1 }) // Most recent first
        .limit(10) // Limit to last 10 sessions
        .select('sessionId messages createdAt') // Select only needed fields
        .lean(); // Convert to plain JS object

      // Try to get additional data from Redis cache
      const enrichedSessions = await Promise.all(sessions.map(async (session) => {
        const cachedData = await redisClient.get(`session:${session.sessionId}`);
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          return {
            ...session,
            messages: parsedData
          };
        }
        return session;
      }));

      res.json({ sessions: enrichedSessions });
    } catch (error) {
      console.error('Error fetching sessions:', error);
      res.status(500).json({ error: 'Error fetching sessions' });
    }
  },

  // Create new session
  createSession: async (req, res) => {
    try {
      const sessionId = uuidv4();
      const session = new Session({
        sessionId,
        messages: [],
        createdAt: new Date()
      });
      await session.save();
      res.json({ sessionId });
    } catch (error) {
      res.status(500).json({ error: 'Error creating session' });
    }
  },

  // Get session history
  getSessionHistory: async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      // Try to get from cache first
      const cachedHistory = await redisClient.get(`session:${sessionId}`);
      if (cachedHistory) {
        return res.json({ messages: JSON.parse(cachedHistory) });
      }

      // If not in cache, get from DB
      const session = await Session.findOne({ sessionId });
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Cache the result
      await redisClient.setEx(
        `session:${sessionId}`,
        CACHE_TTL,
        JSON.stringify(session.messages)
      );

      res.json({ messages: session.messages });
    } catch (error) {
      res.status(500).json({ error: 'Error fetching session history' });
    }
  },

  // Process message and get response
  processMessage: async (req, res) => {
    try {
      console.log('Processing message request...');
      const { sessionId, message } = req.body;

      // Get session
      const session = await Session.findOne({ sessionId });
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Add user message
      session.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date()
      });

      // Get response from RAG pipeline
      console.log('Getting response from RAG pipeline...');
      const { relevantArticles, response } = await ragPipeline.queryAndGenerate(message);
      console.log('Got response and articles');

      // Add assistant response
      session.messages.push({
        role: 'assistant',
        content: response,
        articles: relevantArticles,
        timestamp: new Date()
      });

      await session.save();

      // Update cache
      await redisClient.setEx(
        `session:${sessionId}`,
        CACHE_TTL,
        JSON.stringify(session.messages)
      );

      // Emit response through Socket.io
      if (io) {
        console.log('Emitting bot_response event...');
        io.emit('bot_response', { 
          response,
          articles: relevantArticles,
          timestamp: new Date()
        });
      } else {
        console.warn('Socket.io not initialized');
      }

      res.json({ response, articles: relevantArticles });
    } catch (error) {
      console.error('Error processing message:', error);
      res.status(500).json({ error: 'Error processing message' });
    }
  },

  // Clear session
  clearSession: async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      // Clear from DB
      const session = await Session.findOne({ sessionId });
      if (session) {
        session.messages = [];
        await session.save();
      }

      // Clear from cache
      await redisClient.del(`session:${sessionId}`);

      res.json({ message: 'Session cleared successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Error clearing session' });
    }
  }
};

module.exports = chatController;