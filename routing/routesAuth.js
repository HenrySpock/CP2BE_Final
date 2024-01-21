const express = require('express');

const { io } = require('../server');

const router = express.Router();
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');  
const axios = require('axios');
// const { User, Image, Travelog, Comment, Notification, Message, FeedbackReport, Rating, ForbiddenWord, Friendship, Follow, Block, Permission } = require('../models');
const { User } = require('../models');
const { Op } = require('sequelize');
const crypto = require('crypto');



// env variables 
const jwtSecret = process.env.JWT_SECRET; 
const emailUser = process.env.EMAIL_USER;
const emailPassword = process.env.EMAIL_PASSWORD; 
const adminKey = process.env.ADMIN_KEY;
const apiKey = process.env.API_KEY;

// Function to generate verification token
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};




const transporter = nodemailer.createTransport({
  service: 'gmail',  
  auth: {
    user: emailUser,  
    pass: emailPassword   
  }
});

// Register a user 
router.post('/register', async (req, res) => {
  console.log('registering user on backend: ', req.body)
  const {
    first_name,
    last_name,
    username,
    email,
    password,
    retypedPassword,
    adminKey,
    security_question,
    answer,
    avatar,
    bio
  } = req.body;

  if (password !== retypedPassword) {
    return res.status(400).send({ error: 'Passwords do not match' });
  }

  // Check if the email or username is already in use
  try {
    const existingEmailUser = await User.findOne({ where: { email } });
    const existingUsernameUser = await User.findOne({ where: { username } });

    if (existingEmailUser) {
      return res.status(400).send({ error: 'Email already in use' });
    }
    if (existingUsernameUser) {
      return res.status(400).send({ error: 'Username already in use' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const hashedAnswer = bcrypt.hashSync(answer, 10); 
    const isAdmin = adminKey === process.env.ADMIN_KEY;
    const avatarUrl = avatar || 'https://live.staticflickr.com/3557/3449041959_1bd9b05ac8_c.jpg';

    if (adminKey && adminKey !== process.env.ADMIN_KEY) {
      return res.status(400).send({ error: 'Invalid Admin Key' });
    }

    const verificationToken = generateVerificationToken();
    // const verificationLink = `http://localhost:3000/verify_email?token=${verificationToken}`;
    const verificationLink = `https://castlingfe.onrender.com/verify_email?token=${verificationToken}`;

    const newUser = await User.create({
      first_name,
      last_name,
      username,
      email,
      password: hashedPassword,
      isAdmin,
      security_question,
      answer: hashedAnswer,
      avatar: avatarUrl,
      bio, 
      verification_token: verificationToken,
      is_email_verified: false
    });

    // MailOptions 
    const mailOptions = {
      from: emailUser, // Admin's email address
      to: newUser.email, // User's email address
      subject: 'Email Verification',
      html: `<p>Welcome to our application! Please click the link to verify your email: <a href="${verificationLink}">${verificationLink}</a></p>`
    };
    
    transporter.sendMail(mailOptions, function(error, info) {
      if (error) {
        // console.log(error);
        res.status(500).send('Error sending email');
      } else {
        // console.log('Email sent: ' + info.response);
        res.send('Registration successful, please verify your email.');
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Server error' });
  }
});

// User Login 
router.post('/login', async (req, res) => {
  const { username, password } = req.body; 

  try {
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(401).send('User not found');
    }

    if (!user.is_email_verified) {
      return res.status(401).send('Please verify your email before logging in');
    }

    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).send('Invalid credentials');
    }

    const token = jwt.sign({ userId: user.user_id, isAdmin: user.isAdmin }, jwtSecret); 
    res.send({ token, user });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
}); 

// Backend endpoint to reset password
router.post('/api/user/reset_password', async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).send('User not found');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedPassword });
    res.send('Password updated successfully');
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).send('Server error');
  }
});
 

// PATCH route for updating email verification status
router.patch('/verify_email', async (req, res) => {
  const { token } = req.query;

  // console.log(`Email verification request received at ${new Date().toISOString()} for token: ${token}`);
  
  try {
    const user = await User.findOne({ where: { verification_token: token } });

    if (!user) {
      return res.status(400).send('Invalid or expired verification token');
    }

    if (user.is_email_verified) {
      return res.status(400).send('Email already verified.');
    }

    // Update user's email verification status
    user.is_email_verified = true;
    user.verification_token = null;
    await user.save();

    // console.log(`User verified at ${new Date().toISOString()} - username: ${user.username}`);
    
    res.json({ message: 'Email verified successfully.', email: user.email });
  } catch (error) {
    console.error(`Email verification error at ${new Date().toISOString()}:`, error);
    res.status(500).send('Server error during email verification');
  }
});

// Verification Check route
router.get('/verification_check', async (req, res) => {
  try {
    const { email } = req.query;

    // Check if the email is verified
    const user = await User.findOne({ where: { email } });

    if (user && user.is_email_verified) {
      // Email is verified
      return res.send('Email verified. Returning to login.');
    } else {
      // Email is not verified
      return res.send('Problem with verification. Please request a new token.');
    }
  } catch (error) {
    console.error(`Verification check error at ${new Date().toISOString()}:`, error);
    res.status(500).send('Server error during verification check');
  }
});

router.post('/api/user/validate_security_answer', async (req, res) => {
  const { email, security_question, answer } = req.body; 
  // console.log('HERE, EMAIL SECURITYQUESTION SECURITYANSWER', email, security_question, answer)
  try {
    const user = await User.findOne({ where: { email } }); 
    if (!user) {
      return res.status(404).send('User not found');
    }

    // console.log('HERE HERE')
    // console.log('answer, user.answer: ', answer, user.answer)

    // Check if both the security question and the answer match
    if (user.security_question !== security_question || !bcrypt.compareSync(answer, user.answer)) {
      return res.status(400).send('Invalid security question or answer');
    } 

    // If both are correct
    res.send('Security question and answer validated');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Server error');
  }
});



module.exports = router;
 
 