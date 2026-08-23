const amqp = require('amqplib');

class RabbitMQConfig {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.connectionPromise = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = Number(process.env.RABBITMQ_MAX_RECONNECT_ATTEMPTS || 10);
    this.reconnectDelayMs = Number(process.env.RABBITMQ_RECONNECT_DELAY_MS || 2000);
    this.exchangeName = process.env.RABBITMQ_EXCHANGE_NAME || 'chat.events';
    this.authExchangeName = process.env.RABBITMQ_AUTH_EXCHANGE_NAME || 'auth.events';
    this.userExchangeName = process.env.RABBITMQ_USER_EXCHANGE_NAME || 'user.events';
    this.dlxExchangeName = process.env.RABBITMQ_DLX_EXCHANGE_NAME || 'chat.events.dlx';
    this.queueName = process.env.RABBITMQ_QUEUE_NAME || 'chat.events.queue';
    this.dlqQueueName = process.env.RABBITMQ_DLQ_QUEUE_NAME || 'chat.events.dlq';
    this.url = process.env.RABBITMQ_URL || process.env.RABBIT_URL || 'amqp://guest:guest@127.0.0.1:5672';
  }

  getConnectionUrl() {
    return this.url;
  }

  async connect() {
    if (this.channel) {
      return this.channel;
    }

    if (!this.connectionPromise) {
      this.connectionPromise = this._connectWithRetry();
    }

    return this.connectionPromise;
  }

  async _connectWithRetry() {
    try {
      this.connection = await amqp.connect(this.getConnectionUrl());
      this.connection.on('error', () => {
        this.channel = null;
        this.connection = null;
        this.connectionPromise = null;
      });
      this.connection.on('close', () => {
        this.channel = null;
        this.connection = null;
        this.connectionPromise = null;
        this.reconnectAttempts = 0;
      });

      this.channel = await this.connection.createConfirmChannel();
      await this.channel.assertExchange(this.exchangeName, 'topic', { durable: true });
      await this.channel.assertExchange(this.authExchangeName, 'topic', { durable: true });
      await this.channel.assertExchange(this.userExchangeName, 'topic', { durable: true });
      await this.channel.assertExchange(this.dlxExchangeName, 'topic', { durable: true });
      await this.channel.assertQueue(this.queueName, {
        durable: true,
        deadLetterExchange: this.dlxExchangeName,
        deadLetterRoutingKey: this.dlqQueueName,
      });
      await this.channel.assertQueue(this.dlqQueueName, { durable: true });
      await this.channel.bindQueue(this.queueName, this.exchangeName, 'chat.#');
      await this.channel.bindQueue(this.queueName, this.authExchangeName, 'auth.#');
      await this.channel.bindQueue(this.queueName, this.userExchangeName, 'user.#');
      await this.channel.bindQueue(this.dlqQueueName, this.dlxExchangeName, this.dlqQueueName);
      await this.channel.prefetch(10);
      this.reconnectAttempts = 0;
      return this.channel;
    } catch (error) {
      this.connectionPromise = null;
      this.reconnectAttempts += 1;
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        await new Promise((resolve) => setTimeout(resolve, this.reconnectDelayMs));
        return this._connectWithRetry();
      }
      throw error;
    }
  }

  async publish(eventType, payload, routingKey = null) {
    const channel = await this.connect();
    const message = JSON.stringify({
      event: eventType,
      occurredAt: new Date().toISOString(),
      data: payload,
    });
    const key = routingKey || eventType;
    channel.publish(this.exchangeName, key, Buffer.from(message), {
      contentType: 'application/json',
      persistent: true,
    });
    await channel.waitForConfirms();
    return true;
  }

  async close() {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
    this.channel = null;
    this.connection = null;
    this.connectionPromise = null;
  }
}

module.exports = new RabbitMQConfig();
