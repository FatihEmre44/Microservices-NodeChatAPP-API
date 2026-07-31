const amqp = require('amqplib');

let connection = null;
let channel = null;
let connectionPromise = null;

function getRabbitUrl() {
	return process.env.RABBITMQ_URL || process.env.RABBIT_URL || 'amqp://guest:guest@127.0.0.1:5672';
}

function buildMessage(eventType, payload) {
	return JSON.stringify({
		event: `auth.${eventType}`,
		occurredAt: new Date().toISOString(),
		data: payload,
	});
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

			connection.on('error', (error) => {
				console.error('RabbitMQ connection error:', error);
				channel = null;
				connection = null;
				connectionPromise = null;
			});

			connection.on('close', () => {
				channel = null;
				connection = null;
				connectionPromise = null;
			});

			return channel;
		})().catch((error) => {
			connectionPromise = null;
			throw error;
		});
	}

	return connectionPromise;
}

async function publishAuthEvent(eventType, payload, channelOverride = null) {
	const targetChannel = channelOverride || (await connectRabbit());
	const message = buildMessage(eventType, payload);
	const routingKey = `auth.${eventType}`;

	targetChannel.publish('auth.events', routingKey, Buffer.from(message), {
		contentType: 'application/json',
		persistent: true,
	});

	return true;
}

async function closeRabbit() {
	if (connection) {
		await connection.close();
	}

	connection = null;
	channel = null;
	connectionPromise = null;
}

module.exports = {
	buildMessage,
	connectRabbit,
	publishAuthEvent,
	closeRabbit,
};
