const { Indicator } = require('../models');

const updateLastActive = async (req, res, next) => {
  let user_id; 

  if (req.method === 'DELETE' || req.method === 'GET') { 
    user_id = req.query.user_id;
  } else { 
    if (req.path.startsWith('/api/likes/') && req.body.liker_id) {
      user_id = req.body.liker_id;
    } else {
      user_id = req.body.user_id;
    }
  }

  if (!user_id) {
    console.error('Error: user_id is required for updateLastActive');
    return res.status(400).send('user_id is required');
  }

  try {
    // console.log('trying to update indicator with user_id: ', user_id)
    await Indicator.update(
      { last_active: new Date() },
      { where: { user_id: user_id } }
    );
    next();
  } catch (error) {
    console.error('Error updating last active:', error);
    res.status(500).send('Server error');
  }
};

module.exports = updateLastActive;
