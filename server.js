const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static('.'));

// API endpoint to get the API key (server-side only)
app.get('/api/config', (req, res) => {
    res.json({
        geminiApiKey: process.env.GOOGLE_GEMINI_API_KEY || ''
    });
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🏸 Badminton Planner server running at http://localhost:${PORT}`);
    console.log(`📁 Serving files from: ${__dirname}`);
    if (process.env.GOOGLE_GEMINI_API_KEY) {
        console.log('🤖 Google Gemini API key loaded from environment');
    } else {
        console.log('⚠️  No Google Gemini API key found in .env file');
    }
});