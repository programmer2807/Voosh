const { GoogleGenAI } = require("@google/genai");

async function main() {
  // Initialize with API key
  const genAI = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
  });

  try {
    console.log('Testing Gemini API...');
    
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Explain how AI works in a few words"
    });

    console.log('\nResponse:', response.text);
    console.log('\nAPI test successful!');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Load environment variables
require('dotenv').config();
console.log('Starting Gemini API test...');
main();