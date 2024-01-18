const { Indicator } = require('../models');

const updateLastActive = async (req, res, next) => {
  let userId; 

  if (req.method === 'DELETE' || req.method === 'GET') { 
    userId = req.query.user_id;
  } else { 
    if (req.path.startsWith('/api/likes/') && req.body.liker_id) {
      userId = req.body.liker_id;
    } else {
      userId = req.body.user_id;
    }
  }

  if (!userId) {
    console.error('Error: user_id is required for updateLastActive');
    return res.status(400).send('user_id is required');
  }

  try {
    // console.log('trying to update indicator with user_id: ', userId)
    await Indicator.update(
      { last_active: new Date() },
      { where: { user_id: userId } }
    );
    next();
  } catch (error) {
    console.error('Error updating last active:', error);
    res.status(500).send('Server error');
  }
};

module.exports = updateLastActive;
