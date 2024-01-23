const express = require('express');

const { io } = require('../server');

const router = express.Router();
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');  
const axios = require('axios');
// const { User, Image, Travelog, Comment, Notification, Message, FeedbackReport, Rating, ForbiddenWord, Friendship, Follow, Block, Trip, BannedEmails, Suspension } = require('../models');
const { User, Travelog, Comment, Message, FeedbackReport, Trip, BannedEmails, Suspension } = require('../models');
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

// Feedback Post Route:
router.post('/submit-feedback', async (req, res) => {
  // console.log('Received request at /submit-feedback');  
  const { name, email, comment } = req.body;
  // console.log(`Name: ${name}, Email: ${email}, Comment: ${comment}`);  
  
  try {
    await FeedbackReport.create({
      name,
      email,
      content: comment
    });

    let mailOptions = {
      from: 'letsgocastling@gmail.com',   
      to: 'letsgocastling@gmail.com', 
      subject: `Feedback from ${name} (${email})`,
      text: comment
    };

    // console.log('About to send email');  
    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        // console.log(error);
        res.status(500).send('Server error');
      } else {
        // console.log('Email sent: ' + info.response);
        res.send('Feedback submitted successfully');
      }
    }); 
    // console.log('Called sendMail'); 
 
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});
 
// Endpoint for reporting a user
router.post('/api/users/:username/report', async (req, res) => {
  try {
    const username = req.params.username;
    const { user_id, complaint_text, reported_user_id, username: reporterUsername, email: reporterEmail } = req.body;

    const user = await User.findOne({ where: { username } });
    if (user) { 

      // Insert the complaint details into the feedback_reports table
      await FeedbackReport.create({
        user_id,
        complaint_text,
        reported_user_id,
        name: reporterUsername,
        email: reporterEmail,
      });

      res.status(200).send({ message: 'User reported successfully' });
    } else {
      res.status(404).send({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Error reporting user:', error);
    res.status(500).send({ message: 'Server error' });
  }
});
 

router.post('/api/trip/:trip_id/report', async (req, res) => {
  
  try {
    // console.log('YO')
    const username = req.params.username;
    const { user_id, complaint_text, reported_trip_id, username: reporterUsername, email: reporterEmail } = req.body;

    const trip = await Trip.findOne({ where: { trip_id: reported_trip_id } });
    if (trip) { 

      // Insert the complaint details into the feedback_reports table
      await FeedbackReport.create({
        user_id,
        complaint_text,
        reported_trip_id,
        name: reporterUsername,
        email: reporterEmail,
      });

      res.status(200).send({ message: 'Trip reported successfully' });
    } else {
      res.status(404).send({ message: 'Trip not found' });
    }
  } catch (error) {
    console.error('Error reporting trip:', error);
    res.status(500).send({ message: 'Server error' });
  }
});
 

router.post('/api/travelog/:travelog_id/report', async (req, res) => {
  try {
    const username = req.params.username;
    const { user_id, complaint_text, reported_travelog_id, username: reporterUsername, email: reporterEmail } = req.body;

    const travelog = await Travelog.findOne({ where: { travelog_id: reported_travelog_id } });
    if (travelog) { 

      // Insert the complaint details into the feedback_reports table
      await FeedbackReport.create({
        user_id,
        complaint_text,
        reported_travelog_id,
        name: reporterUsername,
        email: reporterEmail,
      });

      res.status(200).send({ message: 'Travelog reported successfully' });
    } else {
      res.status(404).send({ message: 'Travelog not found' });
    }
  } catch (error) {
    console.error('Error reporting travelog:', error);
    res.status(500).send({ message: 'Server error' });
  }
});
 
router.post('/api/comment/:comment_id/report', async (req, res) => {
  try { 
    const { user_id, complaint_text, reported_comment_id, username: reporterUsername, email: reporterEmail } = req.body;

    const comment = await Comment.findOne({ where: { comment_id: reported_comment_id } });
    if (comment) { 

      // Insert the complaint details into the feedback_reports table
      await FeedbackReport.create({
        user_id,
        complaint_text,
        reported_comment_id,
        name: reporterUsername,
        email: reporterEmail,
      });

      res.status(200).send({ message: 'Comment reported successfully' });
    } else {
      res.status(404).send({ message: 'Comment not found' });
    }
  } catch (error) {
    console.error('Error reporting comment:', error);
    res.status(500).send({ message: 'Server error' });
  }
});
  
router.get('/api/reported-feedback', async (req, res) => {
  
  // console.log('HEERE');
  try {
    const reportedFeedback = await FeedbackReport.findAll({
      include: [
        { 
          model: User, 
          as: 'ReportedUser' 
        },
        { 
          model: Trip, 
          as: 'ReportedTrip',
          include: [{ 
            model: User, 
            as: 'User' 
          }] // Include the associated User for each Trip
        },
        { 
          model: Travelog, 
          as: 'ReportedTravelog',
          include: [{ 
            model: User, 
            as: 'User' 
          }] // Include the associated User for each Travelog
        },
        { 
          model: Comment, 
          as: 'ReportedComment',
          include: [{ 
            model: User, 
            as: 'user' 
          }] // Include the associated User for each Comment
        },
      ],
      where: {
        cleared: false, // Filter only reports where cleared is false
      },
    });
    res.json(reportedFeedback);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});


// Clear Report
router.patch('/api/clear-report/:report_id/clear', async (req, res) => {
  try {
    const report_id = req.params.report_id;
    const adminUserId = req.body.adminUserId;

    // Update the 'cleared' variable to true for the specified report_id
    await FeedbackReport.update({ cleared: true }, {
      where: { report_id: report_id }
    });

    // Find the report details
    const report = await FeedbackReport.findOne({
      where: { report_id: report_id },
      include: [
        { model: Trip, as: 'ReportedTrip', attributes: ['user_id'] },
        { model: Travelog, as: 'ReportedTravelog', attributes: ['user_id'] },
        { model: Comment, as: 'ReportedComment', attributes: ['user_id'] }
      ]
    });

    if (report) {
      let targetUserId;

      if (report.reported_user_id) {
        // Handle user report
        targetUserId = report.reported_user_id;
      } else if (report.reported_trip_id && report.ReportedTrip) {
        // Handle trip report
        targetUserId = report.ReportedTrip.user_id;
      } else if (report.reported_travelog_id && report.ReportedTravelog) {
        // Handle travelog report
        targetUserId = report.ReportedTravelog.user_id;
      } else if (report.reported_comment_id && report.ReportedComment) {
        // Handle comment report
        targetUserId = report.ReportedComment.user_id;
      }

      if (targetUserId) {
        // Mark messages as read between admin and the target user
        await Message.update({ read: true }, {
          where: {
            [Op.or]: [
              { caller_id: adminUserId, receiver_id: targetUserId },
              { caller_id: targetUserId, receiver_id: adminUserId }
            ]
          }
        });
      }
    }

    res.status(200).send({ message: 'Report cleared successfully' });
  } catch (error) {
    console.error('Error clearing report:', error);
    res.status(500).send({ message: 'Server error' });
  }
});
 
// Suspend a user: POST /api/suspend
router.post('/api/suspend', async (req, res) => {
  const { user_email, action } = req.body;

  try {
    if (action === 'suspend') {
      // Create a new suspension record
      await Suspension.create({ user_email });
      res.status(200).json({ success: true, message: 'User suspended successfully' });
    } else if (action === 'unsuspend') {
      // Remove the suspension record
      await Suspension.destroy({ where: { user_email } });
      res.status(200).json({ success: true, message: 'User unsuspended successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error updating suspension:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's email to check suspension 
router.get('/api/get-user-email', async (req, res) => {
  try {
    const { username } = req.query;
    const user = await User.findOne({
      where: { username: username }
    });

    if (user) { 
      return res.status(200).json({ email: user.email });
    } else {
      return res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});
  

// GET /api/check-suspension
router.get('/api/check-suspension', async (req, res) => {
  try {
    const { user_email } = req.query;
    // console.log(`Checking suspension for email: ${user_email}`); // Log the email being checked

    const suspension = await Suspension.findOne({
      where: { user_email: user_email }
    });

    // console.log(`Suspension record: ${JSON.stringify(suspension)}`); // Log the suspension record found

    if (suspension && suspension.created_at) {
      const suspensionTime = new Date(suspension.created_at);
      const currentTime = new Date();
      // console.log(`Suspension time: ${suspensionTime}, Current time: ${currentTime}`); // Log the times

      const hoursPassed = (currentTime.getTime() - suspensionTime.getTime()) / (1000 * 60 * 60); // Convert milliseconds to hours
      // console.log(`Hours passed since suspension: ${hoursPassed}`); // Log hours passed

      const remainingTime = Math.ceil(Math.max(72 - hoursPassed, 0)); // Ensure non-negative
      // console.log(`Remaining suspension time: ${remainingTime} hours`); // Log remaining time

      return res.status(200).json({ isSuspended: true, remainingTime });
    } else {
      return res.status(200).json({ isSuspended: false });
    }
  } catch (error) {
    console.error('Error checking suspension:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}); 

// Endpoint to ban an email
router.post('/ban-email', async (req, res) => {
  try {
    const { email } = req.body;

    // Create a new banned email record
    await BannedEmails.create({ email });

    res.status(200).json({ message: 'Email banned successfully' });
  } catch (error) {
    console.error('Error banning email:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Check banned emails table on registration.
router.get('/api/check-banned-email', async (req, res) => {
  try {
    const { email } = req.query; // Use query parameters for GET requests
    const bannedEmail = await BannedEmails.findOne({ where: { email } });

    if (bannedEmail) {
      res.status(400).json({ message: 'Invalid email address. Use another.' });
    } else {
      res.status(200).json({ message: 'Email is valid.' });
    }
  } catch (error) {
    console.error('Error checking banned email:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;