const path = require('path');
const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Server } = require('socket.io');
const { startRabbitConsumer } = require('./rabbit/consumer');
const chatRouter = require('./routers/chatrouter');
const ChatService = require('./services/chatservice');
const socketAuthMiddleware = require('./sockets/authMiddleware');
const DirectRoom = require('./models/directroom');
const GroupRoom = require('./models/grouproom');
const Message = require('./models/message');
const { notFoundHandler, errorHandler } = require('./middlewares/errorhandler');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const server = http.createServer(app);
const port = Number(process.env.PORT || 4003);
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/chatservice';
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

// ── Multi-device Map: phoneNumber → Set<socket> ──
const onlineSockets = new Map();

function addSocket(phoneNumber, socket) {
  if (!onlineSockets.has(phoneNumber)) {
    onlineSockets.set(phoneNumber, new Set());
  }
  onlineSockets.get(phoneNumber).add(socket);
}

function removeSocket(phoneNumber, socket) {
  const sockets = onlineSockets.get(phoneNumber);
  if (sockets) {
    sockets.delete(socket);
    if (sockets.size === 0) {
      onlineSockets.delete(phoneNumber);
    }
  }
}

function getSocketsForPhone(phoneNumber) {
  return onlineSockets.get(phoneNumber) || new Set();
}

// ── Express middleware ──
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.set('io', io);

// ── Socket.io auth middleware ──
io.use(socketAuthMiddleware);

// ── Socket.io connection handler ──
io.on('connection', async (socket) => {
  const phoneNumber = socket.phoneNumber;
  console.log(`Socket connected: ${phoneNumber} (${socket.id})`);

  // Multi-device Map'e ekle
  addSocket(phoneNumber, socket);

  // Kullanıcının üye olduğu tüm GroupRoom'ları bul ve socket.join() yap
  try {
    const groupRooms = await GroupRoom.find(
      { participants: phoneNumber },
      { _id: 1 }
    ).lean().exec();

    for (const room of groupRooms) {
      socket.join(room._id.toString());
    }

    if (groupRooms.length > 0) {
      console.log(`${phoneNumber} joined ${groupRooms.length} group room(s)`);
    }
  } catch (error) {
    console.error('GroupRoom auto-join failed:', error.message);
  }

  // ── sendMessage handler ──
  socket.on('sendMessage', async (data, ack) => {
    try {
      const { roomId, content } = data || {};

      if (!roomId || !content || typeof content !== 'string' || !content.trim()) {
        if (typeof ack === 'function') {
          ack({ success: false, message: 'roomId and content are required' });
        }
        return;
      }

      // Odanın türünü ve erişim hakkını kontrol et
      const [directRoom, groupRoom] = await Promise.all([
        DirectRoom.findOne({ _id: roomId, participants: phoneNumber }).lean().exec(),
        GroupRoom.findOne({ _id: roomId, participants: phoneNumber }).lean().exec(),
      ]);

      const room = groupRoom || directRoom;
      if (!room) {
        if (typeof ack === 'function') {
          ack({ success: false, message: 'Room not found or access denied' });
        }
        return;
      }

      const roomType = groupRoom ? 'group' : 'direct';

      // Mesajı DB'ye kaydet
      const message = await Message.create({
        roomId: room._id,
        roomType,
        senderId: phoneNumber,
        content: content.trim(),
      });

      const messagePayload = {
        _id: message._id.toString(),
        roomId: room._id.toString(),
        roomType,
        senderId: phoneNumber,
        content: message.content,
        createdAt: message.createdAt,
      };

      if (roomType === 'group') {
        // Grup mesajı: odaya broadcast (gönderen dahil)
        io.to(room._id.toString()).emit('newMessage', messagePayload);
      } else {
        // Direkt mesaj: karşı tarafın socket'lerini Map'ten bul ve gönder
        const otherPhoneNumber = room.participants.find((p) => p !== phoneNumber);

        // Gönderenin kendi diğer cihazlarına da ilet
        const senderSockets = getSocketsForPhone(phoneNumber);
        for (const s of senderSockets) {
          if (s.id !== socket.id) {
            s.emit('newMessage', messagePayload);
          }
        }

        // Karşı tarafa gönder
        if (otherPhoneNumber) {
          const otherSockets = getSocketsForPhone(otherPhoneNumber);
          for (const s of otherSockets) {
            s.emit('newMessage', messagePayload);
          }
        }

        // Gönderen socket'e de (kendi mesajını onaylamak için)
        socket.emit('newMessage', messagePayload);
      }

      if (typeof ack === 'function') {
        ack({ success: true, data: messagePayload });
      }
    } catch (error) {
      console.error('sendMessage error:', error.message);
      if (typeof ack === 'function') {
        ack({ success: false, message: 'Failed to send message' });
      }
    }
  });

  // ── Disconnect handler ──
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${phoneNumber} (${socket.id})`);
    removeSocket(phoneNumber, socket);
  });
});

// ── Health endpoint ──
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'chatservice',
  });
});

app.use('/chats', chatRouter);

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
  try {
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected');
  } catch (error) {
    console.warn('MongoDB connection failed:', error.message);
  }

  const chatService = new ChatService();

  try {
    await startRabbitConsumer(chatService);
    console.log('RabbitMQ consumer started');
  } catch (error) {
    console.warn('RabbitMQ consumer could not start:', error.message);
  }

  server.listen(port, () => {
    console.log(`chatservice listening on port ${port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start chatservice:', error);
  process.exit(1);
});
