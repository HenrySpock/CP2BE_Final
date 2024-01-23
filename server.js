process.env.DEBUG = 'socket.io*';

// Import the required modules
const express = require('express');
const cors = require('cors');   
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const scheduledJobs = require('./scheduledJobs');
const axios = require('axios');
const updateLastActive = require('./middleware/updateLastActive');
 
const bodyParser = require('body-parser');

const Sequelize = require('sequelize');

const { Op, col } = require('sequelize');

// env variables 
const jwtSecret = process.env.JWT_SECRET; 
const emailUser = process.env.EMAIL_USER;
const emailPassword = process.env.EMAIL_PASSWORD; 
const adminKey = process.env.ADMIN_KEY;
const apiKey = process.env.API_KEY; 

const http = require('http');
const { initializeSocket } = require('./routing/socketManager');

const app = express();
const server = http.createServer(app);

// Initialize WebSocket
const io = initializeSocket(server);

app.use(bodyParser.json()); 

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: {
    user: emailUser,  
    pass: emailPassword  
  }
});

// Models: 
const { User, Image, Travelog, Comment, Notification, Message, FeedbackReport, Friendship, Follow, Block, Trip, ProfileLikes, TripLikes, TravLikes, CommentLikes, ImageLikes, Permission, Maintenance, sequelize} = require('./models');

// Set up middleware
app.use(express.json()); // Example middleware to parse JSON data
app.use(cors()); // Example middleware to handle CORS

// app.use((req, res, next) => {
//   // console.log(`Received ${req.method} request on ${req.url}`);
//   next();
// });

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://castlingfe.onrender.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Ping route
app.get('/ping', (req, res) => {
  res.send('pong');
});

// Importing routes files:
const routesFeedbackReporting = require('./routing/routesFeedbackReporting');   
const routesAuth = require('./routing/routesAuth')
const routesUser = require('./routing/routesUser')
const routesYelp = require('./routing/routesYelp')
const routesTravelog = require('./routing/routesTravelog')
const routesTrip = require('./routing/routesTrip')
const routesTally = require('./routing/routesTally');
const routesAbaci = require('./routing/routesAbaci')
const routesRecent = require('./routing/routesRecent')
const routesViewCount = require('./routing/routesViewCount')
const routesSearch = require('./routing/routesSearch') 


app.use('/feedback', routesFeedbackReporting);
app.use('/auth', routesAuth);
app.use('/user', routesUser);
app.use('/yelp', routesYelp);
app.use('/travelog', routesTravelog);
app.use('/trip', routesTrip);
app.use('/tally', routesTally);
app.use('/abaci', routesAbaci);
app.use('/recent', routesRecent);
app.use('/viewcount', routesViewCount);
app.use('/search', routesSearch); 

// Interaction Routes 
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
        text: 'has sent you a friend request.',
        username: requesterUsername,
        url: `/public_profile/${requesterUsername}`
    }),
    expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 1))
  });

  // console.log('Attempting to notify requestee: ', requestee); 

  io.to(requestee.toString()).emit('new-notification', notification); 

  // console.log(notification, 'successfully emitted to: ', requestee);

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

    // console.log('user1:', user1, 'user2:', user2);
    // Emit the unfriend event to both users
    io.to(user1.toString()).emit('unfriend', { user2 });
    // console.log('unfriend event emitted to user1:', user1);
    io.to(user2.toString()).emit('unfriend', { user1 });
    // console.log('unfriend event emitted to user2:', user2);
    

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
  // console.log('Yes, undefined would be correct')
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
app.get('/api/notifications/:user_id', async (req, res) => {
  // console.log('Received GET request on /api/notifications/' + req.params.user_id);
  const { user_id } = req.params;
  try {
    const notifications = await Notification.findAll({
      where: {
        recipient_id: user_id,  // Updated column name
        dismissed: false,  // Updated column name
      },
      include: [
        { model: User, as: 'Sender', attributes: ['username'] },
        { model: User, as: 'Recipient', attributes: ['username'] }
      ],
      order: [['created_at', 'DESC']]
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
// app.post('/api/friends/request/accept', async (req, res) => {
//   const { sender_id, recipient_id, notification_id } = req.body;
  
//   try {
//     // Start a transaction
//     const t = await sequelize.transaction();

//     // Fetch the recipient's username
//     const recipient = await getUserById(recipient_id);

//     if (!recipient) {
//       await t.rollback();
//       return res.status(404).json({ error: 'Recipient not found' });
//     }

//     const recipientUsername = recipient.username;

//     // Update the friendship status
//     await Friendship.update(
//       { accepted: true },
//       { where: { user1: sender_id, user2: recipient_id }, transaction: t }
//     );

//     // Dismiss the old notification
//     await Notification.update(
//       { dismissed: true },
//       { where: { notification_id: notification_id }, transaction: t }
//     );

//     // await Notification.create({
//     const notification = await Notification.create({
//       sender_id: recipient_id,
//       recipient_id: sender_id,
//       type: 'friend-request-accepted',
//       content: JSON.stringify({
//         username: recipientUsername,
//         text: 'has accepted your friend request.',
//         url: `/public_profile/${recipientUsername}`
//       }), 
//       expiry_date: new Date(new Date().setMonth(new Date().getMonth() + 1))
//     }, { transaction: t });

//     // console.log('Emitting notification to sender_id:', sender_id);
//     io.to(sender_id.toString()).emit('new-notification', notification);
//     // console.log('Notification emitted');

//     // Commit the transaction
//     await t.commit();

//     res.json({ success: true });
//   } catch (error) {
//     // Rollback the transaction in case of an error
//     await t.rollback();
//     console.error('Error accepting friend request:', error);
//     res.status(500).send('Server Error');
//   }
// });

app.post('/api/friends/request/accept', async (req, res) => {
  const { sender_id, recipient_id, notification_id } = req.body;
  console.log('req.body', req.body)
  let t;

  try {
    // Start a transaction
    t = await sequelize.transaction();

    // Fetch the recipient's username
    const recipient = await getUserById(recipient_id);

    if (!recipient) {
      if (t) await t.rollback();
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
      { where: { notification_id: notification_id }, transaction: t }
    );

    // Create the new notification
    const notification = await Notification.create({
      sender_id: recipient_id,
      recipient_id: sender_id,
      type: 'friend-request-accepted',
      content: JSON.stringify({
        username: recipientUsername,
        text: 'has accepted your friend request.',
        url: `/public_profile/${recipientUsername}`
      }), 
      expiry_date: new Date(new Date().setMonth(new Date().getMonth() + 1))
    }, { transaction: t });

    // Emit the notification
    io.to(sender_id.toString()).emit('new-notification', notification);

    // Commit the transaction
    await t.commit();

    res.json({ success: true });
  } catch (error) {
    // Rollback the transaction in case of an error
    if (t) await t.rollback();
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

    // console.log('Emitting notification to sender_id:', sender_id);
    io.to(sender_id.toString()).emit('new-notification', notification);
    // console.log('Notification emitted');
    
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
  const { friendship_id } = req.body;
  try {
    // Update the 'dismissed' field for the specified friendship
    await Friendship.update(
      { dismissed: true },
      { where: { friendship_id: friendship_id } }
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

      // console.log('Notification created:', notification);

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
    // console.log('follower_id: ', follower_id, 'followee_id: ', followee_id, 'notificationId: ', notificationId);

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
        type: 'new-follow'   
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

// DELETE NOTIFICATION FROM THE DATABASE / DOM 
app.delete('/api/notifications/delete/:notification_id', async (req, res) => {
  const { notification_id } = req.params;

  try {
    // Destroy the notification with the given ID
    await Notification.destroy({
      where: { notification_id }
    });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).send('Server error');
  }
}); 

// Block a user and remove friendship if it exists
app.post('/api/block', async (req, res) => {
  const { blocker_id, blocked_id } = req.body;

  try {
    // Begin a transaction
    const transaction = await sequelize.transaction();

    // Check if there's an existing friendship and delete it
    await Friendship.destroy({
      where: {
        [Op.or]: [
          { user1: blocker_id, user2: blocked_id },
          { user1: blocked_id, user2: blocker_id }
        ]
      },
      transaction
    });

    // Create the block
    await Block.create({ blocker_id, blocked_id }, { transaction });

    // Commit the transaction
    await transaction.commit();

    res.json({ success: true });
  } catch (error) {
    // Rollback the transaction if any errors occur
    await transaction.rollback();

    console.error('Error blocking user:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
}); 

// MESSAGE COUNTS AND FRIEND/ADMIN CARD POPULATION ON MESSAGES.JS 
// Helper function to get the count of unread messages
async function getUnreadMessagesCount(user_id, friendId) {
  try {
    const count = await Message.count({
      where: {
        receiver_id: user_id, // Current user must be the receiver
        caller_id: friendId, // Friend is the sender
        read: false         // Message is not read
      }
    });
    return count;
  } catch (error) {
    console.error('Error counting unread messages:', error);
    return 0; // Return 0 as a safe default in case of an error
  }
} 

// Retrieve friends list and message count
app.get('/api/friends/:user_id', async (req, res) => {
  const user_id = parseInt(req.params.user_id, 10);

  try {
    const friendsRelations = await Friendship.findAll({
      where: {
        [Op.or]: [
          { user1: user_id },
          { user2: user_id }
        ],
        accepted: true
      },
      include: [
        { model: User, as: 'Requester', attributes: ['user_id', 'username', 'avatar'] },
        { model: User, as: 'Requestee', attributes: ['user_id', 'username', 'avatar'] }
      ]
    });

    // Transform data to get a list of friend user objects with unread message count
    const friendsListWithUnreadCount = await Promise.all(friendsRelations.map(async relation => {
      let friend = relation.Requester.user_id !== user_id ? relation.Requester : relation.Requestee;
      friend = friend.get({ plain: true }); // Convert Sequelize model instance to plain object
      const unreadCount = await getUnreadMessagesCount(user_id, friend.user_id);
      return { ...friend, unreadCount }; // Append unread message count to friend data
    }));
    
    res.json(friendsListWithUnreadCount);
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).send('Internal Server Error');
  }
}); 

// Helper function to get the count of unread admin messages
async function getUnreadAdminMessagesCount(user_id) {
  try {
    const count = await Message.count({
      where: {
        receiver_id: user_id, // Current user must be the receiver
        warning: true,       // Message is a warning (admin message)
        read: false          // Message is not read
      },
      include: {
        model: User,
        as: 'Sender',
        where: { is_admin: true } // Sender is an admin
      }
    });
    return count;
  } catch (error) {
    console.error('Error counting unread admin messages:', error);
    return 0; // Return 0 as a safe default in case of an error
  }
} 

// Helper function to check 'cleared' status for populating admin card/messages properly:
async function areAllReportsCleared(user_id) {
  // Check reports directly reported on the user
  const directReports = await FeedbackReport.count({
    where: {
      reported_user_id: user_id,
      cleared: false
    }
  });

  if (directReports > 0) return false;

  // Check reports on trips, travelogs, and comments created by the user
  const associatedReports = await FeedbackReport.count({
    where: {
      cleared: false,
      [Op.or]: [
        { '$ReportedTrip.user_id$': user_id },
        { '$ReportedTravelog.user_id$': user_id },
        { '$ReportedComment.user_id$': user_id }
      ]
    },
    include: [
      { model: Trip, as: 'ReportedTrip', attributes: [] },
      { model: Travelog, as: 'ReportedTravelog', attributes: [] },
      { model: Comment, as: 'ReportedComment', attributes: [] }
    ]
  });

  return associatedReports === 0;
}

app.get('/api/admin-messages/:user_id', async (req, res) => {
  const user_id = parseInt(req.params.user_id, 10);

  try {
    const unreadCount = await getUnreadAdminMessagesCount(user_id);

    // ADDED 
    // Calculate the count of read admin messages
    const readCount = await Message.count({
      where: { receiver_id: user_id, warning: true, read: true }
    });

    let adminUser = null;

    const allReportsCleared = await areAllReportsCleared(user_id);
    // console.log('ALLREPORTSCLEARED: ', allReportsCleared)

    // if (unreadCount > 0 && !allReportsCleared) {
    if ((unreadCount > 0 || readCount > 0) && !allReportsCleared) {
      const adminMessage = await Message.findOne({
        where: { receiver_id: user_id, warning: true, read: false },
        include: {
          model: User,
          as: 'Sender',
          where: { isAdmin: true },
          attributes: ['user_id', 'username', 'avatar']
        }
      });
      adminUser = adminMessage ? adminMessage.Sender : null;
      // console.log('ADMINUSER: ', adminUser)
    }

    if (unreadCount === 0 && readCount > 0) {
      adminMessage = await Message.findOne({
        where: { receiver_id: user_id, warning: true, read: true },
        include: {
          model: User,
          as: 'Sender',
          where: { isAdmin: true },
          attributes: ['user_id', 'username', 'avatar']
        }
      });
      adminUser = adminMessage ? adminMessage.Sender : null;
      // console.log('ADMINUSER: ', adminUser)
    }


    // res.json({ adminUser, unreadCount, allReportsCleared });
    res.json({ adminUser, unreadCount, readCount, allReportsCleared });
  } catch (error) {
    console.error('Error fetching admin message:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
}); 

// Retrieve followers list:
app.get('/api/followers/:user_id', async (req, res) => {
  const user_id = parseInt(req.params.user_id, 10);

  try {
    const followersRelations = await Follow.findAll({
      where: {
        followee_id: user_id
      },
      include: [
        { model: User, as: 'Follower', attributes: ['user_id', 'username', 'avatar'] }
      ]
    });

    // console.log(followersRelations);  // Log the fetched data

    // Transform data to get a list of follower user objects
    const followersList = followersRelations.map(relation => relation.Follower);
    
    res.json(followersList);
  } catch (error) {
    console.error('Error fetching followers:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Retrieve followings list:
app.get('/api/followings/:user_id', async (req, res) => {
  const user_id = parseInt(req.params.user_id, 10);

  try {
    const followingsRelations = await Follow.findAll({
      where: {
        follower_id: user_id
      },
      include: [
        { model: User, as: 'Followee', attributes: ['user_id', 'username', 'avatar'] }
      ]
    });

    // console.log(followingsRelations);  // Log the fetched data

    // Transform data to get a list of followee user objects
    const followingsList = followingsRelations.map(relation => relation.Followee);
    
    res.json(followingsList);
  } catch (error) {
    console.error('Error fetching followings:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Disconnections - get all denied / non-dismissed users:  
app.get('/api/user/:user_id/denied-requests', async (req, res) => {
  const { user_id } = req.params;
  try {
    const deniedRequests = await Friendship.findAll({
      where: {
        [Op.or]: [{ user1: user_id }, { user2: user_id }],
        denied: true,
        dismissed: false  // Exclude dismissed requests
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
app.get('/api/user/:user_id/blocked-users', async (req, res) => {
  const { user_id } = req.params;
  try {
    const blockedUsers = await User.findAll({
      include: {
        model: Block,
        as: 'blocksReceived',  
        where: { blocker_id: user_id },
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

app.post('/api/comment', updateLastActive, async (req, res) => {
  const { travelog_id, trip_id, parent_id, user_id, content, username } = req.body;
  // console.log('user_id on comment', user_id)
  try {
    if (!travelog_id && !trip_id && !parent_id) {
      throw new Error('Either travelog_id, trip_id, or parent_id must be provided');
    }

    // Initialize recipient_id and redirect URL for notification
    let recipient_id, redirectUrl;

    // Handle the case when travelog_id is provided
    if (travelog_id) {
      const travelog = await Travelog.findByPk(travelog_id);
      if (!travelog || !travelog.user_id) {
        throw new Error(`Travelog or user ID not found for travelog ID: ${travelog_id}`);
      }

      recipient_id = travelog.user_id;
      redirectUrl = `/travelog/${travelog_id}`;
    }

    // Handle the case when trip_id is provided
    if (trip_id) {
      const trip = await Trip.findByPk(trip_id);
      if (!trip || !trip.user_id) {
        throw new Error(`Trip or user ID not found for trip ID: ${trip_id}`);
      }

      recipient_id = trip.user_id;
      redirectUrl = `/trip/${trip_id}`;
    }

    // Fetch the user to get the username for the notification content
    const user = await User.findByPk(user_id);
    if (!user) {
      throw new Error(`User not found for user ID: ${user_id}`);
    }

    // Create the comment
    const comment = await Comment.create({
      travelog_id,
      trip_id, // Add trip_id
      parent_id,
      user_id,
      content,
      username,
    });
  
    // Create the notification, using the travelog/trip author's user ID as the recipient_id
    const notification = await Notification.create({
      sender_id: user_id,
      recipient_id: recipient_id,  // Use the travelog/trip author's user ID as the recipient_id
      type: 'comment',
      content: JSON.stringify({
        username: user.username,
        text: 'commented on your travelog/trip.',
        url: redirectUrl
      }),
      expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 1))
    });

    res.json({ success: true, comment });
  } catch (error) {
    console.error('Error posting comment:', error);
    res.status(500).send('Server Error');
  }
}); 

// Helper function to get blocked user ids for travelog/trip author:
async function getBlockedUserIds(authorId) {
  const blocks = await Block.findAll({
    where: { blocker_id: authorId },
    attributes: ['blocked_id']
  });
  return blocks.map(block => block.blocked_id);
}

// Fetching comments on TravDet/TripDet load:
app.get('/api/comments', async (req, res) => {
  const { travelog_id, trip_id } = req.query;
  
  try {
    let authorId;
    let commentsQueryConditions = [];
    let comments;  // Initialize the comments variable here

    // Handle travelog_id
    if (travelog_id) {
      const travelog = await Travelog.findOne({
        where: { travelog_id: travelog_id },
        attributes: ['user_id']
      });
      if (!travelog) {
        return res.status(404).send('Travelog not found');
      }
      authorId = travelog.user_id;
      commentsQueryConditions.push({ travelog_id: travelog_id });
    }

    // Handle trip_id
    if (trip_id) {
      const trip = await Trip.findOne({
        where: { trip_id: trip_id },
        attributes: ['user_id']
      });
      if (!trip) {
        return res.status(404).send('Trip not found');
      }
      authorId = trip.user_id;
      commentsQueryConditions.push({ trip_id: trip_id });
    }

    if (!authorId) {
      return res.status(400).send('Either travelog_id or trip_id must be provided');
    }

    // Get the list of user IDs that have been blocked by the travelog/trip author
    const blockedUserIds = await getBlockedUserIds(authorId);

    // Execute the query with the dynamically constructed conditions
    comments = await Comment.findAll({
      where: { 
        [Sequelize.Op.or]: commentsQueryConditions,
        user_id: { [Sequelize.Op.notIn]: blockedUserIds }
      },
      include: [
        {
          model: Comment,
          as: 'parent',
          attributes: ['username']
        },
        {
          model: Travelog,
          as: 'travelog',
          attributes: ['username']
        },
        {
          model: Trip,
          as: 'trip',
          attributes: ['username']
        },
        {
          model: User,
          as: 'user',
          attributes: ['username']
        }
      ],
      order: [['created_at', 'ASC']]
    });

    const organizeComments = (parent_id = null, depth = 0) => {
      return comments
        .filter(comment => comment.parent_id === parent_id)
        .map(comment => {
          return {
            ...comment.get(),
            depth,
            children: organizeComments(comment.comment_id, depth + 1)
          };
        });
  };

    const nestedComments = organizeComments();

    const flattenComments = (nestedComments) => {
      let result = [];
      for (const comment of nestedComments) {
        const { children, ...commentData } = comment;
        result.push(commentData);
        result = result.concat(flattenComments(children));
      }
      return result;
    };

    const flatComments = flattenComments(nestedComments);

    const formattedComments = flatComments.map(comment => ({
      comment: comment,
      comment_id: comment.comment_id,
      content: comment.content,
      username: comment.user.username,
      parent: {
        type: comment.parent_id ? 'comment' : 'travelog',
        id: comment.parent_id || comment.travelog_id,
        username:
          comment.parent_id
            ? (comment.parent ? comment.parent.username : null)
            : (comment.travelog ? comment.travelog.username : null)
      }
    }));

    res.json(formattedComments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).send('Server Error');
  }
}); 

// Patch for editing comments
app.patch('/api/comments/:comment_id', updateLastActive, async (req, res) => {
  try {
    const { comment_id } = req.params; 
    const { content, user_id } = req.body;
    await Comment.update({ content }, { where: { comment_id } });
    res.sendStatus(200);
  } catch (error) {
    console.error('Error updating comment:', error);
    res.sendStatus(500);
  }
});

// Delete a comment 
app.delete('/api/comments/:comment_id', updateLastActive, async (req, res) => {
  const { comment_id, use_id } = req.params;
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

// Messaging Routes 
// Sending messages between users 
const createRoomId = (id1, id2) => {
  const ids = [id1, id2].sort((a, b) => a - b);
  return ids.join('-');
};

app.post('/api/messages', async (req, res) => {
  // console.log('Request body:', req.body);
  try {
    const { caller_id, receiver_id, content, warning } = req.body;  
 
    // Create the message in the database
    const message = await Message.create({
      caller_id: caller_id,  
      receiver_id: receiver_id, 
      content,
      caller_del: false,
      receiver_del: false,
      warning: warning,
    });

    // console.log('Created message:', message.toJSON()); 
 
    io.to(`${receiver_id}`).emit('new-message', message); 

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
          { caller_id: caller_id, receiver_id: receiver_id, caller_del: false },
          { caller_id: receiver_id, receiver_id: caller_id, receiver_del: false } 
        ]
      },
      order: [['created_at', 'ASC']]  // Order by creation date so messages are in chronological order
    });

    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
}); 

app.get('/api/all-conversations/:user_id', async (req, res) => {
  // console.log('NOW HERE*********************')
  try {
    const { user_id } = req.params;

    // This is a hypothetical way to get all conversations. 
    const conversations = await Message.findAll({
      where: {
        [Op.or]: [{ caller_id: user_id }, { receiver_id: user_id }]
      },
      include: [{ 
        model: User,
        as: 'Friend',
        where: {
          user_id: { [Op.ne]: user_id }
        },
        attributes: ['username']  
      }],
      order: [['created_at', 'DESC']]
    });

    res.json({ success: true, conversations: conversations });
  } catch (error) {
    console.error('Error fetching all conversations:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
}); 

app.delete('/api/conversations/:caller_id/:receiver_id', async (req, res) => {
  try {
      const { caller_id, receiver_id } = req.params;
      console.log('caller_id, receiver_id', caller_id, receiver_id)

      // Find all messages between the two users
      const messages = await Message.findAll({
          where: {
              [Op.or]: [
                  { caller_id: caller_id, receiver_id: receiver_id },
                  { caller_id: receiver_id, receiver_id: caller_id }
              ]
          }
      });

      for (const message of messages) {
          if (message.caller_id === parseInt(caller_id)) {
              message.caller_del = true;
          } else {
              message.receiver_del = true;
          }
          await message.save();

          if (message.caller_del && message.receiver_del) {
              await message.destroy();
          }
      }

      res.json({ success: true });
  } catch (error) {
      console.error('Error deleting conversation:', error);
      res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// POST /api/notify-user: feedback route with notification / io emit:
app.post('/api/notify-user', async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Create a new notification in the database
    const notification = await Notification.create({
      // sender_id: /* Admin's user ID or an identifier */,
      recipient_id: user_id,
      type: 'Account Warning',  
      content: JSON.stringify({
        text: 'Your account is under review. Further action may be taken in 72 hours.',
      }),
      expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      // expiryDate: /* Set an expiry date if needed */,
    });

    // Emit the notification to the user in real-time  
    io.to(user_id.toString()).emit('new-notification', notification);

    return res.status(200).json({ message: 'Notification sent successfully', notification });
  } catch (error) {
    console.error('Error sending notification:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}); 

// ROUTES FOR LIKES

// PROFILE POST
app.post('/api/likes/profile', updateLastActive, async (req, res) => {
  const { user_id, liker_id, liketype } = req.body;

  try {
    const existingLike = await ProfileLikes.findOne({
      where: { user_id, liker_id, liketype }
    });
 
    if (existingLike) {
      // Like exists, so delete it
      await existingLike.destroy();
      const existingNotification = await Notification.findOne({
        where: {
          sender_id: liker_id,
          recipient_id: user_id,
          type: 'profile-like',
          // Additional where clause to match the notification content if necessary
        }
      });

      if (existingNotification) {
        await existingNotification.destroy();
      }

      res.json({ success: true, message: 'Like removed, notification destroyed' });
    } else {
      // Like doesn't exist, create it
      await ProfileLikes.create({ user_id, liker_id, liketype });

      // Retrieve the usernames for liker and profile owner
      const [liker, profileOwner] = await Promise.all([
        User.findByPk(liker_id, { attributes: ['username'] }),
        User.findByPk(user_id, { attributes: ['username'] })
      ]);

      // Send a notification
      const notification = await Notification.create({
        sender_id: liker_id,
        recipient_id: user_id,
        type: 'profile-like',
        content: JSON.stringify({
          likerUsername: liker.username, 
          text: ` has liked your profile for great ${liketype}.`,
          likerUrl: `/public_profile/${liker.username}`,
          entityUrl: `/public_profile/${profileOwner.username}`
        }),
        expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 1))
      });

      // Emit notification using socket.io
      io.to(user_id.toString()).emit('new-notification', notification);

      res.json({ success: true, message: 'Like added' });
    }
  } catch (error) {
    console.error('Error in like handling:', error);
    res.status(500).send('Server Error');
  }
});

// PROFILE GET 
app.get('/api/likes/profile/check', async (req, res) => {
  const { user_id, liker_id } = req.query;

  try {
    const likes = await ProfileLikes.findAll({
      where: { user_id, liker_id }
    });

    const likeStatus = likes.reduce((acc, like) => {
      acc[like.liketype] = true;
      return acc;
    }, 
    { photography: false, writing: false }
    );

    res.json(likeStatus);
    // console.log('HEEEEEEEEEEEEEEEEEY res.json(likeStatus): ', likeStatus)
  } catch (error) {
    console.error('Error checking like status:', error);
    res.status(500).send('Server Error');
  }
});  

// Endpoint to get likers for photography for a specific user
app.get('/api/likers/photography', async (req, res) => {
  const { user_id } = req.query;
  try {
    const likers = await ProfileLikes.findAll({
      where: { 
        liketype: 'photography',
        user_id: user_id // Filter by user_id
      },
      include: [{ model: User, as: 'Liker', attributes: ['username'] }],
    });

    res.json(likers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}); 

// Endpoint to get likers for writing for a specific user
app.get('/api/likers/writing', async (req, res) => {
  const { user_id } = req.query;
  try {
    const likers = await ProfileLikes.findAll({
      where: { 
        liketype: 'writing',
        user_id: user_id // Filter by user_id
      },
      include: [{ model: User, as: 'Liker', attributes: ['username'] }],
    });

    res.json(likers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}); 

// ROUTES FOR LIKES
// TRIP POST
app.post('/api/likes/trip', updateLastActive, async (req, res) => { 
  const { user_id, liker_id, liketype, trip_id } = req.body;
   
  let condition = { user_id, liker_id, trip_id: trip_id, liketype };
  if (liketype === 'educational-trip') {
    condition.liketype = 'educational-trip';
  } else if (liketype === 'writing') {
    condition.liketype = 'writing';
  } else {
    condition.liketype = 'trip';
  }

   // console.log('HEEEEEEEEEEEEY trip_id: ', trip_id, 'req.body: ', req.body)
  try {
    const existingLike = await TripLikes.findOne({
      where: { user_id, liker_id, liketype, trip_id }
    });

    if (existingLike) {
      // Like exists, so delete it
      await existingLike.destroy();      

      // Also delete the corresponding notification if it exists
      const existingNotification = await Notification.findOne({
        where: {
          sender_id: liker_id,
          recipient_id: user_id,
          type: 'trip',
          // Additional where clause to match the notification content if necessary
        }
      });

      if (existingNotification) {
        await existingNotification.destroy();
      }

      res.json({ success: true, message: 'Like removed' });
    } else {
      // Like doesn't exist, create it
      await TripLikes.create({ user_id, liker_id, liketype, trip_id });

      // Send a notification
      const liker = await User.findByPk(liker_id); 
      let notificationContent;
      switch (liketype) {
        case 'educational-trip':
          notificationContent = ` has liked your trip as educational.`;
          break;
        case 'writing':
          notificationContent = ` has liked your writing.`;
          break;
        default:
          notificationContent = ` has liked your trip.`;
      }
      const notification = await Notification.create({
        sender_id: liker_id,
        recipient_id: user_id,
        type: 'trip',
        content: JSON.stringify({
          likerUsername: liker.username,
          text: notificationContent,
          // url: `/public_profile/${liker.username}`
          likerUrl: `/public_profile/${liker.username}`,
          entityUrl: `/trip_det/${trip_id}`
        }),
        expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 1))
      });
 
      // Emit notification using socket.io
      io.to(user_id.toString()).emit('new-notification', notification);

      res.json({ success: true, message: 'Like added' });
    }
  } catch (error) {
    console.error('Error in like handling:', error);
    res.status(500).send('Server Error');
  }
}); 
 
// Getting like for trip/writing/educational-trip button
app.get('/api/likes/trip/check', async (req, res) => {
  const { user_id, liker_id, trip_id } = req.query;

  try {
    const likes = await TripLikes.findAll({
      where: { user_id, liker_id, trip_id,  liketype: 'trip'  }
    }); 
    
    const likeStatus = { trip: likes.length > 0 };  

    res.json(likeStatus); 
 
    // console.log('HEEEEEEEEEEEEEEEEEY res.json(likeStatus): ', likeStatus)
  } catch (error) {
    console.error('Error checking like status:', error);
    res.status(500).send('Server Error');
  }
}); 

app.get('/api/likes/writing/check', async (req, res) => {
  const { user_id, liker_id, trip_id } = req.query;

  try {
    const likes = await TripLikes.findAll({
      where: { user_id, liker_id, trip_id, liketype: 'writing' }
    });

    const likeStatus = { writing: likes.length > 0 };  

    res.json(likeStatus);
    // console.log('Writing like status: ', likeStatus);
  } catch (error) {
    console.error('Error checking writing like status:', error);
    res.status(500).send('Server Error');
  }
});

app.get('/api/likes/educational-trip/check', async (req, res) => {
  const { user_id, liker_id, trip_id } = req.query;

  try {
    const likes = await TripLikes.findAll({
      where: { user_id, liker_id, trip_id, liketype: 'educational-trip'  }
    }); 
    
    const likeStatus = { educationalTrip: likes.length > 0 };  

    res.json(likeStatus); 
 
    // console.log('HEEEEEEEEEEEEEEEEEY res.json(likeStatus): ', likeStatus)
  } catch (error) {
    console.error('Error checking like status:', error);
    res.status(500).send('Server Error');
  }
});  

// Endpoint to get likers for trip
app.get('/api/likers/trip', async (req, res) => {
  const { trip_id } = req.query;
  try {
    const likers = await TripLikes.findAll({
      where: { liketype: 'trip', trip_id },  
      include: [{ model: User, as: 'Liker', attributes: ['username'] }],
    });

    res.json(likers);
    // console.log('LIKERS1: ', likers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }});

// Endpoint to get writing likers for trip
app.get('/api/likers/trip/writing', async (req, res) => {
  const { trip_id } = req.query;
  try {
    const likers = await TripLikes.findAll({
      where: { liketype: 'writing', trip_id },  
      include: [{ model: User, as: 'Liker', attributes: ['username'] }],
    });

    res.json(likers);
    // console.log('LIKERS1: ', likers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }});

// Endpoint to get likers for educactional trip
app.get('/api/likers/educational-trip', async (req, res) => {
  const { trip_id } = req.query;
  try {
    const likers = await TripLikes.findAll({
      where: { liketype: 'educational-trip', trip_id },
      include: [{ model: User, as: 'Liker', attributes: ['username'] }],
    });

    res.json(likers);
    // console.log('LIKERS - Educational Trip: ', likers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//TRAVELOG LIKE ROUTES
// TRAV POST
app.post('/api/likes/travelog', updateLastActive, async (req, res) => {
  
  const { user_id, liker_id, liketype, travelog_id } = req.body; 
  // console.log('HELLO FROM TRAV_LIKES POST travelog_id: ', travelog_id);
  try {
    const existingLike = await TravLikes.findOne({
      where: { user_id, liker_id, liketype, travelog_id }
    });

    if (existingLike) {
      // Like exists, so delete it
      await existingLike.destroy();


      // Also delete the corresponding notification if it exists
      const existingNotification = await Notification.findOne({
        where: {
          sender_id: liker_id,
          recipient_id: user_id,
          type: 'travelog-like',
          // Additional where clause to match the notification content if necessary
        }
      });

      if (existingNotification) {
        await existingNotification.destroy();
      }     


      res.json({ success: true, message: 'Like removed' });
    } else {
      // Like doesn't exist, create it
      await TravLikes.create({ user_id, liker_id, liketype, travelog_id });

      // Send a notification
      const liker = await User.findByPk(liker_id);
      const notification = await Notification.create({
        sender_id: liker_id,
        recipient_id: user_id,
        type: 'travelog-like',
        content: JSON.stringify({ 
          likerUsername: liker.username,
          text: ` has liked your travelog.`, 
          likerUrl: `/public_profile/${liker.username}`,
          entityUrl: `/trav_det/${travelog_id}`
        }),
        expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 1))
      });
 
      // Emit notification using socket.io
      io.to(user_id.toString()).emit('new-notification', notification);

      res.json({ success: true, message: 'Like added' });
    }
  } catch (error) {
    console.error('Error in like handling:', error);
    res.status(500).send('Server Error');
  }
});
 
// TRAV GET 
app.get('/api/likes/travelog/check', async (req, res) => {
  const { user_id, liker_id, travelog_id } = req.query;
  // console.log('APIIIIIIIIIIIIIIII /api/likes/travelog/check: ', travelog_id)
  try {
    const likes = await TravLikes.findAll({
      where: { user_id, liker_id, travelog_id }
    });

    const likeStatus = likes.reduce((acc, like) => { 

      const key = like.liketype.replace(/-(.)/g, (match, group1) => group1.toUpperCase());
      acc[key] = true;

      return acc;
    }, 
    { wantToTravel: false, traveled: false, retraveled: false, writing: false, informative: false }
    );

    res.json(likeStatus);
    // console.log('HEEEEEEEEEEEEEEEEEY res.json(likeStatus): ', likeStatus)
  } catch (error) {
    console.error('Error checking like status:', error);
    res.status(500).send('Server Error');
  }
}); 
 
// Endpoint to get likers for want to visit
app.get('/api/likers/want-to-travel', async (req, res) => {
  const { travelog_id } = req.query;
  
  try {
    const likers = await TravLikes.findAll({
      where: { liketype: 'want-to-travel', travelog_id: travelog_id },  
      include: [{ model: User, as: 'Liker', attributes: ['username'] }],
    });

    res.json(likers);
    // console.log('WANT TO TRAVEL LIKERS: ', likers)
    // console.log('LIKERS1: ', likers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to get likers for have visited
app.get('/api/likers/traveled', async (req, res) => {
  const { travelog_id } = req.query;
  // console.log('APIIIIIIIIIIIIIIII api/likers/traveled: ', travelog_id)
  try {
    const likers = await TravLikes.findAll({
      where: { liketype: 'traveled', travelog_id: travelog_id }, 
      include: [{ model: User, as: 'Liker', attributes: ['username'] }],
    });

    res.json(likers);
    // console.log('LIKERS1: ', likers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to get likers for want to revisit
app.get('/api/likers/retraveled', async (req, res) => {
  const { travelog_id } = req.query;
  // console.log('APIIIIIIIIIIIIIIII api/likers/retraveled: ', travelog_id)
  try {
    const likers = await TravLikes.findAll({
      where: { liketype: 'retraveled', travelog_id: travelog_id }, 
      include: [{ model: User, as: 'Liker', attributes: ['username'] }],
    });

    res.json(likers);
    // console.log('LIKERS1: ', likers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to get likers for writing
app.get('/api/travelog/likers/writing', async (req, res) => {
  const { travelog_id } = req.query;
  try {
    const likers = await TravLikes.findAll({
      where: { liketype: 'writing', travelog_id: travelog_id }, // Use 'writing' as liketype
      include: [{ model: User, as: 'Liker', attributes: ['username'] }],
    });

    res.json(likers);
    // console.log('WRITING LIKERS: ', likers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to get likers for enjoying educational post
app.get('/api/likers/informative', async (req, res) => {
  const { travelog_id } = req.query;
  // console.log('APIIIIIIIIIIIIIIII api/likers/informative: ', travelog_id)
  try {
    const likers = await TravLikes.findAll({
      where: { liketype: 'informative', travelog_id: travelog_id },  
      include: [{ model: User, as: 'Liker', attributes: ['username'] }],
    });

    res.json(likers);
    // console.log('LIKERS1: ', likers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}); 

// COMMENT LIKES POST
app.post('/api/likes/comment', updateLastActive, async (req, res) => {
  // console.log('HELLO');
  const { user_id, liker_id, liketype, comment_id } = req.body;
  // console.log('COMMENT_ID: ', comment_id)
  try {
    const existingLike = await CommentLikes.findOne({
      where: { user_id, liker_id, liketype, comment_id }
    });

    if (existingLike) {
      // Like exists, so delete it
      await existingLike.destroy();


      // Also delete the corresponding notification if it exists
      const existingNotification = await Notification.findOne({
        where: {
          sender_id: liker_id,
          recipient_id: user_id, 
          comment_id: comment_id, 
        }
      });

      if (existingNotification) {
        // console.log('COMMENTS - EXISTINGNOTIFICATION: ', existingNotification)
        await existingNotification.destroy();
      }    


      res.json({ success: true, message: 'Like removed' });
    } else {
      // Like doesn't exist, create it
      await CommentLikes.create({ user_id, liker_id, liketype, comment_id });

      // Send a notification
      const liker = await User.findByPk(liker_id);
      // console.log('TRYING TO INPUT COMMENT_ID: ', comment_id) 
      const comment = await Comment.findOne({
        where: { comment_id },
        include: [
          { model: Travelog, as: 'travelog', attributes: ['travelog_id'] },
          { model: Trip, as: 'trip', attributes: ['trip_id'] }
        ]
      });
      // console.log('COMMENT: ', comment) 

      let entityUrl = '';
      if (comment && comment.travelog_id) {
        entityUrl = `/trav_det/${comment.travelog_id}?comment=${comment.comment_id}`;
      } else if (comment && comment.trip_id) {
        entityUrl = `/trip_det/${comment.trip_id}?comment=${comment.comment_id}`;
      }

      const notification = await Notification.create({
        sender_id: liker_id,
        recipient_id: user_id,
        comment_id: comment_id,
        type: 'comment-like',
        content: JSON.stringify({ 
          likerUsername: liker.username,
          text: ` has liked your comment.`, 
          likerUrl: `/public_profile/${liker.username}`,
          entityUrl: entityUrl
        }),
        expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 1))
      });
 
      // Emit notification using socket.io
      io.to(user_id.toString()).emit('new-notification', notification);

      res.json({ success: true, message: 'Like added' });
    }
  } catch (error) {
    console.error('Error in like handling:', error);
    res.status(500).send('Server Error');
  }
});
 
// COMMENT LIKES GET 
app.get('/api/likes/comment/check', async (req, res) => {
  const { user_id, liker_id, comment_id } = req.query;

  try {
    const likes = await CommentLikes.findAll({
      where: { user_id, liker_id, comment_id }
    }); 

    const likeStatus = { comment: likes.length > 0 }; 

    res.json(likeStatus);
    // console.log('HEEEEEEEEEEEEEEEEEY res.json(likeStatus): ', likeStatus)
  } catch (error) {
    console.error('Error checking like status:', error);
    res.status(500).send('Server Error');
  }
}); 
 
// Endpoint to get likers for  COMMENTS
app.get('/api/likers/comment', async (req, res) => {
  const { comment_id } = req.query;
  // console.log('/api/likers/comment comment_id: ', comment_id)
  try {
    const likers = await CommentLikes.findAll({
      where: { liketype: 'comment', comment_id },  
      include: [{ model: User, as: 'Liker', attributes: ['username'] }],
    });

    res.json(likers);
    // console.log('LIKERS1: ', likers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}); 

// IMAGE LIKES POST
app.post('/api/likes/image', updateLastActive, async (req, res) => { 
  const { user_id, liker_id, liketype, image_id } = req.body;
  try {
    const existingLike = await ImageLikes.findOne({
      where: { user_id, liker_id, liketype, image_id }
    });

    if (existingLike) {
      await existingLike.destroy();

      // Delete notification if exists
      const existingNotification = await Notification.findOne({
        where: {
          sender_id: liker_id,
          recipient_id: user_id,
          type: 'image',
          image_id: image_id
        }
      });

      if (existingNotification) {
        await existingNotification.destroy();
      }

      res.json({ success: true, message: 'Like removed' });
    } else {
      await ImageLikes.create({ user_id, liker_id, liketype, image_id });

      // Fetch additional details for notification
      const liker = await User.findByPk(liker_id);
      const image = await Image.findByPk(image_id);  

      let entityUrl = '';
      if (image && image.travelog_id) {
        entityUrl = `/trav_det/${image.travelog_id}?image=${image.image_id}`;
      }

      // Create notification
      const notification = await Notification.create({
        sender_id: liker_id,
        recipient_id: user_id,
        type: 'image-like',
        content: JSON.stringify({
          likerUsername: liker.username,
          text: ' has liked your image.',
          likerUrl: `/public_profile/${liker.username}`,
          entityUrl: entityUrl
        }),
        expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 1))
      });

      // Emit notification
      io.to(user_id.toString()).emit('new-notification', notification);

      res.json({ success: true, message: 'Like added' });
    }
  } catch (error) {
    console.error('Error in like handling:', error);
    res.status(500).send('Server Error');
  }
});

// Image Likes GET Endpoint 
app.get('/api/likes/image/check', async (req, res) => {
  const { user_id, liker_id, image_id } = req.query;

  try {
    const likes = await ImageLikes.findAll({
      where: { user_id, liker_id, image_id }
    });

    const likeStatus = { image: likes.length > 0 };
    res.json(likeStatus);
  } catch (error) {
    console.error('Error checking like status:', error);
    res.status(500).send('Server Error');
  }
});

// Get Likers for Images Endpoint 
app.get('/api/likers/image', async (req, res) => {
  const { image_id } = req.query;

  try {
    const likers = await ImageLikes.findAll({
      where: { liketype: 'image', image_id },
      include: [{ model: User, as: 'Liker', attributes: ['username'] }]
    });

    res.json(likers);
  } catch (error) {
    console.error('Error fetching likers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Permissions routes 
app.get('/api/permissions/check/:user_id', async (req, res) => {
  const user_id = req.params.user_id;

  try {
      // Check for any trip or travelog permissions for the user
      const tripPermission = await Permission.findOne({ where: { grantee_id: user_id, trip_id: { [Op.ne]: null } } });
      const travelogPermission = await Permission.findOne({ where: { grantee_id: user_id, travelog_id: { [Op.ne]: null } } });

      const hasPermissions = !!tripPermission || !!travelogPermission;
      res.json({ hasPermissions });
  } catch (error) {
      console.error('Error checking permissions:', error);
      res.status(500).send('Server error');
  }
});

// Fetching permissions for travelog rendering on Private_Logs 
app.get('/permissions/travelogs/:user_id', async (req, res) => {
  const user_id = req.params.user_id;

  try {
      const privateTravelogs = await Permission.findAll({
          where: {
              grantee_id: user_id,
              travelog_id: { [Op.ne]: null }
          },
          include: [{
            model: Travelog,
            as: 'Travelog',  
            include: [{
                model: Image,  
                as: 'Images', 
                order: [['image_id', 'ASC']], // Order by image_id ascending
                limit: 1 // Limit to only the first image
            }]
        }]
      });

      // Extract the travelogs data and include the images
      const travelogs = privateTravelogs.map(permission => {
        // Include only the first image or all images based on your requirement
        permission.Travelog.dataValues.Images = permission.Travelog.Images.slice(0, 1); 
        return permission.Travelog;
      });

      res.json(travelogs);
  } catch (error) {
      console.error('Error fetching private travelogs:', error);
      res.status(500).send('Server error');
  }
});


// Fetching permissions for trip rendering on Private_Logs 
app.get('/permissions/trips/:user_id', async (req, res) => {
  const user_id = req.params.user_id;

  try {
      const privateTrips = await Permission.findAll({
          where: {
              grantee_id: user_id,
              trip_id: { [Op.ne]: null }
          },
          include: [{
              model: Trip,
              as: 'Trip' // Make sure this alias matches your association
          }]
      });

      // Extract the trips data
      const trips = privateTrips.map(permission => permission.Trip);  

      res.json(trips);
  } catch (error) {
      console.error('Error fetching private trips:', error);
      res.status(500).send('Server error');
  }
}); 

// --------------------------------------------------
// Function to check permission in the database
async function checkPermission(entityType, entityId, grantee_id) {
  const condition = entityType === 'travelog' ? { travelog_id: entityId } : { trip_id: entityId };
  const permission = await Permission.findOne({
    where: {
      ...condition,
      grantee_id: grantee_id
    }
  });
  return !!permission;
}
// Permissions check for trips and travelogs
// Updated endpoint to check specific permission for entityId and entityType
app.get('/api/permissions/specific/:user_id', async (req, res) => {
  try {
    const { entityId, entityType } = req.query;
    const user_id = parseInt(req.params.user_id);

    let hasAccess = false;
    let permissionCondition = {};

    if (entityType === 'travelog') {
      permissionCondition = { grantee_id: user_id, travelog_id: parseInt(entityId) };
    } else if (entityType === 'trip') {
      permissionCondition = { grantee_id: user_id, trip_id: parseInt(entityId) };
    } else {
      return res.status(400).send('Invalid entity type');
    }

    const permission = await Permission.findOne({ where: permissionCondition });
    hasAccess = !!permission;

    res.json({ hasAccess });
  } catch (error) {
    console.error('Error checking specific permissions:', error);
    res.status(500).send('Server error');
  }
});

// --------------------------------------------------

app.patch('/permissions/update', async (req, res) => {
  try {
    const updates = req.body; // Expecting an array of updates

    for (const update of updates) {
      const { granter_id, grantee_id, trip_id, travelog_id, action } = update;

      // Convert IDs to integers
      const granterIdInt = parseInt(granter_id);
      const granteeIdInt = parseInt(grantee_id);
      const tripIdInt = trip_id ? parseInt(trip_id) : null;
      const travelogIdInt = travelog_id ? parseInt(travelog_id) : null;

        if (action === 'grant') {
        // Add permission
        await Permission.create({
          granter_id: granterIdInt,
          grantee_id: granteeIdInt,
          trip_id: tripIdInt,
          travelog_id: travelogIdInt
        });
        // Fetch additional details for notification
        const granter = await User.findByPk(granter_id);
        const granterUsername = granter.username
        const entityType = trip_id ? 'trip' : 'travelog';
        const entityId = trip_id ? trip_id : travelog_id;
        const entityUrl = trip_id ? `http://localhost:3000/trip_det/${trip_id}` : `http://localhost:3000/trav_det/${travelog_id}`;
        // console.log('HEEEEEEEEEEEEY granter', granter.dataValues.username)
        // Create notification
        const notification = await Notification.create({
          sender_id: granter_id,
          recipient_id: grantee_id,
          type: `${entityType}-access-granted`,
          content: JSON.stringify({
            text: ` has given you access to their ${entityType}.`,
            username: granterUsername,
            entityUrl: entityUrl,
            url: `/public_profile/${granterUsername}`
          }),
          expiryDate: new Date(new Date().setMonth(new Date().getMonth() + 1))
        }); 

        
        // Emit notification
        io.to(grantee_id.toString()).emit('new-notification', notification);
      }  else if (action === 'revoke') {
        // Revoke permission
        const condition = tripIdInt ? { trip_id: tripIdInt } : { travelog_id: travelogIdInt };
        await Permission.destroy({
          where: {
            granter_id: granterIdInt,
            grantee_id: granteeIdInt,
            ...condition
          }
        });
      }
    }

    res.status(200).json({ message: 'Permissions updated successfully' });
  } catch (error) {
    console.error('Error updating permissions:', error);
    res.status(500).send('Server error');
  }
});


// MAINTENANCE MODE
// Schedule maintenance  
app.post('/api/schedule_maintenance', async (req, res) => {
  const { startDate, endDate, maintenance_key, adminId } = req.body;
  // console.log('req.boyd for maintenance post: ', req.body)

  // Verify if the user is an admin
  const adminUser = await User.findByPk(adminId);
  if (!adminUser || !adminUser.isAdmin) {
    return res.status(403).json({ message: 'Unauthorized: Only admins can schedule maintenance.' });
  }

  // Insert data into the maintenance_schedule table
  try {
    const newMaintenance = await Maintenance.create({
      admin_id: adminId,
      timestamp_start: startDate, // map startDate to timestamp_start
      timestamp_end: endDate,     // map endDate to timestamp_end 
      maintenance_key: maintenance_key // map maintenance_key to maintenance_key
    });

    res.status(200).json({ message: 'Maintenance scheduled successfully', newMaintenance });
  } catch (error) {
    console.error('Error scheduling maintenance:', error);
    res.status(500).send('Server error');
  }
});

// Fetch maintenance status
app.get('/api/maintenance/status', async (req, res) => {
  try {
    const latestMaintenance = await Maintenance.findOne({ 
      order: [['timestamp_start', 'DESC']] 
    });

    if (!latestMaintenance) {
      return res.status(200).json({ maintenanceActive: false });
    }

    const currentTime = new Date();
    const maintenanceActive = currentTime >= latestMaintenance.timestamp_start &&
                              currentTime <= latestMaintenance.timestamp_end &&
                              latestMaintenance.maintenance_mode;

    res.status(200).json({ 
      maintenanceActive, 
      maintenanceInfo: latestMaintenance 
    });
  } catch (error) {
    console.error('Error fetching maintenance status:', error);
    res.status(500).send('Server error');
  }
});

// Extend maintenance period
app.patch('/api/extend_maintenance', async (req, res) => {
  const { extendMaintenanceKey, newEndTime } = req.body;

  try {
    const maintenance = await Maintenance.findOne({
      where: { maintenance_key: extendMaintenanceKey }
    });

    if (!maintenance) {
      return res.status(404).json({ message: 'Maintenance not found' });
    }

    // Update the timestamp_end with the new end time
    maintenance.timestamp_end = newEndTime;
    await maintenance.save();

    res.status(200).json({ message: 'Maintenance period extended successfully' });
  } catch (error) {
    console.error('Error extending maintenance period:', error);
    res.status(500).send('Server error');
  }
}); 

// Start the server
module.exports = { io };

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  // console.log(`Server is running on port ${PORT}`);
});

// ***
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).send('Server Error');
});