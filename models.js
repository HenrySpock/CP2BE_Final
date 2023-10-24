// models.js

const { Sequelize, DataTypes, Model } = require('sequelize');
// const sequelize = require('sequelize'); 

const DB_USERNAME = process.env.DB_USERNAME
const DB_PASSWORD = process.env.DB_PASSWORD 

const sequelize = new Sequelize('castletracker', DB_USERNAME, DB_PASSWORD, {
  host: 'localhost',
  dialect: 'postgres',
  logging: console.log,
  define: {
    underscored: true,
  }
});

class User extends Model {}
User.init({
  user_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  firstName: DataTypes.STRING,
  lastName: DataTypes.STRING,
  username: { type: DataTypes.STRING, unique: true },
  email: DataTypes.STRING,
  password: DataTypes.STRING,
  securityQuestion: DataTypes.STRING,
  answer: DataTypes.STRING,
  isAdmin: { type: DataTypes.BOOLEAN, defaultValue: false },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  avatar: { type: DataTypes.TEXT, allowNull: true },  // New field avatar
  bio: { type: DataTypes.TEXT, allowNull: true }      // New field bio
}, { sequelize, modelName: 'User' });

class Travelog extends Model {}
Travelog.init({
  travelogId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  userId: { type: DataTypes.INTEGER, references: { model: User, key: 'user_id' } },
  title: { type: DataTypes.STRING(200), allowNull: false },
  site: DataTypes.STRING(200),
  country: DataTypes.STRING(60),
  state: DataTypes.STRING(100), 
  city: DataTypes.STRING(100),
  address: DataTypes.STRING(200),
  phoneNumber: DataTypes.STRING(30),
  latitude: { type: DataTypes.FLOAT, allowNull: true },
  longitude: { type: DataTypes.FLOAT, allowNull: true },
  textBody: { type: DataTypes.TEXT, allowNull: true },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  dateVisited: { type: DataTypes.DATE, allowNull: true },
  isPrivate: { type: DataTypes.BOOLEAN, defaultValue: false },
  reported: { type: Sequelize.BOOLEAN, defaultValue: false } 
}, { sequelize, modelName: 'Travelog' });

// New Images Model
class Image extends Model {}
Image.init({
  image_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  travelog_id: { type: DataTypes.INTEGER, references: { model: Travelog, key: 'travelog_id' } },
  image_url: DataTypes.STRING,
}, { sequelize, modelName: 'Image' });

// When a user interacts ith another person/s posts 
class Interaction extends Model {}
Interaction.init({
  interaction_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, references: { model: User, key: 'user_id' } },
  travelog_id: { type: DataTypes.INTEGER, references: { model: Travelog, key: 'travelog_id' } },
  status: DataTypes.STRING,
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { sequelize, modelName: 'Interaction' });

class Friendship extends Model {}
Friendship.init({
  friendshipId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user1: { type: DataTypes.INTEGER, references: { model: User, key: 'user_id' } },
  user2: { type: DataTypes.INTEGER, references: { model: User, key: 'user_id' } },
  accepted: { type: DataTypes.BOOLEAN, defaultValue: false },
  denied: { type: DataTypes.BOOLEAN, defaultValue: false },
  dismissed: { type: DataTypes.BOOLEAN, defaultValue: false, }
}, { sequelize, modelName: 'Friendship' });

// Update to Notification model to handle type of notification
class Notification extends Model {}
Notification.init({
  notificationId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  sender_id: { type: DataTypes.INTEGER, references: { model: User, key: 'user_id' } },
  recipient_id: { type: DataTypes.INTEGER, references: { model: User, key: 'user_id' } },
  type: { type: DataTypes.STRING, allowNull: false },
  content: DataTypes.TEXT,
  expiryDate: DataTypes.DATE,
  dismissed: { type: DataTypes.BOOLEAN, defaultValue: false },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { sequelize, modelName: 'Notification' });

class Follow extends Model {}
Follow.init({
  // followId: { type: DataTypes.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
  followId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  follower_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: User, key: 'user_id' } },
  followee_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: User, key: 'user_id' } }
}, { sequelize, modelName: 'Follow' });


const Block = sequelize.define('block', {
  blockId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  blocker_id: {    type: Sequelize.INTEGER,    allowNull: false  },
  blocked_id: {    type: Sequelize.INTEGER,    allowNull: false  }
});

module.exports = Block;

class Comment extends Model {}
Comment.init({
  commentId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  travelog_id: { type: DataTypes.INTEGER, references: { model: Travelog, key: 'travelog_id' } },
  user_id: { type: DataTypes.INTEGER, references: { model: User, key: 'user_id' } },
  content: DataTypes.TEXT,
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { sequelize, modelName: 'Comment' });

class Message extends Model {}
Message.init({
  messageId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  senderId: { type: DataTypes.INTEGER, references: { model: User, key: 'user_id' } },
  recipientId: { type: DataTypes.INTEGER, references: { model: User, key: 'user_id' } },
  content: DataTypes.TEXT,
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { sequelize, modelName: 'Message' });

class FeedbackReport extends Model {}
FeedbackReport.init({
  reportId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, references: { model: User, key: 'user_id' } },
  travelog_id: { type: DataTypes.INTEGER, references: { model: Travelog, key: 'travelog_id' } },
  content: DataTypes.TEXT,
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  name: { type: DataTypes.STRING, allowNull: false },  // new field for name
  email: { type: DataTypes.STRING, allowNull: false },  // new field for email
}, { sequelize, modelName: 'FeedbackReport' });

class Rating extends Model {}
Rating.init({
  ratingId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, references: { model: User, key: 'user_id' } },
  travelog_id: { type: DataTypes.INTEGER, references: { model: Travelog, key: 'travelog_id' } },
  ratingColor: DataTypes.STRING,
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { sequelize, modelName: 'Rating' });

class ForbiddenWord extends Model {}
ForbiddenWord.init({
  wordId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  word: DataTypes.STRING,
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { sequelize, modelName: 'ForbiddenWord' });

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

module.exports = {
  User, 
  Image,
  Interaction,
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
  sequelize
};

sequelize.sync({ force: true })
  .then(() => {
    console.log(`Database & tables created!`);
  });