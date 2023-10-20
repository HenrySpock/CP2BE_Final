const { Friendship } = require('./models');  // Adjust the path to your models.js file if necessary
const cron = require('node-cron');
const { Op, Sequelize } = require('sequelize');  // Import the Op symbol and Sequelize from sequelize

// Schedule a job to run at 5:20 AM daily
cron.schedule('0 0 * * *', async () => {
  // const thirtySecondsAgo = new Date(new Date() - 30 * 1000);   
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1); 

  try { 
    await Friendship.update(
      { denied: true },
      {
        where: {
          createdAt: {
            // [Op.lt]: thirtySecondsAgo  
            [Op.lt]: oneMonthAgo 
          },
          accepted: false,
          denied: false
        }
      }
    );
    console.log('Old friend requests updated successfully.');
  } catch (error) {
    console.error('Error updating old friend requests:', error);
  }
});

module.exports = {};   