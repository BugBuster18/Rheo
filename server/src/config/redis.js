'use strict';

const EventEmitter = require('events');
const logger = require('../utils/logger');

class MockRedis extends EventEmitter {
  constructor() {
    super();
    this.store = new Map();
  }

  async get(key) {
    return this.store.get(key) || null;
  }

  async set(key, val) {
    this.store.set(key, val);
    return 'OK';
  }

  async del(key) {
    this.store.delete(key);
    return 1;
  }

  async exists(key) {
    return this.store.has(key) ? 1 : 0;
  }

  pipeline() {
    const operations = [];
    const chain = {
      exists: (key) => {
        operations.push(async () => [null, this.store.has(key) ? 1 : 0]);
        return chain;
      },
      exec: async () => {
        return Promise.all(operations.map(op => op()));
      }
    };
    return chain;
  }

  async quit() {
    logger.info('Mock Redis quit');
  }

  async subscribe(ch) {
    logger.info(`Mock Redis subscribed to channel`, { channel: ch });
  }

  async publish(ch, msg) {
    logger.debug(`Mock Redis published event`, { channel: ch });
    this.emit('message', ch, msg);
  }
}

const mock = new MockRedis();

module.exports = {
  publisher: mock,
  subscriber: mock,
  redisClient: mock,
  closeRedis: async () => mock.quit(),
};
