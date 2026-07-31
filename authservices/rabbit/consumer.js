const amqp = require('amqplib');

let connection = null;
let channel = null;
let connectionPromise = null;
let consumerTag = null;
let isStarted = false;

function getRabbitUrl() {
	return process.env.RABBITMQ_URL || process.env.RABBIT_URL || 'amqp://guest:guest@127.0.0.1:5672';
}

async function connectRabbit() {
	if (channel) {
		return channel;
	}

	if (!connectionPromise) {
		connectionPromise = (async () => {
			connection = await amqp.connect(getRabbitUrl());
			channel = await connection.createChannel();
			await channel.assertExchange('auth.events', 'topic', { durable: true });
			const queueName = 'auth.events.queue';
			await channel.assertQueue(queueName, { durable: true });
			await channel.bindQueue(queueName, 'auth.events', 'auth.#');

			connection.on('error', (error) => {
				console.error('RabbitMQ consumer connection error:', error);
				channel = null;
				connection = null;
				connectionPromise = null;
				consumerTag = null;
			});

			connection.on('close', () => {
				channel = null;
				connection = null;
				connectionPromise = null;
				consumerTag = null;
			});

			return channel;
		})().catch((error) => {
			connectionPromise = null;
			throw error;
		});
	}

	return connectionPromise;
}

async function handleMessage(message) {
	if (!message) {
		return;
	}

	try {
		const payload = JSON.parse(message.content.toString());
		console.log('Received RabbitMQ auth event:', payload);
		if (channel) {
			channel.ack(message);
		}
	} catch (error) {
		console.warn('Failed to process RabbitMQ message:', error.message);
		if (channel) {
			channel.nack(message, false, false);
		}
	}
}

async function startRabbitConsumer() {
	if (isStarted) {
		return channel;
	}

	const consumerChannel = await connectRabbit();
	const queueName = 'auth.events.queue';
	const result = await consumerChannel.consume(queueName, handleMessage, { noAck: false });
	consumerTag = result.consumerTag;
	isStarted = true;

	return consumerChannel;
}

async function stopRabbitConsumer() {
	if (channel && consumerTag) {
		await channel.cancel(consumerTag);
	}

	consumerTag = null;
	isStarted = false;

	if (connection) {
		await connection.close();
	}

	connection = null;
	channel = null;
	connectionPromise = null;
}

module.exports = {
	startRabbitConsumer,
	stopRabbitConsumer,
};
