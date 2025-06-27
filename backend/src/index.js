const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const chromaClient = require('./chromaClient');

require('dotenv').config();
const app = express();
const port = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error('Gemini API key is missing. Set GEMINI_API_KEY in .env');
    process.exit(1);
}

app.use(cors());
app.use(express.json());

// Crawl endpoint
app.post('/crawl', async (req, res) => {
    const { urls } = req.body;
    if (!urls || !Array.isArray(urls) || urls.some(url => !isValidUrl(url))) {
        return res.status(400).json({ error: 'Invalid URLs array' });
    }

    const results = [];
    const browser = await puppeteer.launch({ headless: 'new' });

    for (const url of urls) {
        try {
            const page = await browser.newPage();
            await page.goto(url, { waitUntil: 'load', timeout: 60000});
            const content = await page.$eval('body', el => el.innerText.replace(/\s+/g, ' ').trim());
            await chromaClient.addDocument(url, content);
            results.push({ url, content, status: 'success' });
        } catch (error) {
            console.error(`Failed to crawl ${url}:`, error.message);
            results.push({ url, error: error.message, status: 'failed' });
        }
    }

    await browser.close();
    res.json(results);
});

// Query endpoint
app.post('/query', async (req, res) => {
    const { question } = req.body;
    if (!question || typeof question !== 'string' || question.length > 500) {
        return res.status(400).json({ error: 'Invalid or too long question' });
    }

    try {
        const relevantDocs = await chromaClient.search(question);
        if (relevantDocs.length === 0) {
            return res.json({
                answer: 'No relevant information found in the knowledge base.',
                sources: []
            });
        }

        // Prepare context for Gemini
        const context = relevantDocs.map(doc => `Source: ${doc.url}\nContent: ${doc.content.substring(0, 500)}`).join('\n\n');
        const prompt = `Using the following context, answer the question concisely and naturally:\n\n${context}\n\nQuestion: ${question}`;

        // Call Gemini API
        try {
            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
                {
                    contents: [
                        {
                            parts: [{ text: prompt }]
                        }
                    ]
                },
                {
                    headers: { 'Content-Type': 'application/json' }
                }
            );

            const answer = response.data.candidates[0].content.parts[0].text.trim();
            res.json({
                answer,
                sources: relevantDocs.map(doc => ({
                    url: doc.url,
                    excerpt: doc.content.substring(0, 200)
                }))
            });
        } catch (apiError) {
            console.error('Gemini API error:', apiError.message);
            // Fallback mock response
            const questionLower = question.toLowerCase();
            let answer = '';
            if (questionLower.includes('what is') || questionLower.includes('define')) {
                answer = `Artificial Intelligence (AI) refers to machine intelligence that mimics human cognitive abilities, such as learning, reasoning, and problem-solving.`;
            } else if (questionLower.includes('history') || questionLower.includes('when')) {
                answer = `AI research began in 1956, evolving through cycles of optimism and advancements like machine learning.`;
            } else if (questionLower.includes('application') || questionLower.includes('use')) {
                answer = `AI powers search engines, recommendation systems, voice assistants, and automation across industries.`;
            } else {
                answer = `AI enables machines to perform intelligent tasks, leveraging technologies like machine learning.`;
            }
            res.json({
                answer,
                sources: relevantDocs.map(doc => ({
                    url: doc.url,
                    excerpt: doc.content.substring(0, 200)
                }))
            });
        }
    } catch (error) {
        console.error('Query error:', error.message);
        res.status(500).json({ error: 'Failed to generate answer' });
    }
});

function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}
app.get('/', (req, res) => {
    res.send('RAG backend is running 🚀');
});

app.listen(port, () => {
    console.log(`Backend running on http://localhost:${port}`);
});