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
    const user_id = socket.handshake.query.user_id;
    // console.log('socket.handshake.query.user_id: ', user_id);
    if (user_id) {
      socket.join(user_id);
      // console.log('Rooms:', io.sockets.adapter.rooms);
    }

    socket.on('disconnect', () => {
      // console.log('Client disconnected');
      if (user_id) {
        socket.leave(user_id);
      }
    });
  });

  return io;
}

module.exports = { initializeSocket };
