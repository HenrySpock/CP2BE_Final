const express = require('express');

const { io } = require('../server');

const router = express.Router();
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');  
const axios = require('axios');
// const { User, Image, Travelog, Comment, Notification, Message, FeedbackReport, Rating, ForbiddenWord, Friendship, Follow, Block, Indicator } = require('../models');
const { User, Message, FeedbackReport, Indicator } = require('../models');
const { Op } = require('sequelize');
const updateLastActive = require('../middleware/updateLastActive');

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

/// GET current user:
router.get('/user', async (req, res) => {
  // console.log('Headers:', req.headers, ' jwtSecret: ', jwtSecret);
  
  const tokenWithBearer = req.headers.authorization;  

  // Checking if the authorization header exists and starts with 'Bearer '
  if (!tokenWithBearer || !tokenWithBearer.startsWith('Bearer ')) {
    return res.status(403).send('Authorization required');
  }

  // Extracting the actual token part from the authorization header
  const actualToken = tokenWithBearer.split(' ')[1];
  // console.log('actualToken: ', jwt.decode(actualToken));

  if (!actualToken) {
    return res.status(403).send('Authorization required');
  }

  try {
    const decodedToken = jwt.verify(actualToken, jwtSecret); 
    const user = await User.findOne({ where: { user_id: decodedToken.userId } });
    if (!user) {
      return res.status(404).send('User not found');
    }
    res.send(user);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

// Function for app.get('/api/users/:username' 
async function getUserByUsername(username) {
  try {
    const user = await User.findOne({
      where: { username: username },
      attributes: ['avatar', 'bio', 'username', 'user_id']  // Only select these attributes
    });
    return user;
  } catch (error) {
    console.error(error);
    throw new Error('Database error');
  }
} 

router.get('/api/users/:username', (req, res) => {
  const { username } = req.params;
  getUserByUsername(username)
    .then(user => {
      if (!user) {
        // Send a 404 status when the user is not found
        res.status(404).send({ error: 'User not found' });
      } else {
        res.json(user);
      }
    })
    .catch(error => res.status(500).send({ error: 'Server error' }));
});

// Fetching Profile For Editing User Details
router.get('/api/user/:userId', async (req, res) => {
  // console.log('WE ARE HERE ***********************')
  try {
    const userId = req.params.userId;
    const user = await User.findByPk(userId);
    res.status(200).send(user);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).send({ message: 'Server error' });
  }
});

// Update a user's details from edit profile 
router.patch('/api/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const updateFields = req.body;
    const isAdminKey = updateFields.adminKey;

    // console.log(`Received update request for user_id: ${userId} with fields:`, updateFields); 
 
    if (typeof req.body.answer !== 'undefined' && req.body.answer !== null && req.body.answer.trim() !== '') {
      // console.log('req.body.answer: ', req.body.answer)
      // Hash the new answer
      const hashedAnswer = bcrypt.hashSync(req.body.answer, 10);
      // console.log('hashedAnswer: ', hashedAnswer)
      updateFields.answer = hashedAnswer;
    }

    const user = await User.findByPk(userId);
    if (!user) {
      // console.log(`User not found for user_id: ${userId}`);
      return res.status(404).send('User not found');
    }

    const previousData = user.get({ plain: true });
    // console.log(`Previous data for user_id: ${userId}:`, previousData);

    // Check if an admin key is provided and matches the expected admin key
    if (isAdminKey && isAdminKey === process.env.ADMIN_KEY) {
      // If the admin key is valid, set isAdmin to true
      updateFields.isAdmin = true;
    }  

    // Add tooltips handling (if included in the updateFields)
    if (typeof updateFields.tooltips !== 'undefined') {
      user.tooltips = updateFields.tooltips;
    }

    // Update the user with the provided fields, including the isAdmin value
    const updateResult = await user.update(updateFields);

    // console.log(`Update result for user_id: ${userId}:`, updateResult.get({ plain: true }));

    res.json({
      success: true,
      message: 'User details updated successfully',
      updatedFields: updateResult.get({ plain: true }),
    });
  } catch (error) {
    console.error('Error updating user details:', error);
    res.status(500).send('Server error');
  }
});


// Deleting a User, their travelogs and images. 
router.delete('/api/user/:userId', async (req, res) => {
  // console.log('req.params: ', req.params)
  try {
    const userId = req.params.userId;

    await FeedbackReport.destroy({ 
      where: { 
        [Op.or]: [
          { reported_user_id: userId }, 
        ] 
      }
    });
    await Message.destroy({ where: { caller_id: userId } });
    await Message.destroy({ where: { receiver_id: userId } });
    
    await User.destroy({ where: { user_id: userId } });
    res.status(200).send({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).send({ message: 'Server error' });
  }
});

// Changing a password
router.patch('/api/user/:userId/password', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { oldPassword, newPassword } = req.body;
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).send('User not found');
    }

    const isPasswordMatch = await bcrypt.compare(oldPassword, user.password);
    
    if (!isPasswordMatch) {
      return res.status(400).send('Old password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedPassword });
    res.send('Password updated successfully');
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).send('Server error');
  }
}); 

// Endpoint to create an indicator
router.post('/api/indicator', async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).send('User ID is required');
    }

    // Check if an indicator already exists
    const existingIndicator = await Indicator.findOne({ where: { user_id } });
    if (!existingIndicator) {
      // Create the indicator if it does not exist
      await Indicator.create({
        user_id,
        logged_in: false,
        last_active: new Date() 
      });
    }

    res.status(200).send('Indicator created or already exists');
  } catch (error) {
    console.error('Error creating indicator:', error);
    res.status(500).send('Server error');
  }
});
 
// Endpoint to handle login PATCH request
router.patch('/api/indicator/login', async (req, res) => {
  // console.log("Received login request, user_id:", req.body.user_id);
  try {
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).send('User ID is required');
    }

    // Update the Indicator for the user to set logged_in to true and update last_active 
    await Indicator.update(
      
      { logged_in: true, last_active: new Date() },
      { where: { user_id: user_id } }
    );

    res.status(200).send('Login status updated successfully');
  } catch (error) {
    console.error('Error updating login status:', error);
    res.status(500).send('Server error');
  }
});

// Endpoint to handle logout PATCH request
router.patch('/api/indicator/logout', updateLastActive, async (req, res) => {
  // console.log("Received logout request, user_id:", req.body.user_id);
  try {
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).send('User ID is required');
    }

    // Update the Indicator for the user to set logged_in to false
    // console.log('ON API/INDICATOR/LOGOUT, user_id: ', user_id),
    await Indicator.update(
      
      { logged_in: false },
      { where: { user_id: user_id } }
    );

    res.status(200).send('Logout status updated successfully');
  } catch (error) {
    console.error('Error updating logout status:', error);
    res.status(500).send('Server error');
  }
});

// Fetch last active time 
router.get('/api/users-last-active/:username', async (req, res) => {
  // console.log('TRYING TO FETCH LAST ACTIVE')
  try {
    // Find the user by username
    const user = await User.findOne({
      where: { username: req.params.username },
      attributes: ['user_id', 'username', 'bio', 'avatar', 'user_zoom' /* other user attributes */],
      include: [{
        model: Indicator,
        attributes: ['last_active'],
        as: 'Indicator',
        required: false // Ensures that the user data is returned even if there's no matching indicator
      }]
    });

    if (user) {
      // console.log("^^^^^^^^^^^^^^User found with Indicator:", user.Indicator);
    }

    if (!user) {
      return res.status(404).send('^^^^^^^^^^^^^^^^^User not found');
    }

    // Extracting last_active time from the indicators
    const lastActiveTime = user.Indicator ? user.Indicator.last_active : null;

    res.json({ ...user.toJSON(), last_active: lastActiveTime });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).send('Server error');
  }
});

module.exports = router;