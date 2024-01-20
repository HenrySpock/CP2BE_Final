// models.js

const { Sequelize, DataTypes, Model } = require('sequelize');
// const sequelize = require('sequelize'); 

// Local Connection Setup:
// This code can be found on the .env file if necessary. 

const DATABASE_URL = process.env.DATABASE_URL

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false // Note: This might be necessary if Render uses self-signed certificates
    }
  },

  logging: console.log,
  
  define: {
    timestamps: false, 
  },
});


class User extends Model {}
User.init({
  user_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  first_name: DataTypes.STRING,
  last_name: DataTypes.STRING,
  username: { type: DataTypes.STRING, unique: true },
  email: DataTypes.STRING,
  password: DataTypes.STRING,
  security_question: DataTypes.STRING,
  answer: DataTypes.STRING,
  tooltips: { type: DataTypes.BOOLEAN, defaultValue: true },
  is_admin: { type: DataTypes.BOOLEAN, defaultValue: false },
  avatar: { type: DataTypes.TEXT, allowNull: true },  // New field avatar
  bio: { type: DataTypes.TEXT, allowNull: true },      // New field bio
  verification_token: { type: DataTypes.STRING, allowNull: true },  // New field verification_token
  is_email_verified: { type: DataTypes.BOOLEAN, defaultValue: false },  // New field is_email_verified

  map_center: { type: DataTypes.ARRAY(DataTypes.FLOAT), defaultValue: [49, 12] },
  user_zoom: { type: DataTypes.INTEGER, defaultValue: 4 }, 
  view_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'updated_at' }
}, { sequelize, modelName: 'User', tableName: 'users'  }); 

class Indicator extends Model {}
Indicator.init({
  indicator_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: User, key: 'user_id' } },
  logged_in: { type: DataTypes.BOOLEAN, defaultValue: false },
  last_active: { type: DataTypes.DATE },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'updated_at' }
}, { sequelize, modelName: 'Indicator', tableName: 'indicators' });

class ProfileLikes extends Model {}
ProfileLikes.init({
  like_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: User, key: 'user_id' } }, // user_id of the public profile
  liker_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: User, key: 'user_id' } }, // user_id of the person liking the button on the profile
  liketype: { type: DataTypes.STRING, allowNull: false }, // 'book' or 'camera'
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'updated_at' }
}, { sequelize, modelName: 'ProfileLikes', tableName: 'profile_likes' });

class TripLikes extends Model {}
TripLikes.init({
  like_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: User, key: 'user_id' } }, // user_id of the public profile
  liker_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: User, key: 'user_id' } }, // user_id of the person liking the button on the profile
  liketype: { type: DataTypes.STRING, allowNull: false }, // 'star'
  trip_id: DataTypes.INTEGER,
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'updated_at' }
}, { sequelize, modelName: 'TripLikes', tableName: 'trip_likes' });

class TravLikes extends Model {}
TravLikes.init({
  like_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: User, key: 'user_id' } }, // user_id of the public profile
  liker_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: User, key: 'user_id' } }, // user_id of the person liking the button on the profile
  liketype: { type: DataTypes.STRING, allowNull: false }, // 'star'
  travelog_id: DataTypes.INTEGER,  
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'updated_at' }
}, { sequelize, modelName: 'TravLikes', tableName: 'trav_likes' });

class CommentLikes extends Model {}
CommentLikes.init({
  like_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: User, key: 'user_id' } }, // user_id of the public profile
  liker_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: User, key: 'user_id' } }, // user_id of the person liking the button on the profile
  liketype: { type: DataTypes.STRING, allowNull: false }, // 'star'
  comment_id: DataTypes.INTEGER, 
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'updated_at' }
}, { sequelize, modelName: 'CommentLikes', tableName: 'comment_likes' });

class ImageLikes extends Model {}
ImageLikes.init({
  like_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: User, key: 'user_id' } }, 
  liker_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: User, key: 'user_id' } },
  liketype: { type: DataTypes.STRING, allowNull: false },
  image_id: DataTypes.INTEGER, 
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'updated_at' }
}, { sequelize, modelName: 'ImageLikes', tableName: 'image_likes' });

class Trip extends Model {}
Trip.init({
  trip_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, references: { model: User, key: 'user_id' }, allowNull: false },

  username: { type: DataTypes.STRING, allowNull: false },  
  title: DataTypes.STRING,

  tripentry: { type: DataTypes.JSONB, allowNull: true },


  date_of_departure: DataTypes.DATEONLY,
  date_of_return: DataTypes.DATEONLY,
  image_url: { type: DataTypes.STRING }, 

  latitude: { type: DataTypes.FLOAT, allowNull: true },
  longitude: { type: DataTypes.FLOAT, allowNull: true },
  trip_zoom: { type: DataTypes.INTEGER, defaultValue: 4 },  // Add a default value of 4 

  // reported: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_private: { type: DataTypes.BOOLEAN, defaultValue: false },
  have_visited: { type: DataTypes.BOOLEAN, defaultValue: false },
  view_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'updated_at' }
}, { sequelize, modelName: 'Trip', tableName: 'trips' });

class Travelog extends Model {}
Travelog.init({
  // travelogId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  travelog_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, references: { model: User, key: 'user_id' } },

  title: { type: DataTypes.STRING(200), allowNull: false },
  username: { type: DataTypes.STRING, allowNull: false },
  site: DataTypes.STRING(200),
  country: DataTypes.STRING(60),
  state: DataTypes.STRING(100), 
  city: DataTypes.STRING(100),
  address: DataTypes.STRING(200),
  phone_number: DataTypes.STRING(30),

  latitude: { type: DataTypes.FLOAT, allowNull: true },
  longitude: { type: DataTypes.FLOAT, allowNull: true },

  traventry: { type: DataTypes.JSONB, allowNull: true },


  // dateVisited: { type: DataTypes.DATE, allowNull: true },
  // dateVisited: { type: DataTypes.DATEONLY, allowNull: true },
  date_visited: { type: DataTypes.DATE, allowNull: true },
  
  // isPrivate: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_private: { type: DataTypes.BOOLEAN, defaultValue: false },
  have_visited: { type: DataTypes.BOOLEAN, defaultValue: false },
  unesco: { type: DataTypes.BOOLEAN, defaultValue: false },
  // film_location: { type: DataTypes.BOOLEAN, defaultValue: false },
  film_location: DataTypes.STRING(1000),
  video_game_location: DataTypes.STRING(1000),

  category: { type: DataTypes.STRING },

  // reported: { type: Sequelize.BOOLEAN, defaultValue: false }, 
  // tripId: { type: DataTypes.INTEGER, references: { model: Trip, key: 'trip_id' }, allowNull: true },
  trip_id: { type: DataTypes.INTEGER, references: { model: Trip, key: 'trip_id' }, allowNull: true },
  // createdAt: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
  view_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'updated_at' }
}, { sequelize, modelName: 'Travelog', tableName: 'travelogs', timestamps: true, underscored: true });

class Permission extends Model {}
Permission.init({
  permission_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  granter_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: User, key: 'user_id' } },
  grantee_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: User, key: 'user_id' } },
  trip_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: Trip, key: 'trip_id' } },
  travelog_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: Travelog, key: 'travelog_id' } },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'updated_at' }
}, { sequelize, modelName: 'Permission', tableName: 'permissions' });

// New Images Model
class Image extends Model {}
Image.init({
  image_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  travelog_id: { type: DataTypes.INTEGER, references: { model: Travelog, key: 'travelog_id' } },
  image_url: DataTypes.STRING,
  view_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  title: { type: DataTypes.STRING(107), allowNull: true, },
  description: { type: DataTypes.STRING(404), allowNull: true, },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'updated_at' }
}, { sequelize, modelName: 'Image', tableName: 'images' });

class Friendship extends Model {}
Friendship.init({
  friendship_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user1: { type: DataTypes.INTEGER, references: { model: User, key: 'user_id' } },
  user2: { type: DataTypes.INTEGER, references: { model: User, key: 'user_id' } },
  accepted: { type: DataTypes.BOOLEAN, defaultValue: false },
  denied: { type: DataTypes.BOOLEAN, defaultValue: false },
  dismissed: { type: DataTypes.BOOLEAN, defaultValue: false, },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'updated_at' }
}, { sequelize, modelName: 'Friendship', tableName: 'friendships' });

// Comment class:
class Comment extends Model {}
Comment.init({
  comment_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  username: { type: DataTypes.STRING, allowNull: false },
  travelog_id: { type: DataTypes.INTEGER, references: { model: Travelog, key: 'travelog_id' }, allowNull: true },  // updated line
  trip_id: { type: DataTypes.INTEGER, references: { model: Trip, key: 'trip_id' }, allowNull: true }, 
  user_id: { type: DataTypes.INTEGER, references: { model: User, key: 'user_id' } },
  parent_id: { type: DataTypes.INTEGER, references: { model: Comment, key: 'comment_id' }, allowNull: true },  // updated line
  content: DataTypes.TEXT,
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'updated_at' }
}, { sequelize, modelName: 'Comment', tableName: 'comments' });

// Update to Notification model to handle type of notification
class Notification extends Model {}
Notification.init({
  notification_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  sender_id: { type: DataTypes.INTEGER, references: { model: User, key: 'user_id' } },
  recipient_id: { type: DataTypes.INTEGER, references: { model: User, key: 'user_id' } },
  comment_id: { type: DataTypes.INTEGER, references: { model: Comment, key: 'comment_id' }, allowNull: true },
  type: { type: DataTypes.STRING, allowNull: false },
  content: DataTypes.TEXT,
  expiry_date: DataTypes.DATE,
  read: { type: DataTypes.BOOLEAN, defaultValue: false },
  dismissed: { type: DataTypes.BOOLEAN, defaultValue: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'updated_at' }
}, { sequelize, modelName: 'Notification', tableName: 'notifications' });

class Follow extends Model {}
Follow.init({
  // followId: { type: DataTypes.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
  follow_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  follower_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: User, key: 'user_id' } },
  followee_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: User, key: 'user_id' } },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'updated_at' }
}, { sequelize, modelName: 'Follow', tableName: 'follows' });


// const Block = sequelize.define('block', {
//   blockId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
//   blocker_id: {    type: Sequelize.INTEGER,    allowNull: false  },
//   blocked_id: {    type: Sequelize.INTEGER,    allowNull: false  }
// });

class Block extends Model {}
Block.init({
  block_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  blocker_id: { type: Sequelize.INTEGER, allowNull: false },
  blocked_id: { type: Sequelize.INTEGER, allowNull: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'updated_at' }
}, { sequelize, modelName: 'Block', tableName: 'blocks' }); 

class Message extends Model {}
Message.init({
  message_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  caller_id: { type: DataTypes.INTEGER, references: { model: User, key: 'user_id' } },
  receiver_id: { type: DataTypes.INTEGER, references: { model: User, key: 'user_id' } },
  caller_del: { type: DataTypes.BOOLEAN, defaultValue: false },
  receiver_del: { type: DataTypes.BOOLEAN, defaultValue: false },
  content: DataTypes.TEXT,
  read: { type: DataTypes.BOOLEAN, defaultValue: false }, 

  warning: { type: DataTypes.BOOLEAN, defaultValue: false },

  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'updated_at' }
}, { sequelize, modelName: 'Message', tableName: 'messages' });

class FeedbackReport extends Model {}
FeedbackReport.init({
  report_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, references: { model: User, key: 'user_id' } },
  travelog_id: { type: DataTypes.INTEGER, references: { model: Travelog, key: 'travelog_id' } },
  content: DataTypes.TEXT,

  reported_user_id: { type: DataTypes.INTEGER, references: { model: User, key: 'user_id' } },
  reported_trip_id: { type: DataTypes.INTEGER, references: { model: Trip, key: 'trip_id' } },
  reported_travelog_id: { type: DataTypes.INTEGER, references: { model: Travelog, key: 'travelog_id' } },
  reported_comment_id: { type: DataTypes.INTEGER, references: { model: Comment, key: 'comment_id' } },
  complaint_text: { type: DataTypes.TEXT, allowNull: true, validate: { len: [0, 500] } }, 

  name: { type: DataTypes.STRING, allowNull: false },  // new field for name
  email: { type: DataTypes.STRING, allowNull: false },  // new field for email
  cleared: { type: DataTypes.BOOLEAN, defaultValue: false }, 
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'updated_at' }
}, { sequelize, modelName: 'FeedbackReport', tableName: 'feedback_reports' });

 


class Rating extends Model {}
Rating.init({
  rating_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, references: { model: User, key: 'user_id' } },
  travelog_id: { type: DataTypes.INTEGER, references: { model: Travelog, key: 'travelog_id' } },
  rating_color: DataTypes.STRING,
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'updated_at' }
}, { sequelize, modelName: 'Rating', tableName: 'ratings' });

class ForbiddenWord extends Model {}
ForbiddenWord.init({
  word_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  word: DataTypes.STRING,
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'updated_at' }
}, { sequelize, modelName: 'ForbiddenWord', tableName: 'forbidden_words' });

class BannedEmails extends Model {}
BannedEmails.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  email: { type: DataTypes.STRING, allowNull: false, unique: true, },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'updated_at' }
  }, { sequelize, modelName: 'banned_emails', });
 
class Suspension extends Model {}
Suspension.init({ 
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_email: { type: DataTypes.STRING, allowNull: false, }, 
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'updated_at' }
  }, { sequelize, modelName: 'suspension', });  

 class TipTapContent extends Model {}
TipTapContent.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  content: { type: DataTypes.JSONB, allowNull: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'updated_at' }
// }, { sequelize, modelName: 'TipTapContent', tableName: 'banned_emails', tableName: 'suspensions' });
}, { sequelize, modelName: 'TipTapContent', tableName: 'tip_tap_contents' });



class Maintenance extends Model {}
Maintenance.init({
  maintenance_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  admin_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: User, key: 'user_id' } },
  timestamp_start: { type: DataTypes.DATE, allowNull: false },
  timestamp_end: { type: DataTypes.DATE, allowNull: false }, 
  maintenance_mode: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  maintenance_key: { type: DataTypes.STRING, allowNull: false }, // New field for maintenance key
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'updated_at' }
}, { sequelize, modelName: 'Maintenance', tableName: 'maintenances' });

class MaintenanceHistory extends Model {}
MaintenanceHistory.init({
  history_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  maintenance_id: { type: DataTypes.INTEGER, allowNull: false },
  actual_start: { type: DataTypes.DATE, allowNull: false },
  actual_end: { type: DataTypes.DATE, allowNull: true },
  maintenance_key: { type: DataTypes.STRING, allowNull: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'updated_at' }
}, { sequelize, modelName: 'MaintenanceHistory', tableName: 'maintenance_histories' }); 

// Associations for Travelog:  
User.hasMany(Travelog, {
  foreignKey: 'user_id',
  onDelete: 'CASCADE',  
  as: 'Travelogs'
});

Travelog.hasMany(Image, {
  foreignKey: 'travelog_id',
  onDelete: 'CASCADE',  
  as: 'Images'
});
  
Image.belongsTo(Travelog, {
  foreignKey: 'travelog_id'
}); 

Travelog.belongsTo(User, {
  foreignKey: 'user_id'
});

Travelog.hasMany(Comment, {
  foreignKey: 'travelog_id',
  onDelete: 'CASCADE',  
  as: 'comments'
}); 

// Associations for Friendship
User.hasMany(Friendship, {
  foreignKey: 'user1',
  onDelete: 'CASCADE',
  as: 'InitiatedFriendships'
});

User.hasMany(Friendship, {
  foreignKey: 'user2',
  onDelete: 'CASCADE',
  as: 'ReceivedFriendships'
});

Friendship.belongsTo(User, {
  foreignKey: 'user1',
  as: 'Requester'
});

Friendship.belongsTo(User, {
  foreignKey: 'user2',
  as: 'Requestee'
});

// Associations for follows:  
User.hasMany(Follow, {
  foreignKey: 'follower_id',
  onDelete: 'CASCADE',
  as: 'Following'
});

User.hasMany(Follow, {
  foreignKey: 'followee_id',
  onDelete: 'CASCADE',
  as: 'Followers'
});

Follow.belongsTo(User, {
  foreignKey: 'follower_id',
  as: 'Follower'
});

Follow.belongsTo(User, {
  foreignKey: 'followee_id',
  as: 'Followee'
});

// Associations for Notification
User.hasMany(Notification, {
  foreignKey: 'sender_id',
  onDelete: 'CASCADE',
  as: 'SentNotifications'
});

Notification.belongsTo(User, {
  foreignKey: 'sender_id',
  as: 'Sender'
});

User.hasMany(Notification, {
  foreignKey: 'recipient_id',
  onDelete: 'CASCADE',
  as: 'ReceivedNotifications'
});

Notification.belongsTo(User, {
  foreignKey: 'recipient_id',
  as: 'Recipient'
});

// Associations for block 
User.hasMany(Block, { 
  foreignKey: 'blocker_id', 
as: 'blocksMade' 
});

Block.belongsTo(User, { 
  foreignKey: 'blocker_id', 
as: 'blocker' 
});

User.hasMany(Block, { 
  foreignKey: 'blocked_id', 
as: 'blocksReceived' 
});

Block.belongsTo(User, { 
  foreignKey: 'blocked_id', 
as: 'blocked' 
});

User.hasMany(Block, {
  as: 'blocksBlocked',
foreignKey: 'blocker_id' 
});

// Associations for comments: 
User.hasMany(Comment, {
  foreignKey: 'user_id',
  as: 'comments'
});
 
Comment.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

Comment.belongsTo(Comment, {
  foreignKey: 'parent_id',
  as: 'parent'
});

Comment.belongsTo(Travelog, {
  foreignKey: 'travelog_id',
  as: 'travelog'
}); 

Comment.hasMany(Notification, {
  foreignKey: 'comment_id',
  onDelete: 'CASCADE',
  as: 'notifications'
});

Comment.hasMany(Comment, {
  foreignKey: 'parent_id',
  as: 'replies'
});
 
// Associations for trips: 
// User to Trip Association
User.hasMany(Trip, {
  foreignKey: 'user_id',
  onDelete: 'CASCADE',
  as: 'Trips'
});

Trip.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'User'
});

// Trip to Travelog Association
Trip.hasMany(Travelog, {
  foreignKey: 'trip_id',
  onDelete: 'SET NULL',  
  as: 'Travelogs'
});

Travelog.belongsTo(Trip, {
  foreignKey: 'trip_id',
  as: 'Trip'
});

// Trip Comment Associations 
Trip.hasMany(Comment, {
  foreignKey: 'trip_id',
  onDelete: 'CASCADE',
  as: 'Comments'
});

Comment.belongsTo(Trip, {
  foreignKey: 'trip_id',
  as: 'trip'
});
 
// Associations for FeedbackReports:
// FeedbackReport.belongsTo(User, {
//   foreignKey: 'reported_user_id',
//   as: 'ReportedUser'
// });

FeedbackReport.belongsTo(User, {
  foreignKey: 'reported_user_id',
  as: 'ReportedUser',
  onDelete: 'CASCADE',  
});


FeedbackReport.belongsTo(Trip, {
  foreignKey: 'reported_trip_id',
  as: 'ReportedTrip'
});

FeedbackReport.belongsTo(Travelog, {
  foreignKey: 'reported_travelog_id',
  as: 'ReportedTravelog'
});

FeedbackReport.belongsTo(Comment, {
  foreignKey: 'reported_comment_id',
  as: 'ReportedComment'
});

// Corresponding reverse associations:
// User.hasMany(FeedbackReport, {
//   foreignKey: 'reported_user_id',
//   as: 'UserReports'
// });

User.hasMany(FeedbackReport, {
  foreignKey: 'reported_user_id',
  as: 'UserReports',
  onDelete: 'CASCADE',  
});

Trip.hasMany(FeedbackReport, {
  foreignKey: 'reported_trip_id',
  as: 'TripReports',
  onDelete: 'CASCADE',  
});

Travelog.hasMany(FeedbackReport, {
  foreignKey: 'reported_travelog_id',
  as: 'TravelogReports',
  onDelete: 'CASCADE',  
});

Comment.hasMany(FeedbackReport, {
  foreignKey: 'reported_comment_id',
  as: 'CommentReports',
  onDelete: 'CASCADE',  
});

// Message associations 
User.hasMany(Message, {
  foreignKey: 'caller_id',  
  as: 'SentMessages',
  onDelete: 'CASCADE'
});

Message.belongsTo(User, {
  foreignKey: 'caller_id',
  as: 'Sender'
});






// Likes: Profile Likes Associations  
User.hasMany(ProfileLikes, {
  foreignKey: 'user_id',
  onDelete: 'CASCADE',
  as: 'ReceivedProfileLikes'
});

// User to ProfileLikes Association (as the liker)
User.hasMany(ProfileLikes, {
  foreignKey: 'liker_id',
  onDelete: 'CASCADE',
  as: 'GivenProfileLikes'
}); 

// Profile Likes Associations
ProfileLikes.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'UserProfile',
  onDelete: 'CASCADE'
});

ProfileLikes.belongsTo(User, {
  foreignKey: 'liker_id',
  as: 'Liker',
  onDelete: 'CASCADE'
});



// TRIP LIKES ASSOCIATIONS 
// Existing associations
User.hasMany(TripLikes, {
  foreignKey: 'user_id',
  onDelete: 'CASCADE',
  as: 'ReceivedTripLikes'
});

User.hasMany(TripLikes, {
  foreignKey: 'liker_id',
  onDelete: 'CASCADE',
  as: 'GivenTripLikes'
});
 
TripLikes.belongsTo(Trip, {
  foreignKey: 'trip_id',
  as: 'Trip',
  onDelete: 'CASCADE'
});

TripLikes.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'UserProfile',
  onDelete: 'CASCADE'
});

TripLikes.belongsTo(User, {
  foreignKey: 'liker_id',
  as: 'Liker',
  onDelete: 'CASCADE'
});



// TRAVELOG LIKES ASSOCIATIONS
// Existing associations
User.hasMany(TravLikes, {
  foreignKey: 'user_id',
  onDelete: 'CASCADE',
  as: 'ReceivedTravLikes'
});

User.hasMany(TravLikes, {
  foreignKey: 'liker_id',
  onDelete: 'CASCADE',
  as: 'GivenTravLikes'
});

TravLikes.belongsTo(Travelog, {
  foreignKey: 'travelog_id',
  as: 'Travelog',
  onDelete: 'CASCADE'
});

TravLikes.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'UserProfile',
  onDelete: 'CASCADE'
});

TravLikes.belongsTo(User, {
  foreignKey: 'liker_id',
  as: 'Liker',
  onDelete: 'CASCADE'
});



// COMMENT LIKES ASSOCIATIONS
// Existing associations
User.hasMany(CommentLikes, {
  foreignKey: 'user_id',
  onDelete: 'CASCADE',
  as: 'ReceivedCommentLikes'
});

User.hasMany(CommentLikes, {
  foreignKey: 'liker_id',
  onDelete: 'CASCADE',
  as: 'GivenCommentLikes'
});

CommentLikes.belongsTo(Comment, {
  foreignKey: 'comment_id',
  as: 'Comment',
  onDelete: 'CASCADE'
});

CommentLikes.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'UserProfile',
  onDelete: 'CASCADE'
});

CommentLikes.belongsTo(User, {
  foreignKey: 'liker_id',
  as: 'Liker',
  onDelete: 'CASCADE'
});

// IMAGE LIKES ASSOCIATIONS
// Existing associations
User.hasMany(ImageLikes, {
  foreignKey: 'user_id',
  onDelete: 'CASCADE',
  as: 'ReceivedImageLikes'
});

User.hasMany(ImageLikes, {
  foreignKey: 'liker_id',
  onDelete: 'CASCADE',
  as: 'GivenImageLikes'
});

ImageLikes.belongsTo(Image, {
  foreignKey: 'image_id',
  as: 'Image',
  onDelete: 'CASCADE'
});

ImageLikes.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'UserProfile',
  onDelete: 'CASCADE'
});

ImageLikes.belongsTo(User, {
  foreignKey: 'liker_id',
  as: 'Liker',
  onDelete: 'CASCADE'
});

// Associations for Indicator
User.hasOne(Indicator, {
  foreignKey: 'user_id',
  onDelete: 'CASCADE',
  as: 'Indicator'
});

Indicator.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'User'
}); 

// Permission Table Associations
Permission.belongsTo(User, {
  foreignKey: 'granter_id',
  as: 'Granter',
});

Permission.belongsTo(User, {
  foreignKey: 'grantee_id',
  as: 'Grantee',
});

Permission.belongsTo(Trip, {
  foreignKey: 'trip_id',
  as: 'Trip',
});

Permission.belongsTo(Travelog, {
  foreignKey: 'travelog_id',
  as: 'Travelog',
});

module.exports = {
  User, 
  Image, 
  Travelog,
  Comment,
  Friendship,
  Notification,
  Message,
  FeedbackReport,
  Rating,
  ForbiddenWord,
  Follow,
  Block,
  Trip,
  BannedEmails,
  Suspension,
  TipTapContent,
  ProfileLikes,
  TripLikes,
  TravLikes,
  CommentLikes,
  ImageLikes,
  Indicator,
  Permission,
  Maintenance,
  MaintenanceHistory,
  sequelize
};

// sequelize.sync({ force: true })
//   .then(() => {
//     console.log(`Database & tables created!`);
//   });



 