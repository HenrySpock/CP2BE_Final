// Import the required modules
const express = require('express');
const cors = require('cors'); // Import the CORS middleware 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

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

// Create an Express application
const app = express();



app.use(bodyParser.json()); 

// Models: 
const { User, Image, Interaction, Travelog, Comment, Notification, Message, FeedbackReport, Rating, ForbiddenWord, Friendship, } = require('./models');

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
 
// User Registration 
// app.post('/register', async (req, res) => {
//   const { firstName, lastName, username, email, password, retypedPassword, adminKey, securityQuestion, answer } = req.body;
//   console.log(req.body);
//   if (password !== retypedPassword) {
//     return res.status(400).send('Passwords do not match');
//   }

//   const hashedPassword = bcrypt.hashSync(password, 10);
//   const isAdmin = adminKey === process.env.ADMIN_KEY;
  
//   if (adminKey && adminKey !== process.env.ADMIN_KEY) {
//     return res.status(400).send('Invalid Admin Key');
//   }

//   try {
//     await User.create({ firstName, lastName, username, email, password: hashedPassword, isAdmin, securityQuestion, answer });
//     res.send('Registration successful');
//   } catch (error) {
//     console.error(error);
//     res.status(500).send('Server error');
//   }
// });

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

// Get travelogs for home.js
// app.get('/api/travelog-entries', async (req, res) => {
//   try {
//       // Fetch the travelog entries with the associated first image and user details
//       const travelogEntries = await Travelog.findAll({
//           include: [{
//               model: Image,
//               as: 'Images',
//               limit: 1, // Limit to the first image
//           }, {
//               model: User,
//               attributes: ['username'] // Only fetch these attributes from the user
//           }],
//           attributes: ['site', 'country'], // Only fetch these attributes from the travelog
//       });

//       // Return the travelog entries as JSON
//       res.json(travelogEntries);
//   } catch (error) {
//       console.error("Error fetching travelog entries:", error);
//       res.status(500).json({ error: 'Failed to fetch travelog entries.' });
//   }
// });

// // Get travelogs for mapping:
// app.get('/api/travelog-entries', async (req, res) => {
//   try {
//       // Fetch the travelog entries with the associated first image and user details
//       const travelogEntries = await Travelog.findAll({
//           include: [{
//               model: Image,
//               as: 'Images',
//               limit: 1, // Limit to the first image
//           }, {
//               model: User,
//               attributes: ['username'] // Only fetch these attributes from the user
//           }],
//           attributes: ['travelog_id', 'site', 'country', 'latitude', 'longitude', 'title', 'date_visited'], // Added latitude and longitude
//           order: [['date_visited', 'DESC']],
//       });

//       console.log('travelogEntries: ', travelogEntries)

//       // Return the travelog entries as JSON
//       res.json(travelogEntries);
//   } catch (error) {
//       console.error("Error fetching travelog entries:", error);
//       res.status(500).json({ error: 'Failed to fetch travelog entries.' });
//   }
// });

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
          attributes: ['travelog_id', 'site', 'country', 'latitude', 'longitude', 'title', 'date_visited', 'reported'], // Added latitude and longitude
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

// // Route to Delete Travelog
// app.delete('/api/travelog/:travelogId', async (req, res) => {
//   try {
//     const travelogId = req.params.travelogId;
//     // Assuming you have a Travelog model with a related Images model
//     const travelog = await Travelog.findById(travelogId);
//     if (travelog) {
//       await travelog.destroy();  // This will also delete associated images if you have set up cascading deletes
//       res.status(200).send({ message: 'Travelog deleted successfully' });
//     } else {
//       res.status(404).send({ message: 'Travelog not found' });
//     }
//   } catch (error) {
//     console.error('Error deleting travelog:', error);
//     res.status(500).send({ message: 'Server error' });
//   }
// });

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

// Endpoint to fetch reported travelogs
// app.get('/api/reported-travelogs', async (req, res) => {
//   try {
//     const reportedTravelogs = await Travelog.findAll({
//       where: {
//         reported: true
//       }
//     });
//     res.json(reportedTravelogs);
//   } catch (error) {
//     console.error(error);
//     res.status(500).send('Server Error');
//   }
// });

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
// app.get('/api/user/:userId/travelogs', async (req, res) => {
//   try {
//     const userId = req.params.userId;
//     const travelogs = await Travelog.findAll({ where: { userId } });
//     res.status(200).send(travelogs);
//   } catch (error) {
//     console.error('Error fetching user travelogs:', error);
//     res.status(500).send({ message: 'Server error' });
//   }
// });

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

// Express.js route handler for deleting a user and their associated data:
// app.delete('/api/user/:userId', async (req, res) => {
//   try {
//     const userId = req.params.userId;
//     const user = await User.findByPk(userId);

//     if (!user) {
//       return res.status(404).send('User not found');
//     }

//     await user.destroy();
//     res.send('User deleted successfully');
//   } catch (error) {
//     console.error('Error deleting user:', error);
//     res.status(500).send('Server error');
//   }
// });

// app.delete('/api/user/:userId', async (req, res) => {
//   console.log('req: ', req)
//   try {
    
//     const userId = req.params.userId;
//     await User.destroy({
//       where: { user_id: userId }
//     });
//     res.send('User deleted successfully');
//   } catch (error) {
//     console.error('Error deleting user:', error);
//     res.status(500).send('Server error');
//   }
// });

// Handle Befriending 
app.post('/api/friends/request', async (req, res) => {
  const { requester, requestee } = req.body;
  
  // Create a new row in the Friendship table
  const friendship = await Friendship.create({
    user1: requester,
    user2: requestee,
    accepted: false,
    denied: false,
  });
  
  // Create a new notification for the requestee
  await Notification.create({
    recipient: requestee,
    sender: requester,
    type: 'friend-request',
    read: false,
  });
  
  res.json({ success: true });
});

//Handle deleting a friend request
app.delete('/api/friends/request', async (req, res) => {
  const { requester, requestee } = req.body;
  
  try {
    await Friendship.destroy({
      where: {
        [Op.or]: [
          { user1: requester, user2: requestee },
          { user1: requestee, user2: requester }
        ]
      }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error canceling friendship request:', error);
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

// Notification endpoint  
app.get('/api/notifications/:username', async (req, res) => {
  const { username } = req.params;
  
  const notifications = await Notification.findAll({
    where: { recipient: username, read: false }
  });
  
  res.json(notifications);
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// ***
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).send('Server Error');
});