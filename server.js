process.env.DEBUG = 'socket.io*';

// Import the required modules
const express = require('express');
const cors = require('cors'); // Import the CORS middleware 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const scheduledJobs = require('./scheduledJobs');

const { sequelize } = require('./models');
 
const bodyParser = require('body-parser');

const { Op } = require('sequelize');

// env variables 
const jwtSecret = process.env.JWT_SECRET; 
const emailUser = process.env.EMAIL_USER;
const emailPassword = process.env.EMAIL_PASSWORD; 
const adminKey = process.env.ADMIN_KEY;
// const apiKey = 'eit4xzF_srAoQvKkrYZx7ffANGVLGd0zdZjYufIxS-W5VUxpWvURPoQQgY8tL7SiZGm-KsxlmgNlwx0Dnaoa8LD_DNX25jWWsbAab-7QQlf8QTQVxE-bN1EbhLYCZXYx'; 
const apiKey = process.env.API_KEY;


const http = require('http');
const socketIo = require('socket.io');
  
// Create an Express application
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
      origin: "http://localhost:3000",  // allowing connections from your frontend
      methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('New client connected'); 
  // Assume userId is passed as a query parameter in the socket connection request
  const userId = socket.handshake.query.userId;
  console.log('socket.handshake.query.userId: ', userId)
  if (userId) {
    
    socket.join(userId);
    // console.log(socket, ' joined by userId: ', userId)
    // console.log('Rooms:', socket.adapter.rooms);
    // console.log('Socket.rooms: ', socket.rooms);
    console.log('Rooms:', io.sockets.adapter.rooms);
  }

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    if (userId) {
      socket.leave(userId);
    }
  });
});

app.use(bodyParser.json()); 

// Models: 
const { User, Image, Interaction, Travelog, Comment, Notification, Message, FeedbackReport, Rating, ForbiddenWord, Friendship, Follow, Block} = require('./models');

// Routes: 

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

app.use((req, res, next) => {
  console.log(`Received ${req.method} request on ${req.url}`);
  next();
});

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

app.post('/register', async (req, res) => {
  const {
    firstName,
    lastName,
    username,
    email,
    password,
    retypedPassword,
    adminKey,
    securityQuestion,
    answer,
    avatar,
    bio
  } = req.body;
  console.log(req.body);
  if (password !== retypedPassword) {
    return res.status(400).send({ error: 'Passwords do not match' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const isAdmin = adminKey === process.env.ADMIN_KEY;
  const avatarUrl = req.body.avatar || 'https://live.staticflickr.com/3557/3449041959_1bd9b05ac8_c.jpg';

  if (adminKey && adminKey !== process.env.ADMIN_KEY) {
    return res.status(400).send({ error: 'Invalid Admin Key' });
  }

  try {
    await User.create({
      firstName,
      lastName,
      username,
      email,
      password: hashedPassword,
      isAdmin,
      securityQuestion,
      answer,
      avatar: avatarUrl,
      bio
    });
    res.send('Registration successful');
  } catch (error) {
    console.error(error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      // A unique constraint violation occurred, which likely means the username is already taken
      return res.status(400).send({ error: 'Username exists' });
    }
    res.status(500).send({ error: 'Server error' });
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

    const token = jwt.sign({ userId: user.user_id, isAdmin: user.isAdmin }, jwtSecret); 
    res.send({ token, user });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

/// GET current user:
app.get('/user', async (req, res) => {
  console.log('Headers:', req.headers, ' jwtSecret: ', jwtSecret);
  
  const tokenWithBearer = req.headers.authorization;  // This will include 'Bearer '

  // Checking if the authorization header exists and starts with 'Bearer '
  if (!tokenWithBearer || !tokenWithBearer.startsWith('Bearer ')) {
    return res.status(403).send('Authorization required');
  }

  // Extracting the actual token part from the authorization header
  const actualToken = tokenWithBearer.split(' ')[1];
  console.log('actualToken: ', jwt.decode(actualToken));

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

// Get a user's public facing profile from Home.js log entries
app.get('/api/users/:username', (req, res) => {
  const { username } = req.params;
  // Assume getUserByUsername is a function that fetches a user by username
  getUserByUsername(username)
    .then(user => res.json(user))
    .catch(error => res.status(500).send({ error: 'Server error' }));
});

const axios = require('axios');

app.get('/yelp-search', async (req, res) => {
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

// Posting a travelog 
app.post('/api/travelog', async (req, res) => {
  console.log("Received request on /api/travelog");
  console.log("Request body:", req.body);
  
  try {
    // Save the Travelog data
    // const travelog = await Travelog.create(req.body);

    const { user_id, ...otherData } = req.body;
    const newTravelog = await Travelog.create({
        user_id,
        ...otherData
    });

    console.log('Newly created Travelog:', newTravelog);
    // If images are included, save them as well
    if (req.body.imageUrls && req.body.imageUrls.length) {
      const imagesData = req.body.imageUrls.map(url => {
        return { travelog_id: newTravelog.travelogId, image_url: url }; // Assuming your Travelog model returns an 'id' field
      });
      console.log('Images Data to Insert:', imagesData);
      await Image.bulkCreate(imagesData);  // Sequelize has a 'bulkCreate' method
    }
    console.log("Attempting to save text_body:", req.body.textBody);
    console.log("Attempting to save date_visited:", req.body.dateVisited);
    res.json({ message: 'Travelog and Images saved successfully', travelog_id: newTravelog.travelog_id, newTravelog });

  } catch (error) {
    console.error("Detailed error:", error);
    res.status(500).json({ error: 'Failed to save travelog and/or images.' });
  }
});

// Get travelogs for mapping including reported:
app.get('/api/travelog-entries', async (req, res) => {
  try {
      // Fetch the travelog entries with the associated first image and user details
      const travelogEntries = await Travelog.findAll({
          include: [{
              model: Image,
              as: 'Images',
              limit: 1, // Limit to the first image
          }, {
              model: User,
              attributes: ['username'] // Only fetch these attributes from the user
          }],
          attributes: ['travelog_id', 'site', 'country', 'latitude', 'longitude', 'title', 'date_visited', 'reported', 'created_at'], // Added latitude and longitude
          order: [['date_visited', 'DESC']],
          where: {
              reported: false, // Only fetch entries that are not reported
              isPrivate: false
          }
      });

      console.log('travelogEntries: ', travelogEntries)

      // Return the travelog entries as JSON
      res.json(travelogEntries);
  } catch (error) {
      console.error("Error fetching travelog entries:", error);
      res.status(500).json({ error: 'Failed to fetch travelog entries.' });
  }
});

// Endpoint to get a single travelog by travelog_id
app.get('/api/travelog/:id', async (req, res) => {
  try {
    const travelogId = req.params.id;
    const travelog = await Travelog.findOne({
      // where: { travelog_id: travelogId, reported: false },
      where: { travelog_id: travelogId },
      include: [
        {
          model: Image,
          as: 'Images',
        },
        {
          model: User,
          attributes: ['username']
        }
      ]
    });
    if (travelog) {
      console.log('Date Visited:', travelog.dateVisited);
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
app.patch('/api/travelog/:id', async (req, res) => {
  try {
      const { id } = req.params;
      const { title, site, country, state, city, address, phoneNumber, dateVisited, longitude, latitude, isPrivate, textBody } = req.body;

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
          textBody
      });
      
      res.json(travelog);
      
  } catch (error) {
      console.error('Error updating travelog:', error);
      res.status(500).json({ error: 'Failed to update travelog' });
  }
});

// Route logic for editing / adding / deleting images: 
app.patch('/api/travelog/:id/images', async (req, res) => {
  const { id } = req.params;
  const updatedImages = req.body.images;  // Assume images is an array of image objects

  console.log('Received updated images:', JSON.stringify(updatedImages, null, 2));  // Add this line

  try {
    // Start a transaction to ensure all operations are atomic
    await sequelize.transaction(async (t) => {
      for (const image of updatedImages) {
        if (image.delete) {
          // If the image is marked for deletion
          await Image.destroy({ where: { image_id: image.image_id }, transaction: t });
        } else if (image.image_id) {
          // If the image has an id, it's an update
          // await Image.update({ image_url: image.url }, { where: { id: image.id }, transaction: t });
          console.log(`Updating image ID: ${image.image_id}, URL: ${image.image_url}`);
          try {
            console.log('Image object:', image);
            console.log('Image ID:', image.id);
            await Image.update({ image_url: image.image_url }, { where: { image_id: image.image_id }, transaction: t });
          } catch (error) {
            console.error('Error updating image:', error);
          }

        } else {
          // If the image doesn't have an id, it's a new image
          // await Image.create({ travelog_id: id, image_url: image.url }, { transaction: t });
          await Image.create({ travelog_id: id, image_url: image.image_url }, { transaction: t });

        }
      }
    });

    res.status(200).send({ message: 'Images updated successfully' });
  } catch (error) {
    console.error('Error updating images:', error);
    res.status(500).send({ message: 'Server error' });
  }
});

// Route to Delete Travelog
app.delete('/api/travelog/:travelogId', async (req, res) => {
  try {
    const travelogId = req.params.travelogId;
    // Assuming you have a Travelog model with a related Images model
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

app.get('/api/reported-travelogs', async (req, res) => {
  try {
    const reportedTravelogs = await Travelog.findAll({
      include: [{
          model: Image,
          as: 'Images',
          limit: 1, // Limit to the first image
      }, {
          model: User,
          attributes: ['username'] // Only fetch these attributes from the user
      }],
      attributes: ['travelog_id', 'site', 'city', 'country', 'latitude', 'longitude', 'title', 'date_visited', 'reported'], // Added latitude and longitude
      order: [['date_visited', 'DESC']],
      where: {
        reported: true
      }
    });
    res.json(reportedTravelogs);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Endpoint for reporting a travelog 
app.patch('/api/travelog/:travelogId/report', async (req, res) => {
  try {
    const travelogId = req.params.travelogId;
    const { reported } = req.body;

    const travelog = await Travelog.findByPk(travelogId);
    if (travelog) {
      await travelog.update({ reported });
      res.status(200).send({ message: 'Travelog reported successfully' });
    } else {
      res.status(404).send({ message: 'Travelog not found' });
    }
  } catch (error) {
    console.error('Error reporting travelog:', error);
    res.status(500).send({ message: 'Server error' });
  }
});

// Retrieve travelogs of current user
app.get('/api/user/:userId/travelogs', async (req, res) => {
  try {
    const userId = req.params.userId;
    const travelogs = await Travelog.findAll({
      where: { userId },
      include: [{ model: Image, as: 'Images' }]  // Specify the alias here
    });
    res.status(200).send(travelogs);
  } catch (error) {
    console.error('Error fetching user travelogs:', error);
    res.status(500).send({ message: 'Server error' });
  }
});

// Geting ids of all friends:


// Retrieve filtered travelogs for userhub:
// app.get('/api/travelogs/filter', async (req, res) => {

//   try {
//   const { filterType, userId } = req.query;

//   console.log('Filter Type:', filterType);
//   console.log('User ID:', userId);

//   let travelogs = [];
  
//   switch (filterType) {
//     case 'yourTravelogs':
//       travelogs = await Travelog.findAll({
//         where: { userId },
//         include: [{ model: Image, as: 'Images' }]
//       });
//       break;
//     case 'friendsTravelogs': 
//       const friendsIds = await getFriendsIds(userId);
//       travelogs = await Travelog.findAll({
//         where: { userId: friendsIds },
//         include: [{ model: Image, as: 'Images' },
//         { model: User, attributes: ['username'] }
//       ]
//       });
//       break;
//     // ... handle other filter types similarly
//     default:
//       throw new Error('Invalid filter type');
//   }
//     res.status(200).send(travelogs);
// } catch (error) {
//   console.error('Error fetching filtered travelogs:', error);
//   res.status(500).send({ message: 'Server error' });
// }
// });

// Helper functions to get friends, followers, followings, and friends IDs
const getFriendsIds = async (userId) => {
  try {
    const friendships = await Friendship.findAll({
      where: {
        [Op.or]: [{ user1: userId }, { user2: userId }],
        accepted: true  // Assuming 'accepted' is a boolean column; adjust if it's a string
      },
      attributes: ['user1', 'user2']
    });
    const friendIds = friendships.map(friendship => {
      // return friendship.user1 === userId ? friendship.user2 : friendship.user1;
      return friendship.user1 === parseInt(userId, 10) ? friendship.user2 : friendship.user1;

    });
    return friendIds;
  } catch (error) {
    console.error('Error fetching friend IDs:', error);
    throw error;  // Propagate error to be handled by the calling function
  }
};

const getFollowersIds = async (userId) => {
  const followers = await Follow.findAll({ where: { followee_id: userId } });
  return followers.map(follow => follow.follower_id);
};

const getFollowingsIds = async (userId) => {
  const followings = await Follow.findAll({ where: { follower_id: userId } });
  return followings.map(follow => follow.followee_id);
};

app.get('/api/travelogs/filter', async (req, res) => {
  try {
    const { filterType, userId } = req.query;
    console.log('Filter Type:', filterType);
    console.log('User ID:', userId);

    let travelogs = [];
    
    switch (filterType) {
      case 'yourTravelogs':
        travelogs = await Travelog.findAll({
          where: { userId },
          include: [{ model: Image, as: 'Images' }]
        });
        break;
      case 'friendsTravelogs': 
        const friendsIds = await getFriendsIds(userId);
        const filteredFriendsIds = friendsIds.filter(id => id !== parseInt(userId));  // Exclude current user
        travelogs = await Travelog.findAll({
          where: { userId: { [Op.in]: filteredFriendsIds } },  // Using Sequelize's Op.in operator
          include: [{ model: Image, as: 'Images' },
          { model: User, attributes: ['username'] }
        ]
        });
        break;
      case 'followersTravelogs':
        const followersIds = await getFollowersIds(userId);
        travelogs = await Travelog.findAll({
          where: { userId: followersIds },
          include: [{ model: Image, as: 'Images' },
          { model: User, attributes: ['username'] }]
        });
        break;
      case 'followingsTravelogs':
        const followingsIds = await getFollowingsIds(userId);
        travelogs = await Travelog.findAll({
          where: { userId: followingsIds },
          include: [{ model: Image, as: 'Images' },
          { model: User, attributes: ['username'] }]
        });
        break;
      // ... handle other filter types similarly
      default:
        throw new Error('Invalid filter type');
    }
    res.status(200).send(travelogs);
    console.log(travelogs);
  } catch (error) {
    console.error('Error fetching filtered travelogs:', error);
    res.status(500).send({ message: 'Server error' });
  }
});





// Fetching Profile For Editing User Details
app.get('/api/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findByPk(userId);
    res.status(200).send(user);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).send({ message: 'Server error' });
  }
});

// Deleting a User, their travelogs and images. 
app.delete('/api/user/:userId', async (req, res) => {
  console.log('req.params: ', req.params)
  try {
    const userId = req.params.userId;
    await User.destroy({ where: { user_id: userId } });
    res.status(200).send({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).send({ message: 'Server error' });
  }
});
 
// Updating User Details
app.patch('/api/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { firstName, lastName, email, securityQuestion, answer, adminKey, avatar, bio } = req.body;
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).send('User not found');
    }

    const isAdmin = adminKey === process.env.ADMIN_KEY;

    if (adminKey && adminKey !== process.env.ADMIN_KEY) {
      return res.status(400).send('Invalid Admin Key');
    }

    await user.update({
      firstName,
      lastName,
      email,
      securityQuestion,
      answer,
      isAdmin,
      avatar,
      bio
    });

    // res.send('User details updated successfully');
    res.json({
      firstName,
      lastName,
      email,
      securityQuestion,
      answer,
      isAdmin,
      avatar,
      bio
    });
  } catch (error) {
    console.error('Error updating user details:', error);
    res.status(500).send('Server error');
  }
});

// Changing a password
app.patch('/api/user/:userId/password', async (req, res) => {
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

// Handle Befriending 
app.post('/api/friends/request', async (req, res) => {
  const { requester, requestee } = req.body;
  
  // Get the username of the requester
  const requesterUser = await User.findOne({
    where: {
      user_id: requester
    }
  });
  const requesterUsername = requesterUser.username;

  // Create a new row in the Friendship table
  const friendship = await Friendship.create({
    user1: requester,
    user2: requestee,
    accepted: false,
    denied: false,
  });

  const notification = await Notification.create({
    recipient_id: requestee,
    sender_id: requester,
    type: 'friend-request',
    content: JSON.stringify({
        text: 'has sent you a friend request',
        username: requesterUsername,
        url: `/public_profile/${requesterUsername}`
    }),
    expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 1))
  });

  console.log('Attempting to notify requestee: ', requestee); 

  io.to(requestee.toString()).emit('new-notification', notification);

//   io.to(requestee.toString()).emit('new-notification', notification, (acknowledgmentData) => {
//     if (acknowledgmentData.error) {
//         console.error('Client reported an error:', acknowledgmentData.error);
//     } else {
//         console.log('Acknowledgment received:', acknowledgmentData);
//     }
// }
// );

  console.log(notification, 'successfully emitted to: ', requestee);

  res.json({ success: true });
});

//Handle deleting a friend request
app.delete('/api/friends/request', async (req, res) => {
  const { requester, requestee } = req.body;

  try {
    // Begin a transaction
    const transaction = await sequelize.transaction();

    // Delete the friendship
    await Friendship.destroy({
      where: {
        [Op.or]: [
          { user1: requester, user2: requestee },
          { user1: requestee, user2: requester }
        ]
      },
      transaction
    });

    // Obtain the notificationId before deletion
    const notification = await Notification.findOne({
      where: {
        type: 'friend-request',
        [Op.and]: [
          {
            [Op.or]: [
              { sender_id: requester, recipient_id: requestee },
              { sender_id: requestee, recipient_id: requester }
            ]
          }
        ]
      },
      transaction
    });
    const notificationId = notification ? notification.notificationId : null;

    // Delete the associated notification
    await Notification.destroy({
      where: {
        type: 'friend-request',
        [Op.and]: [
          {
            [Op.or]: [
              { sender_id: requester, recipient_id: requestee },
              { sender_id: requestee, recipient_id: requester }
            ]
          }
        ]
      },
      transaction
    });

    // Emit the notification-deleted event to both the requester and requestee
    if (notificationId) {
      io.to(requester.toString()).emit('notification-deleted', { notificationId });
      io.to(requestee.toString()).emit('notification-deleted', { notificationId });
    }

    // Commit the transaction
    await transaction.commit();

    res.json({ success: true });
  } catch (error) {
    // Rollback the transaction if any errors occur
    await transaction.rollback();  // Corrected method for rolling back the transaction

    console.error('Error canceling friendship request:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Handle unfriending a friend:
app.delete('/api/friends/unfriend', async (req, res) => {
  const { user1, user2 } = req.body;

  try {
    // Begin a transaction
    const transaction = await sequelize.transaction();

    // Delete the friendship
    await Friendship.destroy({
      where: {
        [Op.or]: [
          { user1, user2 },
          { user1: user2, user2: user1 }
        ]
      },
      transaction
    });

    console.log('user1:', user1, 'user2:', user2);
    // Emit the unfriend event to both users
    io.to(user1.toString()).emit('unfriend', { user2 });
    console.log('unfriend event emitted to user1:', user1);
    io.to(user2.toString()).emit('unfriend', { user1 });
    console.log('unfriend event emitted to user2:', user2);
    

    // Commit the transaction
    await transaction.commit();

    res.json({ success: true });
  } catch (error) {
    // Rollback the transaction if any errors occur
    await transaction.rollback();

    console.error('Error unfriending user:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});


// Fetching Friendship Status  
app.get('/api/friends/status/:user1/:user2', async (req, res) => {
  console.log('Yes, undefined would be correct')
  const { user1, user2 } = req.params;
  
  const friendship = await Friendship.findOne({
    where: {
      [Op.or]: [{ user1, user2 }, { user1: user2, user2: user1 }]
    }
  });
  
  if (friendship) {
    res.json(friendship);
  } else {
    res.json({ status: 'no-record' });
  }
});

// Get all notifications for a specific user
app.get('/api/notifications/:userId', async (req, res) => {
  console.log('Received GET request on /api/notifications/' + req.params.userId);
  const { userId } = req.params;
  try {
    const notifications = await Notification.findAll({
      where: {
        recipient_id: userId,  // Updated column name
        dismissed: false,  // Updated column name
      },
      include: [
        { model: User, as: 'Sender', attributes: ['username'] },
        { model: User, as: 'Recipient', attributes: ['username'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(notifications);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});
 
// Deny a friend request 
app.post('/api/friends/request/deny', async (req, res) => {
  const { sender_id, recipient_id, notificationId } = req.body;

  try {
    // Start a transaction to ensure both updates are successful
    await sequelize.transaction(async (t) => {
      // Update the friendship status
      await Friendship.update(
        { denied: true },
        { where: { user1: sender_id, user2: recipient_id }, transaction: t }
      );
      
      // Update the notification status
      await Notification.update(
        { dismissed: true },
        { where: { notification_id: notificationId }, transaction: t }
      );
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error denying friend request:', error);
    res.status(500).send('Server Error');
  }
});

// Function to fetch user by user_id so accepting friend request can structure notifications properly:
async function getUserById(user_id) {
  try {
    const user = await User.findOne({
      where: { user_id: user_id },
      attributes: ['username']  // Only select the username attribute
    });
    return user;
  } catch (error) {
    console.error(error);
    throw new Error('Database error');
  }
}

// Accept a friend request from notification
app.post('/api/friends/request/accept', async (req, res) => {
  const { sender_id, recipient_id, notificationId } = req.body;
  
  try {
    // Start a transaction
    const t = await sequelize.transaction();

    // Fetch the recipient's username
    const recipient = await getUserById(recipient_id);

    if (!recipient) {
      await t.rollback();
      return res.status(404).json({ error: 'Recipient not found' });
    }

    const recipientUsername = recipient.username;

    // Update the friendship status
    await Friendship.update(
      { accepted: true },
      { where: { user1: sender_id, user2: recipient_id }, transaction: t }
    );

    // Dismiss the old notification
    await Notification.update(
      { dismissed: true },
      { where: { notification_id: notificationId }, transaction: t }
    );

    // await Notification.create({
    const notification = await Notification.create({
      sender_id: recipient_id,
      recipient_id: sender_id,
      type: 'friend-request-accepted',
      content: JSON.stringify({
        username: recipientUsername,
        text: 'has accepted your friend request.',
        url: `/public_profile/${recipientUsername}`
      }), 
      expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 1))
    }, { transaction: t });

    console.log('Emitting notification to sender_id:', sender_id);
    io.to(sender_id.toString()).emit('new-notification', notification);
    console.log('Notification emitted');

    // Commit the transaction
    await t.commit();

    res.json({ success: true });
  } catch (error) {
    // Rollback the transaction in case of an error
    await t.rollback();
    console.error('Error accepting friend request:', error);
    res.status(500).send('Server Error');
  }
});

// Accept a denied friend request from notification
app.post('/api/friends/request/undenied', async (req, res) => {
  let t;  
  try {
    // Start a transaction
    t = await sequelize.transaction();
    
    const { sender_id, recipient_id } = req.body;
    
    // Fetch the recipient's username
    const recipient = await getUserById(recipient_id);

    if (!recipient) {
      await t.rollback();
      return res.status(404).json({ error: 'Recipient not found' });
    }

    const recipientUsername = recipient.username;
    
    // Update the friendship status to accepted
    await Friendship.update(
      { accepted: true, denied: false },
      { where: { user1: sender_id, user2: recipient_id }, transaction: t }
    );
    
    // Create a new notification for the acceptance
    const notification = await Notification.create({
      sender_id: recipient_id,
      recipient_id: sender_id,
      type: 'friend-request-accepted',
      content: JSON.stringify({
        username: recipientUsername,
        text: 'has accepted your friend request.',
        url: `/public_profile/${recipientUsername}`
      }), 
      expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 1))
    }, { transaction: t });

    console.log('Emitting notification to sender_id:', sender_id);
    io.to(sender_id.toString()).emit('new-notification', notification);
    console.log('Notification emitted');
    
    await t.commit();  // Commit the transaction
    res.json({ success: true });
  } catch (error) {
    if (t) {
      await t.rollback();  // Rollback the transaction if it exists
    }
    console.error('Error accepting friend request:', error);
    res.status(500).send('Server Error');
  }
});

// Dismiss a denied friend request 
app.post('/api/friends/request/dismiss', async (req, res) => {
  const { friendshipId } = req.body;
  try {
    // Update the 'dismissed' field for the specified friendship
    await Friendship.update(
      { dismissed: true },
      { where: { friendshipId: friendshipId } }
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error dismissing friend request:', error);
    res.status(500).send('Server Error');
  }
});

// Handle Follows:
app.post('/api/follow', async (req, res) => {
  const { follower_id, followee_id } = req.body;
  
  try {
      // Create a new follow relationship
      const newFollow = await Follow.create({ follower_id, followee_id });

      // Get the follower's username for the notification message
      const follower = await User.findByPk(follower_id);
      const followerUsername = follower ? follower.username : 'Someone';

      // Create a new notification in the database
      const notification = await Notification.create({
        sender_id: follower_id,
        recipient_id: followee_id,
        type: 'new-follow',
        content: JSON.stringify({
          username: followerUsername,
          text: 'has followed you.',
          url: `/public_profile/${followerUsername}`
        }), 
        expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 1))
      });

      console.log('Notification created:', notification);

      // Emit the notification to the followee
      io.to(followee_id.toString()).emit('new-notification', notification);

      res.json({ success: true });
  } catch (error) {
      console.error('Error creating follow relationship:', error);
      res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get notification id for depopulating 
async function getNotificationId(follower_id, followee_id, transaction) {
  try {
    const notification = await Notification.findOne({
      where: {
        sender_id: follower_id,
        recipient_id: followee_id,
        type: 'new-follow'
      },
      transaction: transaction
    });
    return notification ? notification.notificationId : null;
  } catch (error) {
    console.error('Error fetching notification id:', error);
    throw error;  // or handle error as appropriate
  }
}

// Handle Unfollows:
app.delete('/api/unfollow', async (req, res) => {
  const { follower_id, followee_id } = req.body;

  try {
    // Start a transaction
    const t = await sequelize.transaction();

    // Get the notification_id using the helper function
    const notificationId = await getNotificationId(follower_id, followee_id, t);
    console.log('follower_id: ', follower_id, 'followee_id: ', followee_id, 'notificationId: ', notificationId);

    // Delete the follow relationship
    const deletedRows = await Follow.destroy({
      where: {
        follower_id: follower_id,
        followee_id: followee_id
      },
      transaction: t  // Include transaction
    });

    if (deletedRows === 0) {
      // No rows were deleted, the follow relationship may not have existed
      await t.rollback();  // Rollback transaction
      return res.status(404).json({ success: false, error: 'Follow relationship not found' });
    }

    // Delete the corresponding notification from the database
    const deletedNotificationRows = await Notification.destroy({
      where: {
        sender_id: follower_id,
        recipient_id: followee_id,
        type: 'new-follow'  // Adjust the 'type' value to match your setup
      },
      transaction: t  // Include transaction
    });

    // Check if a notification was deleted
    if (deletedNotificationRows === 0) {
      console.warn('No follow notification found to delete');
    }

    // Emit an event to the followee to depopulate the 'Follow' notification
    io.to(followee_id.toString()).emit('remove-follow-notification', { notificationId });

    // Commit the transaction
    await t.commit();

    // Respond to the client indicating the action was successful
    res.json({ success: true });
  } catch (error) {
    // Rollback the transaction in case of an error
    await t.rollback();
    console.error('Error unfollowing user:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Block a user: 
app.post('/api/block', async (req, res) => {
  const { blocker_id, blocked_id } = req.body;
  try {
    await Block.create({ blocker_id, blocked_id });
    res.json({ success: true });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Retrive friends list:
app.get('/api/friends/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  // const userId = req.params.userId;  

  try {
    // Fetch friends relationships where the current user is involved
    const friendsRelations = await Friendship.findAll({
      where: {
        [Op.or]: [
          { user1: userId },
          { user2: userId }
        ],
        accepted: true  // Only fetch accepted friend requests
      },
      include: [
        { model: User, as: 'Requester', attributes: ['user_id', 'username', 'avatar'] },
        { model: User, as: 'Requestee', attributes: ['user_id', 'username', 'avatar'] }
      ]
    });

    console.log(friendsRelations);  // Log the fetched data

    // Transform data to get a list of friend user objects
    const friendsList = friendsRelations.map(relation => {
      // Determine which user is the friend (i.e., not the current user)
      if (relation.Requester && relation.Requester.user_id !== userId) {
        return relation.Requester;
      } else if (relation.Requestee && relation.Requestee.user_id !== userId) {
        return relation.Requestee;
      }
    });
    
    res.json(friendsList);
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Retrieve followers list:
app.get('/api/followers/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);

  try {
    const followersRelations = await Follow.findAll({
      where: {
        followee_id: userId
      },
      include: [
        { model: User, as: 'Follower', attributes: ['user_id', 'username', 'avatar'] }
      ]
    });

    console.log(followersRelations);  // Log the fetched data

    // Transform data to get a list of follower user objects
    const followersList = followersRelations.map(relation => relation.Follower);
    
    res.json(followersList);
  } catch (error) {
    console.error('Error fetching followers:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Retrieve followings list:
app.get('/api/followings/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);

  try {
    const followingsRelations = await Follow.findAll({
      where: {
        follower_id: userId
      },
      include: [
        { model: User, as: 'Followee', attributes: ['user_id', 'username', 'avatar'] }
      ]
    });

    console.log(followingsRelations);  // Log the fetched data

    // Transform data to get a list of followee user objects
    const followingsList = followingsRelations.map(relation => relation.Followee);
    
    res.json(followingsList);
  } catch (error) {
    console.error('Error fetching followings:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Disconnections - get all denied users:  
// app.get('/api/user/:userId/denied-requests', async (req, res) => {
//   const { userId } = req.params;
//   try {
//     const deniedRequests = await Friendship.findAll({
//       where: {
//         user2: userId,  // Specify that user2 is the requestee who denied the request
//         denied: true
//       },
//       include: [{ model: User, as: 'Requester' }]  // Only include the Requester model
//     });
//     res.json(deniedRequests);
//   } catch (error) {
//     console.error(error);
//     res.status(500).send('Server Error');
//   }
// });

// Disconnections - get all denied / non-dismissed users:  
app.get('/api/user/:userId/denied-requests', async (req, res) => {
  const { userId } = req.params;
  try {
    const deniedRequests = await Friendship.findAll({
      where: {
        [Op.or]: [{ user1: userId }, { user2: userId }],
        denied: true,
        dismissed: false  // <-- Add this line to exclude dismissed requests
      },
      include: [{ model: User, as: 'Requester' }, { model: User, as: 'Requestee' }]
    });
    res.json(deniedRequests);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
}); 

// Disconnections - get all blocked users:  
app.get('/api/user/:userId/blocked-users', async (req, res) => {
  const { userId } = req.params;
  try {
    const blockedUsers = await User.findAll({
      include: {
        model: Block,
        as: 'blocksReceived',  // Specify the alias of the association you want to include
        where: { blocker_id: userId },
      },
    });
    res.json(blockedUsers);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Unblock a user  
app.delete('/api/block/:blockId', async (req, res) => {
  const { blockId } = req.params;
  try {
    const block = await Block.findOne({ where: { blockId } });
    if (!block) {
      return res.status(404).send('Block not found');
    }
    await block.destroy();
    res.send('Block deleted successfully');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Checking block status between two users
// app.get('/api/users/:profileUser/block-status/:currentUser', async (req, res) => {
//   console.log('Running block check.')
//   const { profileUser, currentUser } = req.params;

//   try {
//     const profileUserData = await User.findOne({ where: { username: profileUser } });
//     const currentUserData = await User.findOne({ where: { username: currentUser } });

//     if (!profileUserData || !currentUserData) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     const blockStatus = await Block.findOne({
//       where: {
//         blocker_id: profileUserData.user_id,
//         blocked_id: currentUserData.user_id
//       }
//     });

//     console.log('profileUserData:', profileUserData);
//     console.log('currentUserData:', currentUserData);
//     console.log('blockStatus:', blockStatus);

//     res.json({ isBlocked: !!blockStatus });
//   } catch (error) {
//     console.error(error);
//     res.status(500).send('Server Error');
//   }
// });

// Fetching Block Status: 
app.get('/api/users/:profileUser/block-status/:currentUser', async (req, res) => {
  const { profileUser, currentUser } = req.params;

  try {
    const profileUserData = await User.findOne({ where: { username: profileUser } });
    const currentUserData = await User.findOne({ where: { username: currentUser } });

    if (!profileUserData || !currentUserData) {
      return res.status(404).json({ error: 'User not found' });
    }

    const blockStatus = await Block.findOne({
      where: {
        [Op.or]: [
          { blocker_id: profileUserData.user_id, blocked_id: currentUserData.user_id },
          { blocker_id: currentUserData.user_id, blocked_id: profileUserData.user_id }
        ]
      }
    });

    res.json({ isBlocked: !!blockStatus });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

// Commenting on travelog or other comment
app.post('/api/comment', async (req, res) => {
  const { travelog_id, parent_id, user_id, content } = req.body;

  try {
    if (!travelog_id && !parent_id) {
      throw new Error('Either travelog_id or parent_id must be provided');
    }

    try {
      // Fetch the travelog to get the user ID of the travelog author
      const travelog = await Travelog.findByPk(travelog_id);
      if (!travelog || !travelog.user_id) {
        throw new Error(`Travelog or user ID not found for travelog ID: ${travelog_id}`);
      }
    
      // Fetch the user to get the username for the notification content
      const user = await User.findByPk(user_id);
      if (!user) {
        throw new Error(`User not found for user ID: ${user_id}`);
      }

      // Now create the comment
      const comment = await Comment.create({
        travelog_id,
        parent_id,
        user_id,
        content,
      });
    
      // Now create the notification, using the travelog author's user ID as the recipient_id
      const notification = await Notification.create({
        sender_id: user_id,
        recipient_id: travelog.user_id,  // Use the travelog author's user ID as the recipient_id
        type: 'comment',
        content: JSON.stringify({
          username: user.username,
          text: 'commented on your post.',
          url: `/travelog/${travelog_id}`
        }),
        expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 1))
      });

      // console.log('Emitting notification to recipient_id:', travelog_id);
      // io.to(travelog_id.toString()).emit('new-notification', notification);
      // console.log('Notification emitted');

      res.json({ success: true, comment });
    } catch (error) {
      console.error('Error posting comment:', error);
      res.status(500).send('Server Error');
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Server Error');
  }
});

// Fetching comments on TravDet load: 
app.get('/api/travelog/:travelogId/comments', async (req, res) => {
  const { travelogId } = req.params;

  try {
    const comments = await Comment.findAll({
      where: { travelog_id: travelogId },
      include: [
        {
          model: User,
          as: 'user',  // Use the correct 'as' value here
          attributes: ['username']
        }
      ],
      order: [['created_at', 'ASC']]
    });

    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).send('Server Error');
  }
});

// Patch for editing comments
app.patch('/api/comments/:comment_id', async (req, res) => {
  try {
    const { comment_id } = req.params;
    const { content } = req.body;
    await Comment.update({ content }, { where: { comment_id } });
    res.sendStatus(200);
  } catch (error) {
    console.error('Error updating comment:', error);
    res.sendStatus(500);
  }
});

// Delete a comment 
app.delete('/api/comments/:comment_id', async (req, res) => {
  const { comment_id } = req.params;
  try {
    // Find the comment first to check if it exists
    const comment = await Comment.findOne({ where: { comment_id } });
    if (!comment) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }
    // Destroy the comment
    await comment.destroy();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// Sending messages between users 
const createRoomId = (id1, id2) => {
  const ids = [id1, id2].sort((a, b) => a - b);
  return ids.join('-');
};

app.post('/api/messages', async (req, res) => {
  console.log('Request body:', req.body);
  try {
    const { caller_id, receiver_id, content } = req.body;  

    // Create a unique identifier for the conversation
    // const conversationId = createRoomId(caller_id, receiver_id);

    // Create the message in the database
    const message = await Message.create({
      caller_id: caller_id,  
      receiver_id: receiver_id, 
      content,
      caller_del: false,
      receiver_del: false
    });

    console.log('Created message:', message.toJSON()); 

    // Emit the message to both users' rooms
    // io.to(`${caller_id}`).emit('new-message', message);
    io.to(`${receiver_id}`).emit('new-message', message);
    // io.to(conversationId).emit('new-message', message);
    // const emitResult1 = io.to(`${caller_id}`).emit('new-message', message);
    // const emitResult2 = io.to(`${receiver_id}`).emit('new-message', message);
    // console.log('Emit results:', emitResult1, emitResult2);

    res.json({ success: true, message });
  } catch (error) {
    console.error('Error posting message:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// Populate the conversation 
app.get('/api/conversations/:caller_id/:receiver_id', async (req, res) => {
  try {
    const { caller_id, receiver_id } = req.params;

    // Find all messages between the two users
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { caller_id: caller_id, receiver_id: receiver_id },
          { caller_id: receiver_id, receiver_id: caller_id }
        ]
      },
      order: [['createdAt', 'ASC']]  // Order by creation date so messages are in chronological order
    });

    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});


// Deleting the conversation between two users 
app.delete('/api/conversations/:caller_Id/:receiver_Id', async (req, res) => {
  try {
    const { caller_Id, receiver_Id } = req.params;

    // Find all messages between the two users
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { caller_Id: caller_Id, receiver_Id: receiver_Id },
          { caller_Id: receiver_Id, receiver_Id: caller_Id }
        ]
      }
    });

    // Update the deletion flags and check for messages to delete
    const messagesToDelete = [];
    for (const message of messages) {
      if (message.caller_Id === parseInt(caller_Id)) {
        message.caller_del = true;
      } else {
        message.receiver_del = true;
      }
      await message.save();

      if (message.caller_del && message.receiver_del) {
        messagesToDelete.push(message);
      }
    }

    // Delete the messages that both users have marked for deletion
    for (const message of messagesToDelete) {
      await message.destroy();
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// ***
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).send('Server Error');
});