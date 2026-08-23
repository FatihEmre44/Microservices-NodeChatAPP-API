const rabbitmq = require('../config/rabbitmq');

async function publishChatEvent(eventType, payload, routingKey = null) {
  const resolvedRoutingKey = routingKey || eventType;
  await rabbitmq.publish(eventType, payload, resolvedRoutingKey);
  return true;
}

module.exports = {
  publishChatEvent,
};
