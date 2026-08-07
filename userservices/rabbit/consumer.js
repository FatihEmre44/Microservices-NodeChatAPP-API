const rabbitmq = require('../config/rabbitmq');
const logger = require('../utils/logger');

let consumerTag = null;
let isStarted = false;

function getEventPayload(payload) {
  return payload?.data || payload || {};
}

async function handleMessage(message, userService) {
  if (!message) {
    return;
  }

  try {
    const payload = JSON.parse(message.content.toString());
    const eventName = payload?.event || '';
    const data = getEventPayload(payload);

    logger.info({ event: eventName, payload: data }, 'Consumed RabbitMQ event');

    if (eventName === 'auth.created' || eventName === 'auth.verified') {
      await userService.handleAuthEvent(eventName, data);
    }

    if (rabbitmq.channel) {
      rabbitmq.channel.ack(message);
    }
  } catch (error) {
    logger.error({ err: error.message }, 'Failed to process RabbitMQ message');
    if (rabbitmq.channel) {
      rabbitmq.channel.nack(message, false, false);
    }
  }
}

async function startRabbitConsumer(userService) {
  if (isStarted) {
    return rabbitmq.channel;
  }

  await rabbitmq.connect();
  const result = await rabbitmq.channel.consume(rabbitmq.queueName, (message) => handleMessage(message, userService), { noAck: false });
  consumerTag = result.consumerTag;
  isStarted = true;
  return rabbitmq.channel;
}

async function stopRabbitConsumer() {
  if (rabbitmq.channel && consumerTag) {
    await rabbitmq.channel.cancel(consumerTag);
  }
  consumerTag = null;
  isStarted = false;
}

module.exports = {
  startRabbitConsumer,
  stopRabbitConsumer,
};