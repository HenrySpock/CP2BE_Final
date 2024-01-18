const express = require('express'); 
const router = express.Router(); 
// const { User, Image, Travelog, Comment, Notification, Message, FeedbackReport, Rating, ForbiddenWord, Friendship, Follow, Block, Trip, TipTapContent, sequelize } = require('../models');
const { User, Image, Travelog, Block, Trip, sequelize } = require('../models');
const { Op, Sequelize } = require('sequelize');

// Search for users by username
router.get('/users', async (req, res) => {
  try {
    const { username, currentUserId } = req.query;

    // Fetch users that match the username and are not blocking the current user
    const users = await User.findAll({
      where: {
        username: { [Op.iLike]: `%${username}%` }
      },
      include: [{
        model: Block,
        as: 'blocksReceived', // Using the alias for blocks where the user is blocked
        where: {
          blocker_id: currentUserId
        },
        required: false
      }, {
        model: Block,
        as: 'blocksMade', // Using the alias for blocks where the user has blocked others
        where: {
          blocked_id: currentUserId
        },
        required: false
      }]
    });

    // Filter out users who have blocked the current user
    const accessibleUsers = users.filter(user => {
      const isBlockedByUser = user.blocksReceived.some(block => block.blocker_id === parseInt(currentUserId));
      const hasBlockedUser = user.blocksMade.some(block => block.blocked_id === parseInt(currentUserId));    
      return !isBlockedByUser && !hasBlockedUser;
    });

    res.json(accessibleUsers);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).send('Error searching users');
  }
});
 
// Search for trips by title or trip entry
router.get('/trips', async (req, res) => { 
    try {
      const { title, currentUserId } = req.query; // Retrieve the search term for the title and current user ID from query parameters
  
      // Fetch all trips that are not marked as private, match the title search term, and are not associated with blocked users
      const trips = await Trip.findAll({
        where: {
          is_private: false,
          title: {
            [Op.iLike]: `%${title}%` // Searches for trips where the title contains the search term
          }
        },
        include: [{
          model: User,
          as: 'User', // Use the alias as defined in your association
          include: [{
            model: Block,
            as: 'blocksReceived',
            where: { blocker_id: currentUserId },
            required: false
          }, {
            model: Block,
            as: 'blocksMade',
            where: { blocked_id: currentUserId },
            required: false
          }]
        }]
      });
  
      // Filter out trips associated with users in a block relationship with the current user
      const accessibleTrips = trips.filter(trip => {
        const user = trip.User;
        const isBlockedByUser = user.blocksReceived && user.blocksReceived.some(block => block.blocker_id === parseInt(currentUserId));
        const hasBlockedUser = user.blocksMade && user.blocksMade.some(block => block.blocked_id === parseInt(currentUserId));
        return !isBlockedByUser && !hasBlockedUser;
      });
  
      res.json(accessibleTrips);
    } catch (error) {
      console.error('Error fetching trips:', error);
      res.status(500).send('Error fetching trips');
    }
  });
  
// Endpoint to search travelogs 
router.get('/travelogs', async (req, res) => {
  try {
    const { searchTerm, currentUserId } = req.query;

    const travelogs = await Travelog.findAll({
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              { title: { [Op.iLike]: `%${searchTerm}%` } },
              { country: { [Op.iLike]: `%${searchTerm}%` } },
              { city: { [Op.iLike]: `%${searchTerm}%` } },
              { site: { [Op.iLike]: `%${searchTerm}%` } }
            ],
          },
          { is_private: false }
        ]
      },
      include: [
        {
          model: User,
          as: 'User',
          required: true,
          include: [
            {
              model: Block,
              as: 'blocksMade',
              where: { blocked_id: currentUserId },
              required: false
            },
            {
              model: Block,
              as: 'blocksReceived',
              where: { blocker_id: currentUserId },
              required: false
            }
          ]
        },
        {
          model: Image,
          as: 'Images', // Use the alias as defined in your association
          limit: 1  
        }
      ]
    });

    // Filter out any travelogs where the user is blocked or has blocked the travelog's user
    const accessibleTravelogs = travelogs.filter(travelog => {
      const user = travelog.User;
      const isBlockedByUser = user.blocksReceived && user.blocksReceived.some(block => block.blocker_id === parseInt(currentUserId));
      const hasBlockedUser = user.blocksMade && user.blocksMade.some(block => block.blocked_id === parseInt(currentUserId));    
      return !isBlockedByUser && !hasBlockedUser;
    });

    res.json(accessibleTravelogs);
  } catch (error) {
    console.error('Error searching travelogs:', error);
    res.status(500).send('Error searching travelogs');
  }
});
 
// Search for travelogs and their images
router.get('/images/travelogs', async (req, res) => {
  try {
    const { searchTerm, currentUserId } = req.query;

    const travelogs = await Travelog.findAll({
      where: {
        [Op.or]: [
          { title: { [Op.iLike]: `%${searchTerm}%` } },
          { site: { [Op.iLike]: `%${searchTerm}%` } },
          { country: { [Op.iLike]: `%${searchTerm}%` } },
          { city: { [Op.iLike]: `%${searchTerm}%` } }
        ],
        is_private: false
      },
      include: [{
        model: Image,
        as: 'Images'
      }, {
        model: User,
        as: 'User',
        include: [
          {
            model: Block,
            as: 'blocksReceived',
            where: { blocker_id: currentUserId },
            required: false
          },
          {
            model: Block,
            as: 'blocksMade',
            where: { blocked_id: currentUserId },
            required: false
          }
        ],
        required: true
      }]
    });

    res.json(travelogs);
  } catch (error) {
    console.error('Error searching travelogs:', error);
    res.status(500).send('Error searching travelogs');
  }
});



module.exports = router; 