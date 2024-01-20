// socketManager.js
const socketIo = require('socket.io');

function initializeSocket(server) {
  const io = socketIo(server, {
    cors: {
      // origin: "http://localhost:3000",  // allowing connections from frontend
      origin: "https://castlingfe.onrender.com",  // allowing connections from frontend
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    // console.log('New client connected'); 
    const userId = socket.handshake.query.userId;
    // console.log('socket.handshake.query.userId: ', userId);
    if (userId) {
      socket.join(userId);
      // console.log('Rooms:', io.sockets.adapter.rooms);
    }

    socket.on('disconnect', () => {
      // console.log('Client disconnected');
      if (userId) {
        socket.leave(userId);
      }
    });
  });

  return io;
}

module.exports = { initializeSocket };
