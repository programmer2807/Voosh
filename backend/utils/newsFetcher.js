const Parser = require('rss-parser');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

class NewsFetcher {
    constructor() {
        console.log('Initializing NewsFetcher...');
        this.parser = new Parser();
        this.newsFeeds = [
            {
                url: 'https://www.reuters.com/arc/outboundfeeds/news-sitemap-index/?outputType=xml',
                name: 'Reuters'
            },
            {
                url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
                name: 'BBC World'
            },
            {
                url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
                name: 'NY Times World'
            }
        ];
        console.log(`Configured ${this.newsFeeds.length} news sources`);
    }

    async fetchArticles(limit = 50) {
        try {
            console.log('\n--- Fetching News Articles ---');
            console.log(`Target: ${limit} articles`);
            const articles = [];

            for (const feed of this.newsFeeds) {
                if (articles.length >= limit) {
                    console.log('Reached article limit, stopping fetch');
                    break;
                }

                try {
                    console.log(`\nFetching from ${feed.name}...`);
                    console.log(`URL: ${feed.url}`);
                    
                    const feedContent = await this.parser.parseURL(feed.url);
                    console.log(`✓ Retrieved ${feedContent.items.length} items from feed`);
                    
                    for (const item of feedContent.items) {
                        if (articles.length >= limit) break;

                        const article = {
                            title: item.title,
                            content: this.cleanContent(item.content || item.description || item.summary),
                            source: feed.name,
                            date: item.pubDate || item.isoDate,
                            url: item.link
                        };

                        if (article.content && article.content.length > 100) {
                            articles.push(article);
                            console.log(`Added article: ${article.title.substring(0, 50)}...`);
                        } else {
                            console.log(`Skipped article (content too short): ${article.title.substring(0, 50)}...`);
                        }
                    }
                } catch (feedError) {
                    console.error(`❌ Error fetching from ${feed.name}:`, feedError.message);
                    continue;
                }
            }

            console.log(`\n✓ Successfully fetched ${articles.length} articles total`);
            return articles;
        } catch (error) {
            console.error('❌ Error fetching articles:', error);
            throw error;
        }
    }

    cleanContent(content) {
        if (!content) return '';
        console.log('Cleaning content...');
        console.log(`Original length: ${content.length} characters`);
        
        // Remove HTML tags
        content = content.replace(/<[^>]*>/g, '');
        // Remove extra whitespace
        content = content.replace(/\s+/g, ' ').trim();
        
        console.log(`Cleaned length: ${content.length} characters`);
        return content;
    }
}

module.exports = new NewsFetcher();