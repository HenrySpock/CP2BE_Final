const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config(); 

// const { User, Image, Travelog, Comment, Notification, Message, FeedbackReport, Rating, ForbiddenWord, Friendship, Follow, Block, Trip, ProfileLikes, TripLikes, TravLikes, CommentLikes, ImageLikes, Permission, Maintenance, sequelize} = require('../models');
const { User, Image, Travelog, Trip, sequelize} = require('../models');
const router = express.Router();


// Find most recent user 
router.get('/api/users/newest', async (req, res) => {
  try {
    const newestUser = await User.findOne({
      // attributes: { exclude: ['created_at', 'updated_at'] },
      order: [['created_at', 'DESC']]
    });

    // console.log('newestUser: ', newestUser)
    res.json(newestUser);
  } catch (error) {
    console.error('Error fetching newest user:', error);
    res.status(500).send(error.message);
  }
});

// Find most recent trip 
router.get('/api/trips/newest', async (req, res) => {
  try {
    const newestTrip = await Trip.findOne({
      where: { is_private: false },
      // attributes: { exclude: ['created_at', 'updated_at'] },
      include: [{ model: User, as: 'User', attributes: ['user_id', 'username', 'created_at']  }],
      order: [['created_at', 'DESC']]
    });
    // console.log('newestTrip: ', newestTrip)
    res.json(newestTrip);
  } catch (error) {
    console.error('Error fetching newest trip:', error);
    res.status(500).send(error.message);
  }
});

// Find most recent travelog 
router.get('/api/travelogs/newest', async (req, res) => {
  try {
    const newestTravelog = await Travelog.findOne({
      where: { is_private: false },
      // attributes: { exclude: ['created_at', 'updated_at'] },
      include: [
        { model: User, as: 'User', attributes: ['user_id', 'username', 'created_at'] }, 
        { model: Image, as: 'Images', attributes: ['image_id', 'travelog_id', 'image_url', 'view_count', 'title', 'description', 'created_at', 'updated_at']  }
      ], 
      order: [['created_at', 'DESC']]
    });
    // console.log('newestTravelog:', newestTravelog);
    if (!newestTravelog) {
      // console.log('No travelog found');
      return res.status(204).send('No travelogs currently');
    }
    res.json(newestTravelog);
  } catch (error) {
    console.error('Error fetching newest travelog:', error);
    res.status(500).send(error.message);
  }
});

module.exports = router;