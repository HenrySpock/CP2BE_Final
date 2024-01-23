const { User, Image, Travelog, Comment, Notification, Message, FeedbackReport, Rating, ForbiddenWord, Friendship, Follow, Block, Trip, TipTapContent, Indicator, sequelize } = require('../models');
const { Op } = require('sequelize');

// Helper functions to get friends, followers, followings, and friends IDs
const getFriendsIds = async (user_id) => {
  try {
    const friendships = await Friendship.findAll({
      where: {
        [Op.or]: [{ user1: user_id }, { user2: user_id }],
        accepted: true  
      },
      attributes: ['user1', 'user2']
    });
    const friendIds = friendships.map(friendship => { 
      return friendship.user1 === parseInt(user_id, 10) ? friendship.user2 : friendship.user1;

    });
    return friendIds;
  } catch (error) {
    console.error('Error fetching friend IDs:', error);
    throw error;   
  }
};

const getFollowersIds = async (user_id) => {
  const followers = await Follow.findAll({ where: { followee_id: user_id } });
  return followers.map(follow => follow.follower_id);
};

const getFollowingsIds = async (user_id) => {
  const followings = await Follow.findAll({ where: { follower_id: user_id } });
  return followings.map(follow => follow.followee_id);
};

module.exports = {
  getFriendsIds,
  getFollowersIds,
  getFollowingsIds
};