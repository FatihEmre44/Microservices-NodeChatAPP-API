const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const authRouter = require('./routers/authrouter');
const { startRabbitConsumer } = require('./rabbit/consumer');
const { notFoundHandler, errorHandler } = require('./middlewares/errorhandler');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const port = Number(process.env.PORT || 4001);
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/authservice';

app.use(cors());
app.use(express.json());

app.use('/auth', authRouter);

app.get('/health', (req, res) => {
	res.status(200).json({
		status: 'ok',
		service: 'authservice',
	});
});

app.use(notFoundHandler);
app.use(errorHandler);

async function start() {
	try {
		await mongoose.connect(mongoUri);
		console.log('MongoDB connected');
	} catch (error) {
		console.warn('MongoDB connection failed:', error.message);
	}

	try {
		await startRabbitConsumer();
		console.log('RabbitMQ consumer started');
	} catch (error) {
		console.warn('RabbitMQ consumer could not start:', error.message);
	}

	app.listen(port, () => {
		console.log(`authservice listening on port ${port}`);
	});
}

start().catch((error) => {
	console.error('Failed to start authservice:', error);
	process.exit(1);
});