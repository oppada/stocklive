// client/api/index.js
// This file acts as a proxy for the main backend server (stocklive/server/index.js)
// This is to align with Vercel's conventional routing for serverless functions
// where a file in the 'api' directory becomes a serverless function.

const app = require('../../server/index'); // Adjust path as needed

module.exports = app;
