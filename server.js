// Import the required modules
const express = require('express');
const cors = require('cors'); // Import the CORS middleware

// Create an Express application
const app = express();

// Set up middleware
app.use(express.json()); // Example middleware to parse JSON data
app.use(cors()); // Example middleware to handle CORS

// Define your routes (next steps)
// You should define your routes in separate files and import them here.

// Example route: Welcome route
app.get('/', (req, res) => {
  res.send('Welcome to your Express.js backend!');
});

// Example route: API route
app.get('/api/data', (req, res) => {
  const data = { message: 'This is an example API endpoint' };
  res.json(data);
});

// Example route: Ping route
app.get('/ping', (req, res) => {
  res.send('pong');
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
