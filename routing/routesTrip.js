const express = require('express');
// const { User, Image, Travelog, Comment, Notification, Message, FeedbackReport, Rating, ForbiddenWord, Friendship, Follow, Block, Trip, TipTapContent, Permission, sequelize } = require('../models');  
const { User, Image, Travelog, FeedbackReport, Block, Trip, sequelize } = require('../models');  
const app = express();
app.use(express.json());
const { Op } = require("sequelize");
const router = express.Router();
const updateLastActive = require('../middleware/updateLastActive');
const { getFriendsIds, getFollowersIds, getFollowingsIds } = require('../helperFunctions/helperFunctions');

// POST create trip
router.post('/api/trips', updateLastActive, async (req, res) => {
  // console.log('Received POST request on /api/trips');
  // console.log('Request body:', req.body);

  try {
    // console.log('Attempting to create trip with data:', req.body);
    // Updated to include the new fields
    const tripData = {
      user_id: req.body.user_id, // Make sure this matches the case used by Sequelize model
      username: req.body.username,
      title: req.body.title,
      date_of_departure: req.body.date_of_departure || null, // Handle potentially empty date fields
      date_of_return: req.body.date_of_return || null,
      description: req.body.description, // Renamed from textBody to description to match model
      latitude: req.body.latitude || null, // Default to null if not provided
      longitude: req.body.longitude || null, // Default to null if not provided
      trip_zoom: req.body.trip_zoom,
      tripCenter: req.body.tripCenter,
      image_url: req.body.image_url, // Can be empty string if not provided
      is_private: req.body.is_private, // Can be empty string if not provided
      have_visited: req.body.have_visited, // Can be empty string if not provided
    };
    
    const trip = await Trip.create(tripData);
    // console.log('Trip created successfully:', trip);
    return res.status(201).json(trip);
  } catch (error) {
    console.error('Error during trip creation:', error);
    return res.status(400).json({ error: error.message });
  }
});
 

router.get('/api/trips', async (req, res) => {
  // console.log('Received GET request on /api/trips with user ID:', req.query.user_id);
  
  try {
    const currentUserId = parseInt(req.query.user_id);

    if (!currentUserId) {
      console.error('User ID parameter missing');
      return res.status(400).json({ error: 'User ID parameter missing' });
    } 

    // Fetch IDs of users who have blocked or been blocked by the current user
    const blocks = await Block.findAll({
      where: {
        [Op.or]: [
          { blocker_id: currentUserId },
          { blocked_id: currentUserId }
        ]
      },
      attributes: ['blocker_id', 'blocked_id']
    });

    const blockedUserIds = blocks.map(block => 
      block.blocker_id === currentUserId ? block.blocked_id : block.blocker_id
    );

    const trips = await Trip.findAll({
      attributes: ['trip_id', 'user_id', 'username', 'title', 'image_url', 'latitude', 'longitude', 'have_visited', 'date_of_departure', 'date_of_return', 'created_at'],
      order: [['created_at', 'DESC']],
      where: {
        user_id: { [Op.notIn]: blockedUserIds },
        is_private: false
      }
    });

    // console.log(`Trips found for user ${currentUserId}:`, trips);
    return res.json(trips);
  } catch (error) {
    console.error('Error fetching trips:', error);
    return res.status(500).json({ error: error.message });
  }
});

// GET user-specific trips for mapping with the first image of the earliest travelog 
router.get('/api/trips/:user_id', async (req, res) => {
  const { user_id } = req.params;
  
  try {
    const userTrips = await Trip.findAll({
      where: { user_id: user_id },
      attributes: ['trip_id', 'title', 'date_of_departure', 'date_of_return', 'latitude', 'longitude', 'image_url', 'username', 'is_private', 'have_visited'], 
    });
    console.log('userTrips: ', userTrips);
    
    res.status(200).json(userTrips);
  } catch (error) {
    console.error('Error fetching trips for user:', error);
    res.status(500).json({ message: 'Server error while fetching trips' });
  }
});

// GET a single trip by trip_id
router.get('/api/tripgetnotprivate/:trip_id', async (req, res) => {
  
  try {
    const { trip_id } = req.params; 
    
    // Find the trip where trip_id and user_id match
    const trip = await Trip.findOne({ where: { trip_id: trip_id } });
    

    if (trip.is_private === false) {
      // console.log('TRIPGET HEEEEEEEEEEEEEEEEERE user_id trip_id THIS SHOULD RENDER', trip_id, trip)
      res.status(200).json(trip);
    } else {
      res.status(404).json({ message: 'Trip not found or you do not have access to this trip' });
    }
  } catch (error) {
    console.error('Error fetching trip:', error);
    res.status(500).send('Server error');
  }
});

// GET a single trip by trip_id and user_id
// router.get('/api/tripget/:trip_id', async (req, res) => {
//   try {
//     const { trip_id } = req.params;
//     const user_id = req.query.user_id;

//     const trip = await Trip.findOne({ where: { trip_id: trip_id, user_id: user_id } });

//     if (trip) {
//       res.status(200).json(trip);
//     } else {
//       res.status(404).json({ message: 'Trip not found or you do not have access to this trip' });
//     }
//   } catch (error) {
//     console.error('Error fetching trip:', error);
//     res.status(500).send('Server error');
//   }
// });

router.get('/api/tripget/:trip_id', async (req, res) => {
  try {
    const { trip_id } = req.params;
    const user_id = req.query.user_id;

    console.log(`Fetching trip for author check. Trip ID: ${trip_id}, User ID: ${user_id}`);

    const trip = await Trip.findOne({ where: { trip_id: trip_id, user_id: user_id } });

    if (trip) {
      console.log(`Trip found: ${trip}`);
      res.status(200).json(trip);
    } else {
      console.log(`Trip not found for User ID: ${user_id} and Trip ID: ${trip_id}`);
      res.status(404).json({ message: 'Trip not found or you do not have access to this trip' });
    }
  } catch (error) {
    console.error('Error fetching trip:', error);
    res.status(500).send('Server error');
  }
});


// GET a single trip by trip_id
router.get('/api/tripdet/:trip_id', async (req, res) => {
  const { trip_id } = req.params;

  try {
    const trip = await Trip.findOne({ where: { trip_id: trip_id } });
    if (trip) {
      res.status(200).json(trip);
    } else {
      res.status(404).json({ message: 'Trip not found' });
    }
  } catch (error) {
    console.error('Error fetching trip details:', error);
    res.status(500).json({ message: 'Server error while fetching trip details' });
  }
});

// GET travelogs for a specific trip by trip_id
router.get('/api/travelogs/:trip_id', async (req, res) => {
  const { trip_id } = req.params;

  try {
    const travelogs = await Travelog.findAll({
      where: { trip_id: trip_id },
      include: [{
        model: Image,
        as: 'Images',
        attributes: ['image_id', 'image_url']
      }]
    });

    if (travelogs) {
      res.status(200).json(travelogs);
    } else {
      res.status(404).json({ message: 'No travelogs found for this trip' });
    }
  } catch (error) {
    console.error('Error fetching travelogs for trip:', error);
    res.status(500).json({ message: 'Server error while fetching travelogs for trip' });
  }
});

// GET travelogs with optional trip link filter
router.get('/api/travelogs', async (req, res) => {
  const { user_id, trip_id } = req.query;

  try {
    const travelogs = await Travelog.findAll({
      where: {
        user_id: user_id,
        trip_id: trip_id === 'null' ? null : trip_id
      },
      include: [{
        model: Image,
        as: 'Images', // Make sure 'Images' matches the alias used by Sequelize associations
        attributes: ['image_id', 'image_url']  
      }]
    });
    
    return res.status(200).json(travelogs);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

// PATCH update trip
router.patch('/api/trips/:trip_id', updateLastActive, async (req, res) => { 
  // console.log('Request Params:', req.params);
  // console.log('Request Body:', req.body);
  try {
    const { trip_id } = req.params;
    const updateData = req.body;
    const user_id = req.body.user_id;
    // console.log('88888888888888888 user_id: ', user_id)
    const [updated] = await Trip.update(updateData, { where: { trip_id: trip_id, user_id } });
    if (updated) {
      const updatedTrip = await Trip.findOne({ where: { trip_id: trip_id, user_id } });
      return res.status(200).json(updatedTrip);
    }
    throw new Error('Trip not found');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

// DELETE trip
router.delete('/api/trips/:trip_id', updateLastActive, async (req, res) => {
  try {
    const { trip_id } = req.params;
    const { user_id } = req.query; 
    const trip = await Trip.findOne({ where: { trip_id: trip_id } });
    if (trip) {
      // console.log('trying to delete trip.trip_id: ', trip.trip_id)

      await FeedbackReport.destroy({ where: { reported_trip_id: trip_id } });

      await Travelog.update({ trip_id: null }, { where: { trip_id: trip.trip_id } });
      await trip.destroy();
      return res.status(204).send();
    }
    throw new Error('Trip not found');
  } catch (error) {
    // console.log(error);
    return res.status(400).json({ error: error.message });
  }
});
  
// Route to patch a trip entry with trip data 
router.patch('/update_tripentry/:trip_id', updateLastActive, async (req, res) => {
  // console.log('POST tripentry HERE 1, req.body: ', req.body);
  const { trip_id } = req.params;
  const { tripentry } = req.body;
  const { user_id } = req.body;

  try {
    // console.log('POST tripentry HERE 2')
    const updatedTrip = await Trip.update(
      { tripentry },
      { where: { trip_id: trip_id } }
    );

    if (updatedTrip) {
      // console.log('POST tripentry HERE 3')
      res.json({ message: "Entry updated successfully" });
    } else {
      res.status(404).json({ error: "Trip not found" });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Endpoint to get trip data
router.get('/get_tripentry/:trip_id', async (req, res) => {
  const { trip_id } = req.params;

  try {
    const trip = await Trip.findByPk(trip_id);
    // console.log('TRIPENTRY: ', trip.tripentry)
    if (!trip) {
      return res.status(404).send({ error: 'Trip not found' });
    }
    res.json({ tripentry: trip.tripentry });
  } catch (error) {
    console.error('Error fetching tripentry:', error);
    res.status(500).send({ error: 'Internal server error' });
  }
});

router.get('/api/trips/sorting/filter', async (req, res) => {
  try {
    const { filterType, user_id } = req.query;

    let trips = [];
    
    switch (filterType) {
      case 'yourTrips':
        trips = await Trip.findAll({
          where: { user_id: user_id },
          include: [{ model: User, as: 'User', attributes: ['username'] }]
        });
        break;
      case 'friendsTrips': 
        const friendsIds = await getFriendsIds(user_id);
        trips = await Trip.findAll({
          where: { user_id: { [Op.in]: friendsIds } },
          include: [{ model: User, as: 'User', attributes: ['username'] }]
        });
        break;
      case 'followersTrips':
        const followersIds = await getFollowersIds(user_id);
        trips = await Trip.findAll({
          where: { user_id: followersIds },
          include: [{ model: User, as: 'User', attributes: ['username'] }]
        });
        break;
      case 'followingsTrips':
        const followingsIds = await getFollowingsIds(user_id);
        trips = await Trip.findAll({
          where: { user_id: followingsIds },
          include: [{ model: User, as: 'User', attributes: ['username'] }]
        });
        break;
      default:
        throw new Error('Invalid filter type');
    }
    // console.log('/////////////FILTERED TRIPS: ', trips)
    res.status(200).send(trips);
  } catch (error) {
    console.error('Error fetching filtered trips:', error);
    res.status(500).send({ message: 'Server error' });
  }
});

// Endpoint to delete tripentry for a specific trip
router.patch('/delete_tripentry/:trip_id', updateLastActive, async (req, res) => {
  const { trip_id } = req.params;

  try {
    const updatedTrip = await Trip.update(
      { tripentry: null },
      { where: { trip_id: trip_id } }
    );

    if (updatedTrip[0] > 0) {
      // console.log('Tripentry deleted successfully for trip_id:', trip_id);
      res.status(200).json({ message: "Tripentry deleted successfully" });
    } else {
      res.status(404).json({ error: "Trip not found or no changes made" });
    }
  } catch (error) {
    console.error("Error in delete_tripentry:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});



module.exports = router;

