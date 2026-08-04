const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { startRabbitConsumer } = require('./rabbit/consumer');
const { notFoundHandler, errorHandler } = require('./middlewares/errorhandler');

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

app.use(notFoundHandler);
app.use(errorHandler);