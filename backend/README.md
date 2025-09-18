# Voosh News Chatbot - Backend

This is the backend service for the Voosh News Chatbot, a RAG-based chatbot that answers queries about news articles.

## Tech Stack

- Node.js with Express
- MongoDB for persistent storage
- Redis for session caching
- ChromaDB for vector storage
- Google Gemini for LLM
- Socket.io for real-time communication

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env` file with the following variables:
```
PORT=5050
MONGODB_URI=mongodb://localhost:27017/voosh_chatbot
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=your_gemini_api_key_here
```

3. Start MongoDB and Redis:
Make sure you have MongoDB and Redis running locally or update the connection URLs in `.env`.

4. Start the server:
```bash
npm start
```

## API Endpoints

- `POST /api/session` - Create a new chat session
- `GET /api/session/:sessionId` - Get session history
- `POST /api/message` - Send a message and get response
- `DELETE /api/session/:sessionId` - Clear session history

## Caching Strategy

### Redis Caching
- Session history is cached in Redis with a TTL of 1 hour
- Cache is automatically invalidated when:
  - Session is cleared
  - New messages are added
  - TTL expires

### Cache Warming
1. On server startup:
   - Pre-fetch recent articles
   - Generate and store embeddings
   - Initialize vector store

2. Session Management:
   - New sessions start with empty cache
   - Existing sessions load from Redis first
   - Fallback to MongoDB if cache miss
   - Auto-refresh cache on message updates

### TTL Configuration
```javascript
// Default TTL values (in seconds)
const CACHE_TTL = 3600;           // Session cache (1 hour)
const ARTICLE_TTL = 86400;        // Article cache (24 hours)
const EMBEDDING_TTL = 604800;     // Embedding cache (7 days)
```

### Cache Optimization
1. Two-tier caching:
   - Redis for fast access to recent sessions
   - MongoDB for persistent storage
   - Automatic sync between tiers

2. Cache Invalidation:
   - LRU (Least Recently Used) policy
   - Automatic cleanup of expired sessions
   - Manual cleanup option via API

3. Performance Tuning:
   - Compression for large messages
   - Batch operations for multiple updates
   - Asynchronous cache warming

## RAG Pipeline

1. News articles are embedded using local embeddings
2. For each query:
   - Find relevant passages using similarity search
   - Generate response using Gemini API with context

## Socket.io Events

- `connection` - Client connected
- `disconnect` - Client disconnected
- `bot_response` - Send bot response to client

## Performance Considerations

- Redis caching reduces database load
- Vector search is optimized for quick retrieval
- Streaming responses for better UX
- Session management for scalability