const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { startRabbitConsumer } = require('./rabbit/consumer');
const userRouter = require('./routers/userrouter');
const User = require('./models/usermodel');
const UserService = require('./services/userservices');
const { notFoundHandler, errorHandler } = require('./middlewares/errorhandler');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const port = Number(process.env.PORT || 4002);
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/userservice';

app.use(express.json());

app.get('/health', (req, res) => {
	res.status(200).json({
		status: 'ok',
		service: 'userservice',
	});
});

app.use('/users', userRouter);

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
	try {
		await mongoose.connect(mongoUri);
		console.log('MongoDB connected');
	} catch (error) {
		console.warn('MongoDB connection failed:', error.message);
	}

	const userService = new UserService(User);

	try {
		await startRabbitConsumer(userService);
		console.log('RabbitMQ consumer started');
	} catch (error) {
		console.warn('RabbitMQ consumer could not start:', error.message);
	}

	app.listen(port, () => {
		console.log(`userservice listening on port ${port}`);
	});
}

start().catch((error) => {
	console.error('Failed to start userservice:', error);
	process.exit(1);
});