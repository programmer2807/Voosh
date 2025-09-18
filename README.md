# 🤖 Voosh News Chatbot

A sophisticated chatbot leveraging Retrieval-Augmented Generation (RAG) to provide intelligent responses about news articles. The system combines real-time news ingestion, vector-based semantic search, and state-of-the-art language models to deliver accurate, context-aware responses.

## 🌟 Live Demo
- Frontend: [Live Demo Link]
- Video Demo: [Demo Video Link]

## 🎯 Features

### Chat Interface
- Real-time message streaming with typing animations
- Session management with history
- Source attribution for responses
- Relevant article suggestions
- Intuitive UI with Tailwind CSS

### RAG Pipeline
- Automated news article ingestion
- Semantic embeddings using MiniLM
- Vector similarity search with Qdrant
- Context-aware responses using Gemini AI

### Performance
- Redis caching for sessions
- MongoDB for persistent storage
- Real-time updates via WebSocket
- Optimized vector search

## 🛠️ Tech Stack

### Frontend
- React 19.1 with Vite
- Tailwind CSS
- Socket.io-client
- Axios
- @heroicons/react

### Backend
- Node.js with Express
- Socket.io
- MongoDB
- Redis
- Qdrant
- Google Gemini AI
- MiniLM embeddings

## 🚀 Local Setup

### Prerequisites
1. Node.js (v18+ recommended)
2. MongoDB (v7.0+)
3. Redis (v7.0+)
4. Docker for Qdrant
5. Git

### Installation Steps

1. **Clone the Repository**
```bash
git clone https://github.com/[your-username]/voosh-chatbot.git
cd voosh-chatbot
```

2. **Backend Setup**
```bash
# Install dependencies
cd backend
npm install

# Create .env file
PORT=5050
MONGODB_URI=mongodb://localhost:27017/voosh_chatbot
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=your_gemini_api_key_here
QDRANT_URL=http://localhost:6333
```

3. **Frontend Setup**
```bash
cd ../frontend
npm install
```

4. **Start Required Services**
```bash
# Start MongoDB
mongod

# Start Redis
redis-server

# Start Qdrant
docker run -p 6333:6333 qdrant/qdrant
```

5. **Run the Application**
```bash
# Start backend
cd backend
npm start

# Start frontend
cd frontend
npm run dev
```

Access the application at:
- Frontend: http://localhost:5173
- Backend: http://localhost:5050


## 📡 API Endpoints

### Chat API
```typescript
POST /api/session
Response: { sessionId: string }

GET /api/session/:sessionId
Response: { messages: Message[] }

POST /api/message
Body: { sessionId: string, message: string }
Response: { response: string, articles: Article[] }

DELETE /api/session/:sessionId
Response: { message: string }
```

### WebSocket Events
```typescript
// Client -> Server
'message': { sessionId: string, message: string }

// Server -> Client
'bot_response': { 
  response: string,
  articles: Article[],
  timestamp: Date
}
```

## 💾 Caching Strategy

### Redis Configuration
```javascript
const CACHE_TTL = {
  SESSION: 3600,    // 1 hour
  ARTICLE: 86400,   // 24 hours
  EMBEDDING: 604800 // 7 days
};
```

### Cache Layers
1. **Session Cache**
   - Recent messages
   - User context
   - Quick retrieval

2. **Article Cache**
   - Processed news
   - Embeddings
   - Search results

## ⚡ Performance Features

1. **Vector Search Optimization**
   - Indexed lookups
   - Batch processing
   - Result caching

2. **Response Generation**
   - Streaming responses
   - Typing animations
   - Progressive loading

3. **Resource Management**
   - Connection pooling
   - Cache warming
   - Automatic cleanup

## 🔐 Environment Variables

### Backend (.env)
```env
PORT=5050
MONGODB_URI=your_mongodb_uri
REDIS_URL=your_redis_url
GEMINI_API_KEY=your_gemini_key
QDRANT_URL=your_qdrant_url
```

### Frontend (.env)
```env
VITE_BACKEND_URL=http://localhost:5050
VITE_WS_URL=ws://localhost:5050
```

## 📈 Future Improvements

1. **Features**
   - Multi-language support
   - User preferences
   - Advanced filtering

2. **Performance**
   - Query optimization
   - Batch processing
   - Load balancing

3. **Security**
   - Rate limiting
   - Input validation
   - API authentication

## 🎥 Demo Video
[Link to demo video showing the application features and usage]

## 📄 License
MIT License - feel free to use this project for your own purposes.

## 🤝 Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## 👨‍💻 Author
[Ishan Bathla]


## 🙏 Acknowledgments
- Voosh for the opportunity
- Open-source community for the amazing tools and libraries
