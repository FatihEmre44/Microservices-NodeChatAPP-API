const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { startRabbitConsumer } = require('./rabbit/consumer');
const userRouter = require('./routers/userrouter');
const UserRepository = require('./repositories/userrepository');
const UserService = require('./services/userservice');
const { notFoundHandler, errorHandler } = require('./middlewares/errorhandler');
const logger = require('./utils/logger');

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
		logger.info('MongoDB connected');
	} catch (error) {
		logger.warn({ err: error.message }, 'MongoDB connection failed');
	}

	const userService = new UserService(new UserRepository());

	try {
		await startRabbitConsumer(userService);
		logger.info('RabbitMQ consumer started');
	} catch (error) {
		logger.warn({ err: error.message }, 'RabbitMQ consumer could not start');
	}

	app.listen(port, () => {
		logger.info(`userservice listening on port ${port}`);
	});
}

start().catch((error) => {
	logger.error({ err: error.message }, 'Failed to start userservice');
	process.exit(1);
});