const express = require('express');
    const http = require('http');
    const { Server } = require('socket.io');
    const cors = require('cors');
    const { v4: uuidv4 } = require('uuid');
    const { Client } = require('pg');

    const app = express();
    app.use(cors());
    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    client.connect()
      .then(() => console.log('Connected to PostgreSQL'))
      .catch(err => console.error('Connection error', err));

    const activeRooms = new Map();

    io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      socket.on('authenticate', async ({ username }, callback) => {
        try {
          const userId = uuidv4();
          await client.query(
            'INSERT INTO users (id, username) VALUES ($1, $2)',
            [userId, username]
          );
          socket.userId = userId;
          socket.username = username;
          callback({ success: true, userId });
        } catch (err) {
          callback({ success: false, error: 'Username already taken' });
        }
      });

      socket.on('joinRoom', (room) => {
        if (!socket.userId) return;
        socket.join(room);
        
        if (!activeRooms.has(room)) {
          activeRooms.set(room, new Set());
        }
        activeRooms.get(room).add(socket.userId);

        client.query(
          'SELECT * FROM messages WHERE room = $1 ORDER BY timestamp ASC LIMIT 100',
          [room],
          (err, res) => {
            if (!err) {
              socket.emit('roomHistory', res.rows);
            }
          }
        );

        io.to(room).emit('userJoined', {
          userId: socket.userId,
          username: socket.username
        });
      });

      socket.on('sendMessage', ({ room, message }) => {
        if (!socket.userId) return;
        const messageId = uuidv4();
        const timestamp = new Date().toISOString();
        
        client.query(
          'INSERT INTO messages (id, room, userId, username, message, timestamp) VALUES ($1, $2, $3, $4, $5, $6)',
          [messageId, room, socket.userId, socket.username, message, timestamp],
          (err) => {
            if (!err) {
              const msg = {
                id: messageId,
                userId: socket.userId,
                username: socket.username,
                message,
                timestamp
              };
              io.to(room).emit('newMessage', msg);
            }
          }
        );
      });

      socket.on('startTyping', (room) => {
        io.to(room).emit('userTyping', {
          userId: socket.userId,
          username: socket.username
        });
      });

      socket.on('stopTyping', (room) => {
        io.to(room).emit('userStoppedTyping', socket.userId);
      });

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.userId);
        activeRooms.forEach((users, room) => {
          if (users.delete(socket.userId)) {
            io.to(room).emit('userLeft', socket.userId);
          }
        });
      });
    });

    server.listen(3000, () => {
      console.log('Server running on port 3000');
    });
