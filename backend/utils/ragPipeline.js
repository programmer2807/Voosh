const { QdrantClient } = require('@qdrant/js-client-rest');
const { GoogleGenAI } = require('@google/genai');
const { pipeline } = require('@xenova/transformers');
const newsFetcher = require('./newsFetcher');

class RAGPipeline {
    constructor() {
        console.log('Initializing RAG Pipeline...');

        // Check for the API key at the start
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('❌ Error: GEMINI_API_KEY environment variable is not set. Please provide a valid API key in your .env file.');
            throw new Error('API Key not found');
        }

        this.qdrant = new QdrantClient({ url: process.env.QDRANT_URL || 'http://localhost:6333' });
        
        // Correctly initialize the GoogleGenAI client with the apiKey property
        this.genAI = new GoogleGenAI({ apiKey: apiKey });
        
        this.collectionName = 'news_articles';
        this.vectorSize = 384; // MiniLM embedding size
        this.embeddingModel = null;
    }

    async initialize() {
        try {
            console.log('Starting RAG pipeline initialization...');
            
            // Log the API key to confirm it's being read
            console.log('GEMINI_API_KEY from environment:', process.env.GEMINI_API_KEY ? 'Set' : 'Not Set');

            // Initialize the embedding model
            console.log('Loading embedding model...');
            this.embeddingModel = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
            console.log('✓ Embedding model loaded');

            // Delete existing collection if it exists
            try {
                console.log('Checking for existing collection...');
                const collections = await this.qdrant.getCollections();
                if (collections.collections.find(c => c.name === this.collectionName)) {
                    console.log('Deleting existing collection...');
                    await this.qdrant.deleteCollection(this.collectionName);
                    console.log('✓ Existing collection deleted');
                }
            } catch (error) {
                console.log('No existing collection found');
            }

            // Create new collection
            console.log('Creating new collection...');
            await this.qdrant.createCollection(this.collectionName, {
                vectors: {
                    size: this.vectorSize,
                    distance: 'Cosine'
                }
            });
            console.log('✓ New collection created');

            // Ingest articles
            console.log('Starting article ingestion...');
            await this.ingestArticles();
            console.log('✓ Articles ingested');
            
            console.log('RAG pipeline initialization complete!');
        } catch (error) {
            console.error('❌ Error initializing RAG pipeline:', error);
            throw error;
        }
    }

    async getEmbedding(text) {
        try {
            console.log('Generating embedding...');
            console.log('Text length:', text.length, 'characters');
            
            const output = await this.embeddingModel(text, {
                pooling: 'mean',
                normalize: true
            });

            console.log('✓ Embedding generated');
            return Array.from(output.data);
        } catch (error) {
            console.error('❌ Error generating embedding:', error);
            throw error;
        }
    }

    async ingestArticles() {
        try {
            console.log('Starting article ingestion process...');
            const articles = await newsFetcher.fetchArticles(50);
            console.log(`✓ Fetched ${articles.length} articles`);

            for (let i = 0; i < articles.length; i++) {
                const article = articles[i];
                console.log(`\nProcessing article ${i + 1}/${articles.length}`);
                console.log(`Title: ${article.title}`);
                console.log(`Source: ${article.source}`);
                
                console.log('Generating embedding...');
                const embedding = await this.getEmbedding(article.content);

                console.log('Storing in Qdrant...');
                await this.qdrant.upsert(this.collectionName, {
                    points: [{
                        id: i,
                        vector: embedding,
                        payload: {
                            content: article.content,
                            source: article.source,
                            title: article.title,
                            date: article.date,
                            url: article.url
                        }
                    }]
                });
                console.log(`✓ Article ${i + 1} processed successfully`);
            }
            console.log('\n✓ All articles ingested successfully');
        } catch (error) {
            console.error('❌ Error ingesting articles:', error);
            throw error;
        }
    }

    async queryAndGenerate(userQuery) {
        try {
            console.log('\n--- Processing Query ---');
            console.log('User query:', userQuery);

            // Get query embedding
            console.log('\n1. Generating query embedding...');
            const queryEmbedding = await this.getEmbedding(userQuery);
            console.log('✓ Query embedding generated');

            // Search similar documents
            console.log('\n2. Searching for relevant documents...');
            const searchResults = await this.qdrant.search(this.collectionName, {
                vector: queryEmbedding,
                limit: 3
            });
            console.log(`✓ Found ${searchResults.length} relevant documents`);

            // Prepare context and relevant articles
            console.log('\n3. Preparing context from documents...');
            let context = '';
            const relevantArticles = searchResults.map(result => ({
                title: result.payload.title,
                source: result.payload.source,
                content: result.payload.content,
                date: result.payload.date,
                url: result.payload.url,
                score: result.score
            }));

            // Build context from articles
            for (const article of relevantArticles) {
                context += `Article from ${article.source} titled "${article.title}":\n`;
                context += article.content + '\n\n';
            }
            console.log('✓ Context prepared');

            // Generate response
            console.log('\n4. Generating response with Gemini...');
            const response = await this.genAI.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `Context from news articles:\n${context}\n\nUser question: ${userQuery}\n\nPlease provide a relevant answer based on the context above. If the context doesn't contain relevant information, please say so. Include sources in your response when citing specific information.`
            });
            
            console.log('✓ Response generated successfully');

            // Return both the articles and the generated response
            return {
                relevantArticles,
                response: response.text
            };
        } catch (error) {
            console.error('❌ Error in query and generate:', error);
            throw error;
        }
    }

    async refreshArticles() {
        try {
            console.log('\n--- Refreshing Articles ---');
            
            // Delete and recreate collection
            console.log('1. Recreating collection...');
            await this.qdrant.deleteCollection(this.collectionName);
            await this.qdrant.createCollection(this.collectionName, {
                vectors: {
                    size: this.vectorSize,
                    distance: 'Cosine'
                }
            });
            console.log('✓ Collection recreated');

            // Ingest fresh articles
            console.log('\n2. Ingesting fresh articles...');
            await this.ingestArticles();
            console.log('✓ Article refresh complete!');
        } catch (error) {
            console.error('❌ Error refreshing articles:', error);
            throw error;
        }
    }
}

module.exports = new RAGPipeline();
