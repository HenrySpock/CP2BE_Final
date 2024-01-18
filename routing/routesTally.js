const express = require('express');

const { io } = require('../server');

const router = express.Router();
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');  
const axios = require('axios');
// const { User, Image, Travelog, Comment, Notification, Message, FeedbackReport, Rating, ForbiddenWord, Friendship, Follow, Block, Trip, TipTapContent, sequelize } = require('../models');
const { User, Notification, Message, FeedbackReport, sequelize } = require('../models');
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

// TALLYING 04 
// 01 Fetch unread user notifications 
router.get('/unread-user-notifications', async (req, res) => {
  try {
    // console.log('HERE, user id: ', req.query.userId)
    const userId = req.query.userId; // Assuming you have user information in req.user
    // console.log('userId: ', userId)
    const count = await Notification.count({
      where: {
        recipient_id: userId,
        read: false
      }
    });
    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    res.status(500).send('Internal server error');
  }
});
 
// 02 Mark Notifications as read 
router.patch('/mark-notifications-read/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    await Notification.update(
      { read: true },
      { where: { recipient_id: userId, read: false } }
    );

    res.status(200).send('Notifications marked as read');
  } catch (error) {
    console.error('Error updating notifications:', error);
    res.status(500).send('Internal server error');
  }
});


// 03 Fetch unread user messages 
router.get('/unread-user-messages', async (req, res) => {
  try {
    const userId = req.query.userId;
    const isAdmin = req.query.isAdmin === 'true';

    if (isAdmin) {
      // Fetch all user IDs who received a warning from this admin
      const warnedUserIdsResult = await Message.findAll({
        attributes: ['receiver_id'],
        where: {
          caller_id: userId,
          warning: true
        },
        group: ['receiver_id']
      });

      const warnedUserIds = warnedUserIdsResult.map(msg => msg.receiver_id);

      // Count messages where the admin is the receiver and the sender is not in the warned list
      const count = await Message.count({
        where: {
          receiver_id: userId,
          read: false,
          caller_id: { [Op.notIn]: warnedUserIds } // Exclude messages from warned users
        }
      });

      res.json({ unreadCount: count });
    } else {
      // For regular users, count all unread messages
      const count = await Message.count({
        where: {
          receiver_id: userId,
          read: false
        }
      });

      res.json({ unreadCount: count });
    }
  } catch (error) {
    console.error('Error fetching unread user messages:', error);
    res.status(500).send('Internal server error');
  }
});

// 04 Fetch unread Admin user messages 
router.get('/unread-user-messages', async (req, res) => {
  try {
    const userId = req.query.userId;
    const count = await Message.count({
      where: {
        receiver_id: userId,
        read: false
      }
    });
    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Error fetching unread user messages:', error);
    res.status(500).send('Internal server error');
  }
});

// 05 Fetch unread messages between Admin and user: 
router.get('/unread-admin-messages', async (req, res) => {
  try {
    const userId = req.query.userId;

    // This query counts conversations with unread messages  
    const conversations = await Message.findAll({
      where: { receiver_id: userId, read: false },
      include: [{
        model: User,
        as: 'Sender',
        attributes: ['user_id']
      }]
    });

    let count = 0;
    for (const convo of conversations) {
      // Check if any message in the conversation has a warning
      const hasWarning = await Message.findOne({
        where: {
          [Op.or]: [
            { caller_id: userId, receiver_id: convo.caller_id, warning: true }, 
          ]
        }
      });

      if (hasWarning) {
        count++;
      }
    }

    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Error fetching admin unread messages:', error);
    res.status(500).send('Internal server error');
  }
});

// 06 Mark messages received in a given conversation as read 
router.patch('/mark-messages-as-read', async (req, res) => {
  try {
    const { userId, conversationId } = req.body;

    // Update the 'read' status of messages in the conversation
    await Message.update(
      { read: true },
      {
        where: { 
          [Op.or]: [ 
            { caller_id: conversationId, receiver_id: userId }
          ],
          read: false // Only update messages that are currently unread
        }
      }
    );
    
    res.status(200).json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).send('Internal server error');
  }
});




// 07 Fetch unread admin reports 
router.get('/unread-admin-reports', async (req, res) => {
  try {
    // Count feedback reports where cleared is false and at least one reported_*_id is true
    const count = await FeedbackReport.count({
      where: {
        cleared: false,
        [Op.or]: [
          { reported_user_id: { [Op.ne]: null } },
          { reported_trip_id: { [Op.ne]: null } },
          { reported_travelog_id: { [Op.ne]: null } },
          { reported_comment_id: { [Op.ne]: null } }
        ]
      }
    });
    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Error fetching unread admin reports:', error);
    res.status(500).send('Internal server error');
  }
});
 
// MESSAGE COUNTS BADGES 
// Fetch messages for admin report badge counts   
router.get('/unread-messages-count', async (req, res) => {
  const { adminUserId, otherUserId } = req.query;

  try {
    const unreadCount = await Message.count({
      where: {
        caller_id: otherUserId,
        receiver_id: adminUserId,
        read: false
      }
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error('Error fetching unread messages count:', error);
    res.status(500).send('Internal server error');
  }
});

module.exports = router;











  

 