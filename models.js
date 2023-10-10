// models.js

const { Sequelize, DataTypes, Model } = require('sequelize');
const sequelize = require('./sequelize'); 

// const sequelize = new Sequelize('castletracker', 'kodai', 'ronan', {
//   host: 'localhost',
//   dialect: 'postgres',
//   define: {
//     underscored: true,
//   }
// });

class User extends Model {}
User.init({
  user_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  firstName: DataTypes.STRING,
  lastName: DataTypes.STRING,
  username: DataTypes.STRING,
  email: DataTypes.STRING,
  password: DataTypes.STRING,
  securityQuestion: DataTypes.STRING,
  answer: DataTypes.STRING,
  isAdmin: { type: DataTypes.BOOLEAN, defaultValue: false },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { sequelize, modelName: 'User' });

class Admin extends Model {}
Admin.init({
  adminId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, references: { model: User, key: 'user_id' } },
  inviteKey: DataTypes.STRING,
}, { sequelize, modelName: 'Admin' });

class Directory extends Model {}
Directory.init({
  directory_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: DataTypes.STRING,
  level: DataTypes.STRING,
  parentId: { type: DataTypes.INTEGER, references: { model: Directory, key: 'directory_id' } },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { sequelize, modelName: 'Directory' });

class BlogPost extends Model {}
BlogPost.init({
  blog_post_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, references: { model: User, key: 'user_id' } },
  directory_id: { type: DataTypes.INTEGER, references: { model: Directory, key: 'directory_id' } },
  title: DataTypes.STRING,
  content: DataTypes.TEXT,
  mapSnippet: DataTypes.STRING,
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { sequelize, modelName: 'BlogPost' });

class Comment extends Model {}
Comment.init({
  commentId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  blog_post_id: { type: DataTypes.INTEGER, references: { model: BlogPost, key: 'blog_post_id' } },
  user_id: { type: DataTypes.INTEGER, references: { model: User, key: 'user_id' } },
  content: DataTypes.TEXT,
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { sequelize, modelName: 'Comment' });

class Notification extends Model {}
Notification.init({
  notificationId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, references: { model: User, key: 'user_id' } },
  content: DataTypes.TEXT,
  expiryDate: DataTypes.DATE,
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { sequelize, modelName: 'Notification' });

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
  blog_post_id: { type: DataTypes.INTEGER, references: { model: BlogPost, key: 'blog_post_id' } },
  content: DataTypes.TEXT,
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { sequelize, modelName: 'FeedbackReport' });

class Rating extends Model {}
Rating.init({
  ratingId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  user_id: { type: DataTypes.INTEGER, references: { model: User, key: 'user_id' } },
  blog_post_id: { type: DataTypes.INTEGER, references: { model: BlogPost, key: 'blog_post_id' } },
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

module.exports = {
  User,
  Admin,
  Directory,
  BlogPost,
  Comment,
  Notification,
  Message,
  FeedbackReport,
  Rating,
  ForbiddenWord
};
