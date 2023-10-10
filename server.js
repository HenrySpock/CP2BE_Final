// Import the required modules
const express = require('express');
const cors = require('cors'); // Import the CORS middleware

// Create an Express application
const app = express();

// Routes:
const { FeedbackReport } = require('./models');

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',  // Choose your email provider
  auth: {
    user: 'mhenrytillman@gmail.com',  // Your email address
    pass: 'fcyy tuzn iksq loes'  // Your email password
  }
});

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

// Feedback Post Route:
app.post('/submit-feedback', async (req, res) => {
  console.log('Received request at /submit-feedback');  // <-- add this line
  const { name, email, comment } = req.body;
  console.log(`Name: ${name}, Email: ${email}, Comment: ${comment}`);  // <-- and this line
  
  try {
    await FeedbackReport.create({
      name,
      email,
      content: comment
    });

    let mailOptions = {
      from: 'mhenrytillman@gmail.com',  // your email address or a no-reply address
      to: 'mhenrytillman@gmail.com',  // your email address
      subject: `Feedback from ${name} (${email})`,
      text: comment
    };

    console.log('About to send email');  // <-- add this line
    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        console.log(error);
        res.status(500).send('Server error');
      } else {
        console.log('Email sent: ' + info.response);
        res.send('Feedback submitted successfully');
      }
    }); 
    console.log('Called sendMail');  // <-- add this line
 
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
