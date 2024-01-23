const { Friendship, Suspension, Maintenance, MaintenanceHistory } = require('./models');  
const cron = require('node-cron');
const { Op, Sequelize } = require('sequelize');  // Import the Op symbol and Sequelize from sequelize

// Schedule a job to run at 5:20 AM daily
cron.schedule('20 5 * * *', async () => {
  // const thirtySecondsAgo = new Date(new Date() - 30 * 1000);   
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1); 

  try { 
    await Friendship.update(
      { denied: true },
      {
        where: {
          created_at: {
            // [Op.lt]: thirtySecondsAgo  
            [Op.lt]: oneMonthAgo 
          },
          accepted: false,
          denied: false
        }
      }
    );
    // console.log('Old friend requests updated successfully.');
  } catch (error) {
    console.error('Error updating old friend requests:', error);
  }
});

// Runs every day at 5a.m.
cron.schedule('0 5 * * *', async () => {
  try {
    // Calculate the date three days ago from the current time
    const threeDaysAgo = new Date(new Date() - 3 * 24 * 60 * 60 * 1000);

    // Delete suspensions older than three days
    await Suspension.destroy({
      where: {
        created_at: {
          [Op.lt]: threeDaysAgo,
        },
      },
    });

    // console.log('Old suspensions deleted successfully.');
  } catch (error) {
    console.error('Error deleting old suspensions:', error);
  }
});


// Schedule a job to run every minute 
// cron.schedule('* * * * *', async () => {
cron.schedule('0 5 * * *', async () => {
  const currentTime = new Date();

  try {
    // Check for maintenance schedules where the current time is within the maintenance window
    const maintenanceSchedules = await Maintenance.findAll({
      where: {
        timestamp_start: {
          [Op.lte]: currentTime
        },
        timestamp_end: {
          [Op.gte]: currentTime
        },
        maintenance_mode: false // select only those which are not already in maintenance mode
      }
    });

    // Update the maintenance_mode for these schedules
    for (const schedule of maintenanceSchedules) {
      await schedule.update({ maintenance_mode: true });
    }

    if (maintenanceSchedules.length > 0) {
      // console.log('Maintenance mode updated for scheduled maintenances.');
    }
  } catch (error) {
    console.error('Error updating maintenance mode:', error);
  }
});





// cron.schedule('* * * * *', async () => {  // Runs every minute
cron.schedule('0 5 * * *', async () => {  // Runs every minute
  const now = new Date();

  try {
    // Check for ongoing maintenance
    const ongoingMaintenance = await Maintenance.findOne({
      where: {
        timestamp_start: { [Op.lte]: now },
        timestamp_end: { [Op.gte]: now },
        maintenance_mode: false
      }
    });

    if (ongoingMaintenance) {
      // Activate maintenance mode
      await ongoingMaintenance.update({ maintenance_mode: true });

      // Log in MaintenanceHistory
      await MaintenanceHistory.create({
        maintenance_id: ongoingMaintenance.maintenance_id,
        actual_start: now,
        maintenance_key: ongoingMaintenance.maintenance_key
      });
    }

    // Check if any maintenance has ended
    const endedMaintenances = await Maintenance.findAll({
      where: {
        timestamp_end: { [Op.lt]: now },
        maintenance_mode: true
      }
    });

    for (const maintenance of endedMaintenances) {
      // Deactivate maintenance mode
      await maintenance.update({ maintenance_mode: false });

      // Update MaintenanceHistory with actual end time
      await MaintenanceHistory.update(
        { actual_end: now },
        { where: { maintenance_id: maintenance.maintenance_id } }
      );
    }

    // Delete old maintenance schedules
    await Maintenance.destroy({
      where: {
        timestamp_end: { [Op.lt]: new Date(new Date() - 60000) }  // older than 1 minute
      }
    });

  } catch (error) {
    console.error('Error in maintenance cron job:', error);
  }
});

module.exports = {};   