// Import the required modules
const express = require('express');
const cors = require('cors'); // Import the CORS middleware 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// env variables 
const jwtSecret = process.env.JWT_SECRET; 
const emailUser = process.env.EMAIL_USER;
const emailPassword = process.env.EMAIL_PASSWORD; 

// Create an Express application
const app = express();

// Models: 
const { User } = require('./models');

// Routes:
const { FeedbackReport } = require('./models');

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',  // Choose your email provider
  auth: {
    user: emailUser,  // Your email address
    pass: emailPassword  // Your email password
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
 
// User Registration 
app.post('/register', async (req, res) => {
  const { firstName, lastName, username, email, password, retypedPassword, adminKey } = req.body;

  if (password !== retypedPassword) {
    return res.status(400).send('Passwords do not match');
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const isAdmin = adminKey === process.env.ADMIN_KEY;

  try {
    await User.create({ firstName, lastName, username, email, password: hashedPassword, isAdmin });
    res.send('Registration successful');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});
 
// User Login 
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ where: { username } });
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).send('Invalid credentials');
    }

    const token = jwt.sign({ userId: user.user_id, isAdmin: user.isAdmin }, jwtSecret, { expiresIn: '1h' });
    res.send({ token, user });
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
