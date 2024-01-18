const express = require('express');
// const { User, Image, Travelog, Comment, Friendship, Notification, Message, FeedbackReport, Rating, ForbiddenWord, Follow, Block, Trip, BannedEmails, Suspension, TipTapContent, ProfileLikes, TripLikes, TravLikes, CommentLikes, ImageLikes, Indicator, Permission, Maintenance, MaintenanceHistory, sequelize } = require('../models');
const { User, sequelize } = require('../models');
const router = express.Router();
  
// Endpoint to get Top 5 Prolific Authors for Trips and Travelogs combined
router.get('/prolific-authors', async (req, res) => {
  try {
    const prolificAuthors = await sequelize.query(`
      SELECT 
        u.user_id, 
        u.username, 
        u.avatar,
        COALESCE(t.trip_entries, 0) + COALESCE(tr.travelog_entries, 0) AS total_entry_count
      FROM Users u
      LEFT JOIN (
        SELECT 
          user_id, 
          COUNT(tripentry) AS trip_entries
        FROM Trips
        WHERE tripentry IS NOT NULL
        GROUP BY user_id
      ) t ON u.user_id = t.user_id
      LEFT JOIN (
        SELECT 
          user_id, 
          COUNT(traventry) AS travelog_entries
        FROM Travelogs
        WHERE traventry IS NOT NULL
        GROUP BY user_id
      ) tr ON u.user_id = tr.user_id
      ORDER BY total_entry_count DESC
      LIMIT 5
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    res.json(prolificAuthors);
  } catch (error) {
    console.error('Error fetching prolific authors:', error);
    res.status(500).send('Server error');
  }
});


// Endpoint to get Top 5 Prolific Authors for Trips
router.get('/prolific-trip-authors', async (req, res) => {
  try {
    const prolificTripAuthors = await sequelize.query(`
      SELECT 
        Users.user_id, 
        Users.username, 
        Users.avatar, 
        COUNT(Trips.tripentry) AS tripentry_count 
      FROM Users
      LEFT JOIN Trips ON Users.user_id = Trips.user_id
      GROUP BY Users.user_id
      ORDER BY tripentry_count DESC
      LIMIT 5
    `, {
      model: User,
      mapToModel: true // Map the returned data to the User model
    });

    res.json(prolificTripAuthors);
  } catch (error) {
    console.error('Error fetching prolific trip authors:', error);
    res.status(500).send('Server error');
  }
});

// Endpoint to get Top 5 Prolific Authors for Travelogs
router.get('/prolific-travelog-authors', async (req, res) => {
  try {
    const prolificTravelogAuthors = await sequelize.query(`
      SELECT 
        Users.user_id, 
        Users.username, 
        Users.avatar, 
        COUNT(Travelogs.traventry) AS traventry_count 
      FROM Users
      LEFT JOIN Travelogs ON Users.user_id = Travelogs.user_id
      GROUP BY Users.user_id
      ORDER BY traventry_count DESC
      LIMIT 5
    `, {
      model: User,
      mapToModel: true // Map the returned data to the User model
    });

    res.json(prolificTravelogAuthors);
  } catch (error) {
    console.error('Error fetching prolific trip authors:', error);
    res.status(500).send('Server error');
  }
});

// Endpoint to get Most Prolific Photographers 
router.get('/prolific-photographers', async (req, res) => {
  try {
    const prolificPhotographers = await sequelize.query(`
      SELECT 
        u.user_id, 
        u.username, 
        u.avatar, 
        COUNT(i.image_id) AS image_count 
      FROM Users u
      LEFT JOIN Travelogs t ON u.user_id = t.user_id
      LEFT JOIN Images i ON t.travelog_id = i.travelog_id
      GROUP BY u.user_id
      ORDER BY image_count DESC 
      LIMIT 5
    `, {
      model: User,
      mapToModel: true // Map the returned data to the User model
    });

    res.json(prolificPhotographers);
  } catch (error) {
    console.error('Error fetching prolific photographers:', error);
    res.status(500).send('Server error');
  }
});

// Endpoint to get Top 5 Users by Follower Count
router.get('/top-followed-users', async (req, res) => {
  try {
    const topFollowedUsers = await sequelize.query(`
      SELECT 
        u.user_id, 
        u.username, 
        u.avatar, 
        COUNT(f.follow_id) AS follower_count 
      FROM Users u
      LEFT JOIN Follows f ON u.user_id = f.followee_id
      GROUP BY u.user_id
      ORDER BY follower_count DESC 
      LIMIT 5
    `, {
      model: User,
      mapToModel: true // Map the returned data to the User model
    });

    res.json(topFollowedUsers);
  } catch (error) {
    console.error('Error fetching top followed users:', error);
    res.status(500).send('Server error');
  }
});

// Endpoint to get Top 5 Most Followed Authors
router.get('/most-followed-authors', async (req, res) => {
  try {
    const mostFollowedAuthors = await sequelize.query(`
      SELECT 
        u.user_id, 
        u.username, 
        u.avatar, 
        COUNT(DISTINCT f.follow_id) AS follower_count
      FROM Users u
      LEFT JOIN Follows f ON u.user_id = f.followee_id
      LEFT JOIN Trips t ON u.user_id = t.user_id
      LEFT JOIN Travelogs tr ON u.user_id = tr.user_id
      WHERE t.tripentry IS NOT NULL OR tr.traventry IS NOT NULL
      GROUP BY u.user_id
      HAVING COUNT(DISTINCT f.follow_id) > 0
      ORDER BY follower_count DESC
      LIMIT 5
    `, {
      model: User,
      mapToModel: true // Map the returned data to the User model
    });

    res.json(mostFollowedAuthors);
  } catch (error) {
    console.error('Error fetching most followed authors:', error);
    res.status(500).send('Server error');
  }
});

// Endpoint to get Top 5 Most Followed Photographers
router.get('/most-followed-photographers', async (req, res) => {
  try {
    const mostFollowedPhotographers = await sequelize.query(`
      SELECT 
        u.user_id, 
        u.username, 
        u.avatar, 
        COUNT(DISTINCT f.follow_id) AS follower_count
      FROM Users u
      LEFT JOIN Follows f ON u.user_id = f.followee_id
      LEFT JOIN Travelogs tr ON u.user_id = tr.user_id
      LEFT JOIN Images i ON tr.travelog_id = i.travelog_id
      WHERE i.image_id IS NOT NULL
      GROUP BY u.user_id
      HAVING COUNT(DISTINCT f.follow_id) > 0
      ORDER BY follower_count DESC
      LIMIT 5
    `, {
      model: User,
      mapToModel: true // Map the returned data to the User model
    });

    res.json(mostFollowedPhotographers);
  } catch (error) {
    console.error('Error fetching most followed photographers:', error);
    res.status(500).send('Server error');
  }
});

// Most liked travelers, tallying all various likes
router.get('/most-liked-travelers', async (req, res) => {
  try {
    const mostLikedTravelers = await sequelize.query(`
      SELECT 
        u.user_id, 
        u.username, 
        u.avatar, 
        COALESCE(pl.like_count, 0) + COALESCE(tl.like_count, 0) + 
        COALESCE(trl.like_count, 0) + COALESCE(il.like_count, 0) +
        COALESCE(cl.like_count, 0) AS total_likes
      FROM users u
      LEFT JOIN (SELECT user_id, COUNT(*) as like_count FROM profile_likes GROUP BY user_id) pl ON u.user_id = pl.user_id
      LEFT JOIN (SELECT user_id, COUNT(*) as like_count FROM trip_likes GROUP BY user_id) tl ON u.user_id = tl.user_id
      LEFT JOIN (SELECT user_id, COUNT(*) as like_count FROM trav_likes GROUP BY user_id) trl ON u.user_id = trl.user_id
      LEFT JOIN (SELECT user_id, COUNT(*) as like_count FROM image_likes GROUP BY user_id) il ON u.user_id = il.user_id
      LEFT JOIN (SELECT user_id, COUNT(*) as like_count FROM comment_likes GROUP BY user_id) cl ON u.user_id = cl.user_id
      ORDER BY total_likes DESC
      LIMIT 5
    `, {
      model: User,
      mapToModel: true // Map the returned data to the User model
    });

    res.json(mostLikedTravelers);
  } catch (error) {
    console.error('Error fetching most liked travelers:', error);
    res.status(500).send('Server error');
  }
});

// Most liked authors including writing likes from profile_likes
router.get('/most-liked-authors', async (req, res) => {
  try {
    const likedAuthors = await sequelize.query(`
      SELECT 
        u.user_id, 
        u.username, 
        u.avatar, 
        COALESCE(SUM(tl.like_count), 0) + COALESCE(SUM(trl.like_count), 0) + COALESCE(SUM(pl.like_count), 0) AS total_likes
      FROM users u
      LEFT JOIN (
        SELECT t.user_id, COUNT(tl.like_id) AS like_count
        FROM trips t
        LEFT JOIN trip_likes tl ON t.trip_id = tl.trip_id
        WHERE tl.liketype = 'writing' AND t.tripentry IS NOT NULL
        GROUP BY t.user_id
      ) tl ON u.user_id = tl.user_id
      LEFT JOIN (
        SELECT tr.user_id, COUNT(trl.like_id) AS like_count
        FROM travelogs tr
        LEFT JOIN trav_likes trl ON tr.travelog_id = trl.travelog_id
        WHERE trl.liketype = 'writing' AND tr.traventry IS NOT NULL
        GROUP BY tr.user_id
      ) trl ON u.user_id = trl.user_id
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS like_count
        FROM profile_likes
        WHERE liketype = 'writing'
        GROUP BY user_id
      ) pl ON u.user_id = pl.user_id
      GROUP BY u.user_id, u.username, u.avatar
      ORDER BY total_likes DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(likedAuthors);
  } catch (error) {
    console.error('Error fetching most liked combined authors:', error);
    res.status(500).send('Server error');
  }
});

// Most liked trip authors including writing likes from profile_likes 
router.get('/most-liked-trip-authors', async (req, res) => {
  try {
    const likedTripAuthors = await sequelize.query(`
      SELECT 
        u.user_id, 
        u.username, 
        u.avatar, 
        COUNT(tl.like_id) AS total_likes
      FROM users u
      JOIN trips t ON u.user_id = t.user_id
      LEFT JOIN trip_likes tl ON t.trip_id = tl.trip_id
      WHERE tl.liketype = 'writing' AND t.tripentry IS NOT NULL
      GROUP BY u.user_id, u.username, u.avatar
      ORDER BY total_likes DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(likedTripAuthors);
  } catch (error) {
    console.error('Error fetching most liked trip authors:', error);
    res.status(500).send('Server error');
  }
});

// Most liked travelog authors including writing likes from profile_likes
router.get('/most-liked-travelog-authors', async (req, res) => {
  try {
    const likedTravelogAuthors = await sequelize.query(`
      SELECT 
        u.user_id, 
        u.username, 
        u.avatar, 
        COUNT(trl.like_id) AS total_likes
      FROM users u
      JOIN travelogs tr ON u.user_id = tr.user_id
      LEFT JOIN trav_likes trl ON tr.travelog_id = trl.travelog_id
      WHERE trl.liketype = 'writing' AND tr.traventry IS NOT NULL
      GROUP BY u.user_id, u.username, u.avatar
      ORDER BY total_likes DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(likedTravelogAuthors);
  } catch (error) {
    console.error('Error fetching most liked travelog authors:', error);
    res.status(500).send('Server error');
  }
});

// Most liked photographers
router.get('/most-liked-photographers', async (req, res) => {
  try {
    const mostLikedPhotographers = await sequelize.query(`
      SELECT 
        u.user_id, 
        u.username, 
        u.avatar, 
        COALESCE(SUM(pl.like_count), 0) + COALESCE(SUM(il.like_count), 0) AS total_likes
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*) as like_count
        FROM profile_likes
        WHERE liketype = 'photography'
        GROUP BY user_id
      ) pl ON u.user_id = pl.user_id
      LEFT JOIN (
        SELECT user_id, COUNT(*) as like_count
        FROM image_likes
        GROUP BY user_id
      ) il ON u.user_id = il.user_id
      GROUP BY u.user_id, u.username, u.avatar
      ORDER BY total_likes DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(mostLikedPhotographers);
  } catch (error) {
    console.error('Error fetching most liked photographers:', error);
    res.status(500).send('Server error');
  }
});

// Endpoint to get users with the most trips
router.get('/top-trip-travelers', async (req, res) => {
  try {
    const topTripTravelers = await sequelize.query(`
      SELECT 
        u.user_id, 
        u.username, 
        u.avatar, 
        COUNT(t.trip_id) AS trip_count
      FROM users u
      JOIN trips t ON u.user_id = t.user_id
      GROUP BY u.user_id
      ORDER BY trip_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(topTripTravelers);
  } catch (error) {
    console.error('Error fetching users with most trips:', error);
    res.status(500).send('Server error');
  }
});

// Endpoint to get users with the most travelogs
router.get('/top-travelog-travelers', async (req, res) => {
  try {
    const topTravelogUsers = await sequelize.query(`
      SELECT 
        u.user_id, 
        u.username, 
        u.avatar, 
        COUNT(tr.travelog_id) AS travelog_count
      FROM users u
      JOIN travelogs tr ON u.user_id = tr.user_id
      GROUP BY u.user_id
      ORDER BY travelog_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(topTravelogUsers);
  } catch (error) {
    console.error('Error fetching users with most travelogs:', error);
    res.status(500).send('Server error');
  }
});



// Endpoint for Most Liked Trips irresepective of like-type
router.get('/most-liked-trips', async (req, res) => {
  try {
    const mostLikedTrips = await sequelize.query(`
      SELECT 
        t.trip_id, 
        t.title, 
        t.image_url,
        COUNT(tl.like_id) AS total_likes
      FROM trips t
      LEFT JOIN trip_likes tl ON t.trip_id = tl.trip_id
      GROUP BY t.trip_id, t.title, t.image_url
      ORDER BY total_likes DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(mostLikedTrips);
  } catch (error) {
    console.error('Error fetching most liked trips:', error);
    res.status(500).send('Server error');
  }
});

// Endpoint for Most Liked Travelogs irresepective of like-type
router.get('/most-liked-travelogs', async (req, res) => {
  try {
    const mostLikedTravelogs = await sequelize.query(`
      SELECT 
        tr.travelog_id, 
        tr.title, 
        i.image_url,
        COUNT(trl.like_id) AS total_likes
      FROM travelogs tr
      LEFT JOIN trav_likes trl ON tr.travelog_id = trl.travelog_id
      LEFT JOIN images i ON tr.travelog_id = i.travelog_id
      GROUP BY tr.travelog_id, tr.title, i.image_url
      ORDER BY total_likes DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(mostLikedTravelogs);
  } catch (error) {
    console.error('Error fetching most liked travelogs:', error);
    res.status(500).send('Server error');
  }
});

// Endpoint for most diverse travelers - travelers who have been to the most countries
router.get('/top-users-by-unique-countries', async (req, res) => {
  try {
    const topUsers = await sequelize.query(`
      SELECT 
        u.user_id, 
        u.username, 
        u.avatar,
        COUNT(DISTINCT tr.country) AS unique_countries_count
      FROM users u
      JOIN travelogs tr ON u.user_id = tr.user_id
      WHERE tr.have_visited = true
      GROUP BY u.user_id, u.username, u.avatar
      ORDER BY unique_countries_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(topUsers);
  } catch (error) {
    console.error('Error fetching top users by unique countries:', error);
    res.status(500).send('Server error');
  }
});


// Endpoint to get top 5 most visited countries
router.get('/countries-most-traveled', async (req, res) => {
  try {
    const countriesMostTraveled = await sequelize.query(`
      SELECT 
        tr.country, 
        COUNT(*) AS like_count
      FROM travelogs tr
      JOIN trav_likes tl ON tr.travelog_id = tl.travelog_id
      WHERE tl.liketype = 'traveled'
      GROUP BY tr.country
      ORDER BY like_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(countriesMostTraveled);
  } catch (error) {
    console.error('Error fetching countries most traveled:', error);
    res.status(500).send('Server error');
  }
});

router.get('/countries-most-want-to-visit', async (req, res) => {
  try {
    const countriesWantToVisit = await sequelize.query(`
      SELECT 
        tr.country, 
        COUNT(*) AS like_count
      FROM travelogs tr
      JOIN trav_likes tl ON tr.travelog_id = tl.travelog_id
      WHERE tl.liketype = 'want-to-travel'
      GROUP BY tr.country
      ORDER BY like_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(countriesWantToVisit);
  } catch (error) {
    console.error('Error fetching countries most want to visit:', error);
    res.status(500).send('Server error');
  }
});

router.get('/countries-most-want-to-revisit', async (req, res) => {
  try {
    const countriesWantToRevisit = await sequelize.query(`
      SELECT 
        tr.country, 
        COUNT(*) AS like_count
      FROM travelogs tr
      JOIN trav_likes tl ON tr.travelog_id = tl.travelog_id
      WHERE tl.liketype = 'retraveled'
      GROUP BY tr.country
      ORDER BY like_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(countriesWantToRevisit);
  } catch (error) {
    console.error('Error fetching countries most want to revisit:', error);
    res.status(500).send('Server error');
  }
});

router.get('/cities-visited', async (req, res) => {
  try {
    const citiesVisited = await sequelize.query(`
      SELECT 
        tr.city, 
        tr.country,
        COUNT(*) AS like_count
      FROM travelogs tr
      JOIN trav_likes tl ON tr.travelog_id = tl.travelog_id
      WHERE tl.liketype = 'traveled'
      GROUP BY tr.city, tr.country
      ORDER BY like_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(citiesVisited);
  } catch (error) {
    console.error('Error fetching cities visited:', error);
    res.status(500).send('Server error');
  }
});

router.get('/cities-most-want-to-visit', async (req, res) => {
  try {
    const citiesWantToVisit = await sequelize.query(`
      SELECT 
        tr.city, 
        tr.country,
        COUNT(*) AS like_count
      FROM travelogs tr
      JOIN trav_likes tl ON tr.travelog_id = tl.travelog_id
      WHERE tl.liketype = 'want-to-travel'
      GROUP BY tr.city, tr.country
      ORDER BY like_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(citiesWantToVisit);
  } catch (error) {
    console.error('Error fetching cities most want to visit:', error);
    res.status(500).send('Server error');
  }
}); 

router.get('/cities-most-want-to-revisit', async (req, res) => {
  try {
    const citiesWantToRevisit = await sequelize.query(`
      SELECT 
        tr.city, 
        tr.country,
        COUNT(*) AS like_count
      FROM travelogs tr
      JOIN trav_likes tl ON tr.travelog_id = tl.travelog_id
      WHERE tl.liketype = 'retraveled'
      GROUP BY tr.city, tr.country
      ORDER BY like_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(citiesWantToRevisit);
  } catch (error) {
    console.error('Error fetching cities most want to revisit:', error);
    res.status(500).send('Server error');
  }
});

router.get('/sites-visited', async (req, res) => {
  try {
    const sitesVisited = await sequelize.query(`
      SELECT 
        tr.site, 
        tr.country,
        COUNT(*) AS like_count
      FROM travelogs tr
      JOIN trav_likes tl ON tr.travelog_id = tl.travelog_id
      WHERE tl.liketype = 'traveled'
      GROUP BY tr.site, tr.country
      ORDER BY like_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(sitesVisited);
  } catch (error) {
    console.error('Error fetching sites visited:', error);
    res.status(500).send('Server error');
  }
}); 

router.get('/sites-most-want-to-visit', async (req, res) => {
  try {
    const sitesWantToVisit = await sequelize.query(`
      SELECT 
        tr.site, 
        tr.country,
        COUNT(*) AS like_count
      FROM travelogs tr
      JOIN trav_likes tl ON tr.travelog_id = tl.travelog_id
      WHERE tl.liketype = 'want-to-travel'
      GROUP BY tr.site, tr.country
      ORDER BY like_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(sitesWantToVisit);
  } catch (error) {
    console.error('Error fetching sites most want to visit:', error);
    res.status(500).send('Server error');
  }
}); 

router.get('/sites-most-want-to-revisit', async (req, res) => {
  try {
    const sitesWantToRevisit = await sequelize.query(`
      SELECT 
        tr.site, 
        tr.country,
        COUNT(*) AS like_count
      FROM travelogs tr
      JOIN trav_likes tl ON tr.travelog_id = tl.travelog_id
      WHERE tl.liketype = 'retraveled'
      GROUP BY tr.site, tr.country
      ORDER BY like_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(sitesWantToRevisit);
  } catch (error) {
    console.error('Error fetching sites most want to revisit:', error);
    res.status(500).send('Server error');
  }
});

// Video Game Sites Most Visited 
router.get('/video-game-sites-visited', async (req, res) => {
  try {
    const sitesVisited = await sequelize.query(`
      SELECT 
        tr.site, 
        COUNT(tl.like_id) AS visit_count, 
        (SELECT image_url FROM images 
         JOIN travelogs t ON t.travelog_id = images.travelog_id
         WHERE t.site = tr.site AND LENGTH(t.video_game_location) > 0
         LIMIT 1) AS image_url
      FROM travelogs tr
      JOIN trav_likes tl ON tr.travelog_id = tl.travelog_id
      WHERE tl.liketype = 'traveled' AND LENGTH(tr.video_game_location) > 0
      GROUP BY tr.site
      ORDER BY visit_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(sitesVisited);
  } catch (error) {
    console.error('Error fetching video game sites visited:', error);
    res.status(500).send('Server error');
  }
});

// Video Game Sites Most Wanted to Visit 
router.get('/video-game-sites-most-want-to-visit', async (req, res) => {
  try {
    const sitesWantToVisit = await sequelize.query(`
      SELECT 
        tr.site, 
        COUNT(tl.like_id) AS want_to_visit_count, 
        (SELECT image_url FROM images 
         JOIN travelogs t ON t.travelog_id = images.travelog_id
         WHERE t.site = tr.site AND LENGTH(t.video_game_location) > 0
         LIMIT 1) AS image_url
      FROM travelogs tr
      JOIN trav_likes tl ON tr.travelog_id = tl.travelog_id
      WHERE tl.liketype = 'want-to-travel' AND LENGTH(tr.video_game_location) > 0
      GROUP BY tr.site
      ORDER BY want_to_visit_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(sitesWantToVisit);
  } catch (error) {
    console.error('Error fetching video game sites most want to visit:', error);
    res.status(500).send('Server error');
  }
});

// Video Game Sites Most Wanted to Revisit 
router.get('/video-game-sites-most-want-to-revisit', async (req, res) => {
  try {
    const sitesWantToRevisit = await sequelize.query(`
      SELECT 
        tr.site, 
        COUNT(tl.like_id) AS want_to_revisit_count, 
        (SELECT image_url FROM images 
         JOIN travelogs t ON t.travelog_id = images.travelog_id
         WHERE t.site = tr.site AND LENGTH(t.video_game_location) > 0
         LIMIT 1) AS image_url
      FROM travelogs tr
      JOIN trav_likes tl ON tr.travelog_id = tl.travelog_id
      WHERE tl.liketype = 'retraveled' AND LENGTH(tr.video_game_location) > 0
      GROUP BY tr.site
      ORDER BY want_to_revisit_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(sitesWantToRevisit);
  } catch (error) {
    console.error('Error fetching video game sites most want to revisit:', error);
    res.status(500).send('Server error');
  }
});


// Film Locations Visited 
router.get('/film-sites-visited', async (req, res) => {
  try {
    const sitesVisited = await sequelize.query(`
      SELECT 
        tr.site, 
        COUNT(tl.like_id) AS visit_count, 
        (SELECT image_url FROM images 
         JOIN travelogs t ON t.travelog_id = images.travelog_id
         WHERE t.site = tr.site AND LENGTH(t.film_location) > 0
         LIMIT 1) AS image_url
      FROM travelogs tr
      JOIN trav_likes tl ON tr.travelog_id = tl.travelog_id
      WHERE tl.liketype = 'traveled' AND LENGTH(tr.film_location) > 0
      GROUP BY tr.site
      ORDER BY visit_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(sitesVisited);
  } catch (error) {
    console.error('Error fetching film sites visited:', error);
    res.status(500).send('Server error');
  }
});

//Film Locadtions Most Want to Visit
router.get('/film-sites-most-want-to-visit', async (req, res) => {
  try {
    const sitesWantToVisit = await sequelize.query(`
      SELECT 
        tr.site, 
        COUNT(tl.like_id) AS want_to_visit_count, 
        (SELECT image_url FROM images 
         JOIN travelogs t ON t.travelog_id = images.travelog_id
         WHERE t.site = tr.site AND LENGTH(t.film_location) > 0
         LIMIT 1) AS image_url
      FROM travelogs tr
      JOIN trav_likes tl ON tr.travelog_id = tl.travelog_id
      WHERE tl.liketype = 'want-to-travel' AND LENGTH(tr.film_location) > 0
      GROUP BY tr.site
      ORDER BY want_to_visit_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(sitesWantToVisit);
  } catch (error) {
    console.error('Error fetching film sites most want to visit:', error);
    res.status(500).send('Server error');
  }
});

// Film Locations Most Want to Revisit  
router.get('/film-sites-most-want-to-revisit', async (req, res) => {
  try {
    const sitesWantToRevisit = await sequelize.query(`
      SELECT 
        tr.site, 
        COUNT(tl.like_id) AS want_to_revisit_count, 
        (SELECT image_url FROM images 
         JOIN travelogs t ON t.travelog_id = images.travelog_id
         WHERE t.site = tr.site AND LENGTH(t.film_location) > 0
         LIMIT 1) AS image_url
      FROM travelogs tr
      JOIN trav_likes tl ON tr.travelog_id = tl.travelog_id
      WHERE tl.liketype = 'retraveled' AND LENGTH(tr.film_location) > 0
      GROUP BY tr.site
      ORDER BY want_to_revisit_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(sitesWantToRevisit);
  } catch (error) {
    console.error('Error fetching film sites most want to revisit:', error);
    res.status(500).send('Server error');
  }
});

// Unesco Sites Most Visited 
router.get('/unesco-sites-visited', async (req, res) => {
  try {
    const sitesVisited = await sequelize.query(`
      SELECT 
        tr.site, 
        COUNT(tl.like_id) AS visit_count, 
        (SELECT image_url FROM images 
         JOIN travelogs t ON t.travelog_id = images.travelog_id
         WHERE t.site = tr.site AND t.unesco = true
         LIMIT 1) AS image_url
      FROM travelogs tr
      JOIN trav_likes tl ON tr.travelog_id = tl.travelog_id
      WHERE tl.liketype = 'traveled' AND tr.unesco = true
      GROUP BY tr.site
      ORDER BY visit_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(sitesVisited);
  } catch (error) {
    console.error('Error fetching UNESCO sites visited:', error);
    res.status(500).send('Server error');
  }
}); 

// Unesco Sites Most Want to Visit 
router.get('/unesco-sites-most-want-to-visit', async (req, res) => {
  try {
    const sitesWantToVisit = await sequelize.query(`
      SELECT 
        tr.site, 
        COUNT(tl.like_id) AS want_to_visit_count, 
        (SELECT image_url FROM images 
         JOIN travelogs t ON t.travelog_id = images.travelog_id
         WHERE t.site = tr.site AND t.unesco = true
         LIMIT 1) AS image_url
      FROM travelogs tr
      JOIN trav_likes tl ON tr.travelog_id = tl.travelog_id
      WHERE tl.liketype = 'want-to-travel' AND tr.unesco = true
      GROUP BY tr.site
      ORDER BY want_to_visit_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(sitesWantToVisit);
  } catch (error) {
    console.error('Error fetching UNESCO sites most want to visit:', error);
    res.status(500).send('Server error');
  }
}); 

//Unesco Sites Most Want to Revisit
router.get('/unesco-sites-most-want-to-revisit', async (req, res) => {
  try {
    const sitesWantToRevisit = await sequelize.query(`
      SELECT 
        tr.site, 
        COUNT(tl.like_id) AS want_to_revisit_count, 
        (SELECT image_url FROM images 
         JOIN travelogs t ON t.travelog_id = images.travelog_id
         WHERE t.site = tr.site AND t.unesco = true
         LIMIT 1) AS image_url
      FROM travelogs tr
      JOIN trav_likes tl ON tr.travelog_id = tl.travelog_id
      WHERE tl.liketype = 'retraveled' AND tr.unesco = true
      GROUP BY tr.site
      ORDER BY want_to_revisit_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(sitesWantToRevisit);
  } catch (error) {
    console.error('Error fetching UNESCO sites most want to revisit:', error);
    res.status(500).send('Server error');
  }
});

//Most Educational Trips
router.get('/educational-trips', async (req, res) => {
  try {
    const educationalTrips = await sequelize.query(`
      SELECT 
        t.trip_id, 
        t.title, 
        COUNT(tl.like_id) AS like_count, 
        t.image_url
      FROM trips t
      JOIN trip_likes tl ON t.trip_id = tl.trip_id
      WHERE tl.liketype = 'educational-trip'
      GROUP BY t.trip_id, t.title, t.image_url
      ORDER BY like_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(educationalTrips);
  } catch (error) {
    console.error('Error fetching educational trips:', error);
    res.status(500).send('Server error');
  }
}); 

//Most Educational Travelogs
router.get('/informative-travelogs', async (req, res) => {
  try {
    const informativeTravelogs = await sequelize.query(`
      SELECT 
        tr.travelog_id, 
        tr.title, 
        COUNT(trl.like_id) AS like_count, 
        (SELECT image_url FROM images WHERE travelog_id = tr.travelog_id LIMIT 1) AS image_url
      FROM travelogs tr
      JOIN trav_likes trl ON tr.travelog_id = trl.travelog_id
      WHERE trl.liketype = 'informative'
      GROUP BY tr.travelog_id, tr.title
      ORDER BY like_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(informativeTravelogs);
  } catch (error) {
    console.error('Error fetching informative travelogs:', error);
    res.status(500).send('Server error');
  }
}); 

// Most Educational Authors 
router.get('/most-educational-authors', async (req, res) => {
  try {
    const educationalAuthors = await sequelize.query(`
      SELECT 
        u.username, 
        u.avatar, 
        (COALESCE(SUM(tl.like_count), 0) + COALESCE(SUM(trl.like_count), 0)) AS total_likes
      FROM users u
      LEFT JOIN (
        SELECT t.user_id, COUNT(tl.like_id) AS like_count
        FROM trips t
        LEFT JOIN trip_likes tl ON t.trip_id = tl.trip_id
        WHERE tl.liketype = 'educational-trip'
        GROUP BY t.user_id
      ) tl ON u.user_id = tl.user_id
      LEFT JOIN (
        SELECT tr.user_id, COUNT(trl.like_id) AS like_count
        FROM travelogs tr
        LEFT JOIN trav_likes trl ON tr.travelog_id = trl.travelog_id
        WHERE trl.liketype = 'informative'
        GROUP BY tr.user_id
      ) trl ON u.user_id = trl.user_id
      GROUP BY u.username, u.avatar
      ORDER BY total_likes DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(educationalAuthors);
  } catch (error) {
    console.error('Error fetching most educational authors:', error);
    res.status(500).send('Server error');
  }
});

//Longest trips
router.get('/longest-trips', async (req, res) => {
  try {
    const longestTrips = await sequelize.query(`
      SELECT 
        t.trip_id, 
        t.title, 
        t.image_url, 
        (t.date_of_return::date - t.date_of_departure::date) AS trip_length
      FROM trips t
      ORDER BY trip_length DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(longestTrips);
  } catch (error) {
    console.error('Error fetching top 5 longest trips:', error);
    res.status(500).send('Server error');
  }
});

//Densest Trips
router.get('/densest-trips', async (req, res) => {
  try {
    const densestTrips = await sequelize.query(`
      SELECT 
        t.trip_id, 
        t.title, 
        t.image_url, 
        COUNT(tr.travelog_id) AS travelog_count
      FROM trips t
      LEFT JOIN travelogs tr ON t.trip_id = tr.trip_id
      GROUP BY t.trip_id
      ORDER BY travelog_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(densestTrips);
  } catch (error) {
    console.error('Error fetching top 5 densest trips:', error);
    res.status(500).send('Server error');
  }
});

router.get('/diverse-trips', async (req, res) => {
  try {
    const diverseTrips = await sequelize.query(`
      SELECT 
        t.trip_id, 
        t.title, 
        t.image_url, 
        COUNT(DISTINCT tr.country) AS country_count
      FROM trips t
      JOIN travelogs tr ON t.trip_id = tr.trip_id
      GROUP BY t.trip_id
      ORDER BY country_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(diverseTrips);
  } catch (error) {
    console.error('Error fetching top 5 most diverse trips:', error);
    res.status(500).send('Server error');
  }
});

//Top 5 most diverse travelers
router.get('/diverse-travelers', async (req, res) => {
  try {
    const diverseTravelers = await sequelize.query(`
      SELECT 
        u.user_id,
        u.username, 
        u.avatar, 
        COUNT(DISTINCT tr.country) AS country_count
      FROM users u
      JOIN travelogs tr ON u.user_id = tr.user_id
      GROUP BY u.user_id
      ORDER BY country_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(diverseTravelers);
  } catch (error) {
    console.error('Error fetching top 5 most diverse travelers:', error);
    res.status(500).send('Server error');
  }
});

//Most divers conversations
router.get('/diverse-trip-conversations', async (req, res) => {
  try {
    const diverseTripConversations = await sequelize.query(`
      SELECT 
        t.trip_id, 
        t.title, 
        t.image_url, 
        COUNT(DISTINCT c.user_id) AS comment_count
      FROM trips t
      JOIN comments c ON t.trip_id = c.trip_id
      GROUP BY t.trip_id
      ORDER BY comment_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(diverseTripConversations);
  } catch (error) {
    console.error('Error fetching most diverse trip conversations:', error);
    res.status(500).send('Server error');
  }
});

//Most diverse travelog conversations
router.get('/diverse-travelog-conversations', async (req, res) => {
  try {
    const diverseTravelogConversations = await sequelize.query(`
      SELECT 
        tr.travelog_id, 
        tr.title, 
        (SELECT image_url FROM images WHERE travelog_id = tr.travelog_id LIMIT 1) AS image_url, 
        COUNT(DISTINCT c.user_id) AS comment_count
      FROM travelogs tr
      JOIN comments c ON tr.travelog_id = c.travelog_id
      GROUP BY tr.travelog_id
      ORDER BY comment_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(diverseTravelogConversations);
  } catch (error) {
    console.error('Error fetching most diverse travelog conversations:', error);
    res.status(500).send('Server error');
  }
});

//Longest trip conversations
router.get('/longest-trip-conversations', async (req, res) => {
  try {
    const longestTripConversations = await sequelize.query(`
      SELECT 
        t.trip_id, 
        t.title, 
        t.image_url, 
        COUNT(c.comment_id) AS comment_count
      FROM trips t
      JOIN comments c ON t.trip_id = c.trip_id
      GROUP BY t.trip_id
      ORDER BY comment_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(longestTripConversations);
  } catch (error) {
    console.error('Error fetching top 5 longest trip conversations:', error);
    res.status(500).send('Server error');
  }
});

//Longest Travelog Conversations
router.get('/longest-travelog-conversations', async (req, res) => {
  try {
    const longestTravelogConversations = await sequelize.query(`
      SELECT 
        tr.travelog_id, 
        tr.title, 
        (SELECT image_url FROM images WHERE travelog_id = tr.travelog_id LIMIT 1) AS image_url, 
        COUNT(c.comment_id) AS comment_count
      FROM travelogs tr
      JOIN comments c ON tr.travelog_id = c.travelog_id
      GROUP BY tr.travelog_id
      ORDER BY comment_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(longestTravelogConversations);
  } catch (error) {
    console.error('Error fetching top 5 longest travelog conversations:', error);
    res.status(500).send('Server error');
  }
});

//Most liked commenters:
router.get('/most-liked-commenters', async (req, res) => {
  try {
    const mostLikedCommenters = await sequelize.query(`
      SELECT 
        u.user_id, 
        u.username, 
        u.avatar, 
        COUNT(cl.like_id) AS like_count
      FROM users u
      JOIN comment_likes cl ON u.user_id = cl.user_id
      WHERE cl.liketype = 'comment'
      GROUP BY u.user_id
      ORDER BY like_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(mostLikedCommenters);
  } catch (error) {
    console.error('Error fetching most liked commenters:', error);
    res.status(500).send('Server error');
  }
});

//Best liked trip comments
router.get('/top-liked-trip-comments', async (req, res) => {
  try {
    const topLikedTripComments = await sequelize.query(`
      SELECT 
        t.trip_id, 
        t.image_url, 
        c.username,
        c.comment_id,
        COUNT(cl.like_id) AS like_count
      FROM trips t
      JOIN comments c ON t.trip_id = c.trip_id
      JOIN comment_likes cl ON c.comment_id = cl.comment_id
      WHERE cl.liketype = 'comment'
      GROUP BY t.trip_id, c.username, c.comment_id, t.image_url
      ORDER BY like_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(topLikedTripComments);
  } catch (error) {
    console.error('Error fetching top liked trip comments:', error);
    res.status(500).send('Server error');
  }
});


//Best liked travelog comments 
router.get('/top-liked-travelog-comments', async (req, res) => {
  try {
    const topLikedTravelogComments = await sequelize.query(`
      SELECT 
        tr.travelog_id, 
        (SELECT image_url FROM images WHERE travelog_id = tr.travelog_id LIMIT 1) AS image_url, 
        c.username,
        c.comment_id,
        COUNT(cl.like_id) AS like_count
      FROM travelogs tr
      JOIN comments c ON tr.travelog_id = c.travelog_id
      JOIN comment_likes cl ON c.comment_id = cl.comment_id
      WHERE cl.liketype = 'comment'
      GROUP BY tr.travelog_id, c.username, c.comment_id
      ORDER BY like_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(topLikedTravelogComments);
  } catch (error) {
    console.error('Error fetching top liked travelog comments:', error);
    res.status(500).send('Server error');
  }
});

//Best liked images
router.get('/top-liked-images', async (req, res) => {
  try {
    const topLikedImages = await sequelize.query(`
      SELECT 
        i.image_id, 
        i.travelog_id, 
        i.image_url, 
        (SELECT title FROM travelogs WHERE travelog_id = i.travelog_id) AS travelog_title, 
        COUNT(il.like_id) AS like_count
      FROM images i
      JOIN image_likes il ON i.image_id = il.image_id
      WHERE il.liketype = 'image'
      GROUP BY i.image_id, i.travelog_id, i.image_url
      ORDER BY like_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(topLikedImages);
  } catch (error) {
    console.error('Error fetching top liked images:', error);
    res.status(500).send('Server error');
  }
});

//Most viewed public profiles
router.get('/most-viewed-profiles', async (req, res) => {
  try {
    const mostViewedProfiles = await sequelize.query(`
      SELECT 
        user_id, 
        username, 
        avatar, 
        view_count
      FROM users
      ORDER BY view_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(mostViewedProfiles);
  } catch (error) {
    console.error('Error fetching most viewed profiles:', error);
    res.status(500).send('Server error');
  }
});

//Most viewed trips
router.get('/most-viewed-trips', async (req, res) => {
  try {
    const mostViewedTrips = await sequelize.query(`
      SELECT 
        trip_id, 
        title, 
        image_url, 
        view_count
      FROM trips
      ORDER BY view_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(mostViewedTrips);
  } catch (error) {
    console.error('Error fetching most viewed trips:', error);
    res.status(500).send('Server error');
  }
});

//Most viewed travelogs
router.get('/most-viewed-travelogs', async (req, res) => {
  try {
    const mostViewedTravelogs = await sequelize.query(`
      SELECT 
        tr.travelog_id, 
        tr.title, 
        tr.view_count,
        (SELECT image_url FROM images WHERE travelog_id = tr.travelog_id LIMIT 1) AS image_url
      FROM travelogs tr
      ORDER BY tr.view_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(mostViewedTravelogs);
  } catch (error) {
    console.error('Error fetching most viewed travelogs:', error);
    res.status(500).send('Server error');
  }
});

//Most viewed images
router.get('/most-viewed-images', async (req, res) => {
  try {
    const mostViewedImages = await sequelize.query(`
      SELECT 
        i.image_url, 
        i.view_count, 
        tr.title, 
        tr.travelog_id
      FROM images i
      JOIN travelogs tr ON i.travelog_id = tr.travelog_id
      ORDER BY i.view_count DESC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    res.json(mostViewedImages);
  } catch (error) {
    console.error('Error fetching most viewed images:', error);
    res.status(500).send('Server error');
  }
});

module.exports = router;
