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

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.set('io', io);

io.on('connection', (socket) => {
  socket.on('join-room', (roomId) => {
    if (roomId) {
      socket.join(roomId);
    }
  });
});

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
