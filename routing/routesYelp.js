const express = require('express');

const { io } = require('../server');

const router = express.Router();
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');  
const axios = require('axios');
// const { User, Image, Travelog, Comment, Notification, Message, FeedbackReport, Rating, ForbiddenWord, Friendship, Follow, Block } = require('../models');
const { Op } = require('sequelize');


// env variables 
const jwtSecret = process.env.JWT_SECRET; 
const emailUser = process.env.EMAIL_USER;
const emailPassword = process.env.EMAIL_PASSWORD; 
const adminKey = process.env.ADMIN_KEY;
const apiKey = process.env.API_KEY;


const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: {
    user: emailUser, 
    pass: emailPassword 
  }
});

// Make Yelp search
router.get('/yelp-search', async (req, res) => {
  try {
    const { country, city, state, poi } = req.query;
    const location = `${poi ? poi + ', ' : ''}${city}${state ? ', ' + state : ''}, ${country}`;
    const term = poi || city;  // search by poi, and if not available, by city

    const yelpResponse = await axios.get('https://api.yelp.com/v3/businesses/search', {
      params: { term, location, limit: 5 },
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    res.json(yelpResponse.data);
  } catch (error) {
    console.error('Yelp API error:', error);
    res.status(500).send('Server error');
  }
});

module.exports = router;