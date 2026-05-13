// NAYA CHOTA server.js
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to set headers for Firebase Auth popups
app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
    next();
});

// Yeh command aapke folder ki sabhi HTML files ko browser par show karegi
app.use(express.static(path.join(__dirname, './')));

// Jab koi site khole, toh index.html dikhao
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Website is running on http://localhost:${PORT}`);
    console.log(`✅ Note: Database is now 100% handled by Firebase!`);
});