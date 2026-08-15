/**
 * DropShare — Redis Connection
 *
 * We need TWO separate Redis clients:
 *   - publisher: for sending events
 *   - subscriber: for receiving events (a subscribed client can ONLY
 *     receive — it cannot issue regular commands)
 *
 * This is a Redis pub/sub constraint, not an ioredis limitation.
 *
 * Why Redis at all?
 *   In a single-node deployment, Socket.IO's in-memory state is
 *   sufficient. But with multiple EC2 instances behind an ALB:
 *     Client A → EC2-1
 *     Client B → EC2-2
 *   EC2-1 has no knowledge of Client B's socket. Redis Pub/Sub lets
 *   EC2-1 publish an event that EC2-2 receives and relays to Client B.
 *   File data NEVER flows through Redis — only small control messages.
 */

'use strict';

const Redis = require('ioredis');
const config = require('../config/env');
const logger = require('../utils/logger');

function createRedisClient(name) {
  const client = new Redis(config.REDIS_URL, {
    // Retry on connection failure with exponential backoff
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000);
      logger.warn(`Redis [${name}] retry attempt`, { attempt: times, delay_ms: delay });
      return delay;
    },
    maxRetriesPerRequest: null, // Required for ioredis subscriber mode
    enableReadyCheck: true,
    lazyConnect: false,
  });

  client.on('connect', () => {
    logger.info(`Redis [${name}] connected`);
  });

  client.on('ready', () => {
    logger.info(`Redis [${name}] ready`);
  });

  client.on('error', (err) => {
    logger.error(`Redis [${name}] error`, { error: err.message });
  });

  client.on('close', () => {
    logger.warn(`Redis [${name}] connection closed`);
  });

  return client;
}

// Singleton clients — created once and reused throughout the process
const publisher  = createRedisClient('publisher');
const subscriber = createRedisClient('subscriber');

// A third general client for SET/GET/DEL operations (presence tracking)
const redisClient = createRedisClient('client');

async function closeRedis() {
  await Promise.all([
    publisher.quit(),
    subscriber.quit(),
    redisClient.quit(),
  ]);
  logger.info('All Redis connections closed');
}

module.exports = { publisher, subscriber, redisClient, closeRedis };
