const express = require('express');
const cors = require('cors');  
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config(); 

const { User, Image, Travelog, Trip, sequelize} = require('../models');
const router = express.Router();

// View Count for Public Profile
router.patch('/api/public_profile/increment-view-count/:username', async (req, res) => {
  // console.log("Endpoint hit with username:", req.params.username);
  try {
    const { username } = req.params;
    
    // Find the user by username and increment the view count
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(404).send('User not found');
    }

    user.viewCount += 1; // Increment the view count
    await user.save(); // Save the updated user

    res.send('View count updated');
  } catch (error) {
    console.error('Error updating view count:', error);
    res.status(500).send('Server Error');
  }
});

// View Count for travelog
router.patch('/api/travelog/increment-view-count/:travelogId', async (req, res) => { 

  // console.log("Endpoint hit with travelogId:", req.params.travelogId);
  try {
    const { travelogId } = req.params;
    
    // Find the user by username and increment the view count
    const travelog = await Travelog.findOne({ where: { travelog_id: travelogId } });
    if (!travelog) {
      return res.status(404).send('Travelog not found');
    }

    travelog.viewCount += 1; // Increment the view count
    await travelog.save(); // Save the updated user

    res.send('View count updated');
  } catch (error) {
    console.error('Error updating view count:', error);
    res.status(500).send('Server Error');
  }
});

// View Count for trip
router.patch('/api/trip/increment-view-count/:trip_id', async (req, res) => { 
  
  // console.log("Endpoint hit with tripId:", req.params.trip_id);
  try {
    const { trip_id } = req.params;
    
    // Find the user by username and increment the view count
    const trip = await Trip.findOne({ where: { trip_id } });
    if (!trip) {
      return res.status(404).send('Trip not found');
    }

    trip.viewCount += 1; // Increment the view count
    await trip.save(); // Save the updated user

    res.send('View count updated');
  } catch (error) {
    console.error('Error updating view count:', error);
    res.status(500).send('Server Error');
  }
});

// Increment view count for an image
router.patch('/api/image/increment-view-count/:image_id', async (req, res) => { 
  try {
    const { image_id } = req.params;
    // console.log("Attempting to increment view count for image_id:", image_id);

    // Find the image by image_id and increment the view count
    const image = await Image.findOne({ where: { image_id } });
    // console.log("Found image:", image);

    if (!image) {
      return res.status(404).send('Image not found');
    }
    
    image.viewCount += 1; // Increment the view count
    await image.save(); // Save the updated image
    // console.log("View count incremented for image_id:", image_id);

    res.send('View count updated');
  } catch (error) {
    console.error('Error updating view count for image:', error);
    res.status(500).send('Server Error');
  }
});

module.exports = router;