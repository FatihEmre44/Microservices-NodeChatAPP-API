const rabbitmq = require('../config/rabbitmq');

let consumerTag = null;
let isStarted = false;

async function handleMessage(message, chatService) {
  if (!message) {
    return;
  }

  try {
    const payload = JSON.parse(message.content.toString());
    const eventName = payload?.event || '';
    const data = payload?.data || payload || {};

    await chatService.handleEvent(eventName, data);

    if (rabbitmq.channel) {
      rabbitmq.channel.ack(message);
    }
  } catch (error) {
    if (rabbitmq.channel) {
      rabbitmq.channel.nack(message, false, false);
    }
  }
}

async function startRabbitConsumer(chatService) {
  if (isStarted) {
    return rabbitmq.channel;
  }

  await rabbitmq.connect();
  const result = await rabbitmq.channel.consume(rabbitmq.queueName, (message) => handleMessage(message, chatService), { noAck: false });
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
