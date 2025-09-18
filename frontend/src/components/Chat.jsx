import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import ChatMessage from './ChatMessage';
import { ArrowUpIcon, TrashIcon, ClockIcon, XMarkIcon } from '@heroicons/react/24/solid';

const BACKEND_URL = 'http://localhost:5050';
const socket = io(BACKEND_URL);

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [pastSessions, setPastSessions] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load all past sessions
  const loadPastSessions = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/sessions`);
      setPastSessions(response.data.sessions);
    } catch (error) {
      console.error('Error loading past sessions:', error);
    }
  };

  // Load specific session history
  const loadSessionHistory = async (sid) => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/session/${sid}`);
      if (response.data.messages) {
        setMessages(response.data.messages.map(msg => ({
          content: msg.content,
          isUser: msg.role === 'user',
          articles: msg.articles,
          timestamp: msg.timestamp
        })));
        setSessionId(sid);
        localStorage.setItem('chatSessionId', sid);
        setShowHistory(false);
      }
    } catch (error) {
      console.error('Error loading session history:', error);
    }
  };

  useEffect(() => {
    const initializeSession = async () => {
      const savedSessionId = localStorage.getItem('chatSessionId');
      
      if (savedSessionId) {
        await loadSessionHistory(savedSessionId);
      } else {
        try {
          const response = await axios.post(`${BACKEND_URL}/api/session`);
          const newSessionId = response.data.sessionId;
          setSessionId(newSessionId);
          localStorage.setItem('chatSessionId', newSessionId);
        } catch (error) {
          console.error('Error creating session:', error);
        }
      }

      // Load past sessions for history panel
      await loadPastSessions();
    };

    initializeSession();

    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('bot_response', (data) => {
      setIsTyping(true);
      let response = '';
      const words = data.response.split(' ');
      
      words.forEach((word, index) => {
        setTimeout(() => {
          response += word + ' ';
          setMessages(prev => {
            const newMessages = [...prev];
            if (newMessages[newMessages.length - 1]?.isUser) {
              newMessages.push({ 
                content: response.trim(), 
                articles: data.articles, 
                isUser: false,
                timestamp: new Date()
              });
            } else {
              newMessages[newMessages.length - 1] = { 
                content: response.trim(), 
                articles: data.articles, 
                isUser: false,
                timestamp: new Date()
              };
            }
            return newMessages;
          });

          if (index === words.length - 1) {
            setIsTyping(false);
            setIsLoading(false);
          }
        }, index * 50);
      });
    });

    return () => {
      socket.off('connect');
      socket.off('bot_response');
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !sessionId || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    setMessages(prev => [...prev, { 
      content: userMessage, 
      isUser: true,
      timestamp: new Date()
    }]);

    try {
      await axios.post(`${BACKEND_URL}/api/message`, {
        sessionId,
        message: userMessage
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (!sessionId) return;

    try {
      await axios.delete(`${BACKEND_URL}/api/session/${sessionId}`);
      setMessages([]);
      const response = await axios.post(`${BACKEND_URL}/api/session`);
      const newSessionId = response.data.sessionId;
      setSessionId(newSessionId);
      localStorage.setItem('chatSessionId', newSessionId);
      await loadPastSessions(); // Refresh past sessions list
    } catch (error) {
      console.error('Error clearing chat:', error);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="flex justify-between items-center bg-white p-4 shadow">
        <h1 className="text-xl font-bold">Voosh News Chatbot</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowHistory(true)}
            className="text-blue-500 hover:text-blue-600"
            title="View Past Sessions"
          >
            <ClockIcon className="h-6 w-6" />
          </button>
          <button
            onClick={handleClearChat}
            className="text-red-500 hover:text-red-600"
            title="Reset Session"
          >
            <TrashIcon className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* History Panel */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Chat History</h2>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              {pastSessions.map((session) => (
                <div
                  key={session.sessionId}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => loadSessionHistory(session.sessionId)}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Session {session.sessionId.slice(-6)}</span>
                    <span className="text-sm text-gray-500">{formatDate(session.createdAt)}</span>
                  </div>
                  {session.messages.length > 0 && (
                    <p className="text-sm text-gray-600 mt-2 truncate">
                      Last message: {session.messages[session.messages.length - 1].content}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg, index) => (
          <div key={index} className="mb-6">
            <div className="flex justify-between items-start mb-1">
              <ChatMessage
                message={msg.content}
                isUser={msg.isUser}
              />
              {msg.timestamp && (
                <span className="text-xs text-gray-400 ml-2">
                  {formatDate(msg.timestamp)}
                </span>
              )}
            </div>
            {!msg.isUser && msg.articles && (
              <div className="mt-2 space-y-2">
                <p className="text-sm text-gray-600 font-semibold">Relevant Articles:</p>
                {msg.articles.map((article, idx) => (
                  <div key={idx} className="bg-white rounded-lg p-3 shadow-sm">
                    <h3 className="font-medium text-blue-600">{article.title}</h3>
                    <p className="text-sm text-gray-500">Source: {article.source}</p>
                    {article.url && (
                      <a 
                        href={article.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-500 hover:underline"
                      >
                        Read more
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {(isLoading || isTyping) && (
          <div className="chat-message bot-message">
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100" />
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white p-4 shadow-lg">
        <div className="flex space-x-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask me anything about the news..."
            className="message-input"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="send-button disabled:opacity-50"
          >
            <ArrowUpIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;