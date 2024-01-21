const express = require('express');

const { io } = require('../server');

const router = express.Router();
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');  
const axios = require('axios');
// const { User, Image, Travelog, Comment, Notification, Message, FeedbackReport, Rating, ForbiddenWord, Friendship, Follow, Block, Trip, TipTapContent, Indicator, sequelize } = require('../models');
const { User, Image, Travelog, Block, Trip, TipTapContent, sequelize } = require('../models');
const { Op } = require('sequelize');
const updateLastActive = require('../middleware/updateLastActive');
const { getFriendsIds, getFollowersIds, getFollowingsIds } = require('../helperFunctions/helperFunctions');

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


// Posting a travelog
router.post('/api/travelog', updateLastActive, async (req, res) => {
  // console.log("Received request on /api/travelog");
  // console.log("Request body:", req.body);
  
  try { 

    const { user_id, ...otherData } = req.body;
    const newTravelog = await Travelog.create({
        user_id,
        ...otherData,
        traventry: req.body.traventry,
    });

    // console.log('Newly created Travelog:', newTravelog);
    // If images are included, save them as well
    if (req.body.imageUrls && req.body.imageUrls.length) {
      const imagesData = req.body.imageUrls.map(url => {
        return { travelog_id: newTravelog.travelog_id, image_url: url }; 
      });
      // console.log('Images Data to Insert:', imagesData);
      await Image.bulkCreate(imagesData);   
    }
    // console.log("Attempting to save text_body:", req.body.textBody);
    // console.log("Attempting to save date_visited:", req.body.dateVisited);
    res.json({ message: 'Travelog and Images saved successfully', travelog_id: newTravelog.travelog_id, newTravelog });

  } catch (error) {
    console.error("Detailed error:", error);
    res.status(500).json({ error: 'Failed to save travelog and/or images.' });
  }
}); 
 

router.get('/api/travelog-entries', async (req, res) => {
  try {
    // Extract user_id from query parameters
    const currentUserId = req.query.userId ? parseInt(req.query.userId) : null;
    let limit = currentUserId ? null : 5; // Limit for non-logged-in users

    // Initialize where condition
    let whereCondition = {
      // isPrivate: false
      is_private: false
    };

    if (currentUserId) {
      // Fetch the IDs of users who have blocked or been blocked by the current user
      const blocks = await Block.findAll({
        where: {
          [Op.or]: [
            { blocker_id: currentUserId },
            { blocked_id: currentUserId }
          ]
        },
        attributes: ['blocker_id', 'blocked_id']
      });

      // Extract IDs of users to be excluded
      const blockedUserIds = blocks.map(block => 
        block.blocker_id === currentUserId ? block.blocked_id : block.blocker_id
      );

      // Update where condition to exclude blocked/blockedBy users
      whereCondition = {
        ...whereCondition,
        user_id: { [Op.notIn]: blockedUserIds }
      };
    }

    // Fetch travelog entries
    const travelogEntries = await Travelog.findAll({
      include: [{
        model: Image,
        as: 'Images',
        limit: 1
      }, {
        model: User,
        attributes: ['username']
      }],
      attributes: ['travelog_id', 'site', 'country', 'latitude', 'longitude', 'title', 'date_visited', 'created_at', 'have_visited', 'category', 'unesco', 'video_game_location', 'film_location'],
      order: [['created_at', 'DESC']],
      where: whereCondition,
      limit
    });

    res.json(travelogEntries);
  } catch (error) {
    console.error("Error fetching travelog entries:", error);
    res.status(500).json({ error: 'Failed to fetch travelog entries.' });
  }
});




// Endpoint to get a single travelog by travelog_id
router.get('/api/travelog/:id', async (req, res) => {
  try {
    // console.log('************ TRAVDET ISSUE REQ.PARAMS: ', req.params)
    const travelog_id = req.params.id;
    const travelog = await Travelog.findOne({ 
      where: { travelog_id: travelog_id },
      include: [
        {
          model: Image,
          as: 'Images',
        },
        {
          model: User,
          attributes: ['username']
        },
        {
          model: Trip,  
          as: 'Trip', 
          attributes: ['title', 'trip_id'],  
        },
      ]
    });
    if (travelog) {
      // console.log('Date Visited:', travelog.dateVisited);
      res.json(travelog);
    } else {
      res.status(404).send('Travelog not found');
    }
  } catch (error) {
    console.error("Error fetching travelog:", error);
    res.status(500).send('Server error');
  }
});

// Patch route for updating text details of a Travelog:
router.patch('/api/travelog/:id', updateLastActive, async (req, res) => {
  try {
      const { user_id } = req.body
      const { id } = req.params;
      const { title, site, country, state, city, address, phoneNumber, dateVisited, longitude, latitude, isPrivate, unesco, have_visited, category, textBody, tripId, film_location, video_game_location } = req.body;

      // Find the travelog by ID
      const travelog = await Travelog.findByPk(id);

      if (!travelog) {
          return res.status(404).json({ error: 'Travelog not found' });
      }

      // Update the travelog
      await travelog.update({
          title,
          site,
          country,
          state,
          city,
          address,
          phoneNumber,
          dateVisited,
          longitude,
          latitude,
          isPrivate,
          unesco,
          have_visited,
          category,
          textBody,
          tripId, 
          film_location, 
          video_game_location
      });
      
      res.json(travelog);
      
  } catch (error) {
      console.error('Error updating travelog:', error);
      res.status(500).json({ error: 'Failed to update travelog' });
  }
});
 

router.patch('/api/travelog/:id/images', updateLastActive, async (req, res) => {
  const { id } = req.params;
  const updatedImages = req.body.images;
  const imageInfo = req.body.imageInfo; // Get imageInfo from the request body
  const user_id = req.body.user_id;

  // console.log('Received updated images:', JSON.stringify(updatedImages, null, 2));
  // console.log('Received imageInfo:', JSON.stringify(imageInfo, null, 2));   

  try {
      await sequelize.transaction(async (t) => {
          for (let i = 0; i < updatedImages.length; i++) {
              const image = updatedImages[i];
              const info = imageInfo[i] || {}; // Get corresponding imageInfo
 
              if (image.image_id) {
                  try {
                      await Image.update(
                          {
                              image_url: image.image_url,
                              title: info.title || null,
                              description: info.description || null,
                          },
                          { where: { image_id: image.image_id }, transaction: t }
                      );
                  } catch (error) {
                      console.error('Error updating image:', error);
                  }
              } else {
                  await Image.create(
                      {
                          travelog_id: id,
                          image_url: image.image_url,
                          title: info.title || null,
                          description: info.description || null,
                      },
                      { transaction: t }
                  );
              }
          }
      });

      const updatedImagesFromDB = await Image.findAll({ where: { travelog_id: id } });
      res.status(200).send({ message: 'Images updated successfully', updatedImages: updatedImagesFromDB });
  } catch (error) {
      console.error('Error updating images:', error);
      res.status(500).send({ message: 'Server error' });
  }
});
 
// Route to delete an image
router.post('/api/travelog/:id/delete-images', updateLastActive, async (req, res) => {
  const { id } = req.params;
  const imageIdsToDelete = req.body.imageIds; // Array of image IDs to delete 

  try {
      await sequelize.transaction(async (t) => {
          // Use the array of image IDs to delete the images
          await Image.destroy({
              where: {
                  image_id: { [Op.in]: imageIdsToDelete }, // Use Op.in to match any of the IDs
                  travelog_id: id
              },
              transaction: t
          });
      });

      res.status(200).send({ message: 'Images deleted successfully' });
  } catch (error) {
      console.error('Error deleting images:', error);
      res.status(500).send({ message: 'Server error' });
  }
});



// Route to Delete Travelog
router.delete('/api/travelog/:travelogId', updateLastActive, async (req, res) => {
  try {
    const user_id = req.query.user_id;
    // console.log('user_id: ', user_id);
    const travelogId = req.params.travelogId; 
    const travelog = await Travelog.findByPk(travelogId);
    if (travelog) {
      await travelog.destroy();  // This will also delete associated images if you have set up cascading deletes
      res.status(200).send({ message: 'Travelog deleted successfully' });
    } else {
      res.status(404).send({ message: 'Travelog not found' });
    }
  } catch (error) {
    console.error('Error deleting travelog:', error);
    res.status(500).send({ message: 'Server error' });
  }
});

// Retrieve travelogs of a given user
router.get('/api/user/:user_id/travelogs', async (req, res) => {
  try {
    const user_id = req.params.user_id;
    const travelogs = await Travelog.findAll({
      where: { user_id },
      include: [{ model: Image, as: 'Images' }]  // Specify the alias here
    });
    res.status(200).send(travelogs);
  } catch (error) {
    console.error('Error fetching user travelogs:', error);
    res.status(500).send({ message: 'Server error' });
  }
}); 

router.get('/api/travelogs/filter', async (req, res) => {
  try {
    const { filterType, user_id } = req.query;
    // console.log('Filter Type:', filterType);
    // console.log('User ID:', userId);

    let travelogs = [];
    
    switch (filterType) {
      case 'yourTravelogs':
        travelogs = await Travelog.findAll({
          where: { user_id },
          include: [{ model: Image, as: 'Images' }]
        });
        break;
      case 'friendsTravelogs': 
        const friendsIds = await getFriendsIds(user_id);
        const filteredFriendsIds = friendsIds.filter(id => id !== parseInt(user_id));  // Exclude current user
        travelogs = await Travelog.findAll({
          where: { userId: { [Op.in]: filteredFriendsIds } },  
          include: [{ model: Image, as: 'Images' },
          { model: User, attributes: ['username'] }
        ]
        });
        break;
      case 'followersTravelogs':
        const followersIds = await getFollowersIds(user_id);
        travelogs = await Travelog.findAll({
          where: { userId: followersIds },
          include: [{ model: Image, as: 'Images' },
          { model: User, attributes: ['username'] }]
        });
        break;
      case 'followingsTravelogs':
        const followingsIds = await getFollowingsIds(user_id);
        travelogs = await Travelog.findAll({
          where: { userId: followingsIds },
          include: [{ model: Image, as: 'Images' },
          { model: User, attributes: ['username'] }]
        });
        break; 
      default:
        throw new Error('Invalid filter type');
    }
    res.status(200).send(travelogs);
    // console.log(travelogs);
  } catch (error) {
    console.error('Error fetching filtered travelogs:', error);
    res.status(500).send({ message: 'Server error' });
  }
});

// Custom long/lat values for UserHub map: 
router.patch('/api/user/:userId/mapCenter', async (req, res) => {
  try {
    const { userId } = req.params;
    const { mapCenter } = req.body;
    const user = await User.findByPk(userId);
    if (user) {
      await user.update({ mapCenter });
      res.json({ success: true, mapCenter });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Checking block status to see if current user has been blocked by travelog author: 
router.get('/api/users/:authorId/block-status/:currentUserId', async (req, res) => {
  // console.log('req.params from block check: ', req.params)
  try {
    const { authorId, currentUserId } = req.params;
    const block = await Block.findOne({
      where: {
        blocker_id: authorId,
        blocked_id: currentUserId,
      },
    });
    res.json({ isBlocked: !!block });
  } catch (error) {
    console.error('Error checking block status:', error);
    res.status(500).send('Server Error');
  }
});
 
// TIP TAP TEST
// Route to patch a travelog entry with traventry data 
router.patch('/update_traventry/:travelogId', updateLastActive, async (req, res) => {
  // console.log('Received content for traventry update:', req.body.traventry);
  const { travelogId } = req.params;
  const { traventry } = req.body;

  try {
    // console.log('POST traventry HERE 2')
    const updatedTravelog = await Travelog.update(
      { traventry },
      { where: { travelog_id: travelogId } }
    );

    if (updatedTravelog) {
      // console.log('POST traventry HERE 3')
      res.json({ message: "Entry updated successfully" });
    } else {
      res.status(404).json({ error: "Travelog not found" });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Endpoint to get traventry data
router.get('/get_traventry/:travelogId', async (req, res) => {
  const { travelogId } = req.params;

  try {
    const travelog = await Travelog.findByPk(travelogId);
    // console.log('TRAVENTRY: ', travelog.traventry)
    if (!travelog) {
      return res.status(404).send({ error: 'Travelog not found' });
    }
    res.json({ traventry: travelog.traventry });
  } catch (error) {
    console.error('Error fetching traventry:', error);
    res.status(500).send({ error: 'Internal server error' });
  }
});


router.post('/api/tip_tap_contents', async (req, res) => {
  try {
    const { content } = req.body; 

    const newContent = await TipTapContent.create({ content });
    res.status(201).json(newContent);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/api/tip_tap_contents/all', async (req, res) => {
  try {
    // Fetch all contents
    const contents = await TipTapContent.findAll();

    res.json(contents);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Endpoint to delete traventry for a specific travelog
router.patch('/delete_traventry/:travelogId', async (req, res) => {
  const { travelogId } = req.params;

  try {
    const updatedTravelog = await Travelog.update(
      { traventry: null },
      { where: { travelog_id: travelogId } }
    );

    if (updatedTravelog[0] > 0) {
      // console.log('Traventry deleted successfully for travelogId:', travelogId);
      res.status(200).json({ message: "Traventry deleted successfully" });
    } else {
      res.status(404).json({ error: "Travelog not found or no changes made" });
    }
  } catch (error) {
    console.error("Error in delete_traventry:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;