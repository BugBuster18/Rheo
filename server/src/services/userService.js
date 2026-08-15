/**
 * DropShare — User Service (Prisma)
 *
 * Search, profile, presence enrichment, and last_seen update.
 */

'use strict';

const { prisma }        = require('../config/db');
const { getBulkPresence, isUserOnline: redisIsUserOnline } = require('../redis/presence');
const logger = require('../utils/logger');

/**
 * Search for users by username prefix (case-insensitive).
 * Excludes the searching user. Enriches results with real-time presence.
 *
 * @param {string} query       - Search term
 * @param {string} requesterId - Excluded from results
 * @returns {Promise<Array>}
 */
async function searchUsers(query, requesterId) {
  if (!query || query.trim().length < 1) return [];

  const users = await prisma.user.findMany({
    where: {
      username: { contains: query.trim(), mode: 'insensitive' },
      id:       { not: requesterId },
    },
    select: {
      id:          true,
      username:    true,
      displayName: true,
      lastSeen:    true,
    },
    orderBy: { username: 'asc' },
    take: 20,
  });


  if (users.length === 0) return [];

  // Enrich with real-time online status from Redis
  const userIds    = users.map(u => u.id);
  const presenceMap = await getBulkPresence(userIds);

  return users.map(u => ({
    id:          u.id,
    username:    u.username,
    displayName: u.displayName,
    lastSeen:    u.lastSeen,
    online:      presenceMap[u.id] || false,
  }));
}

/**
 * Get a user's public profile by ID.
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
async function getUserById(userId) {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, username: true, displayName: true, lastSeen: true },
  });
  return user || null;
}

/**
 * Get online status for a single user (via Redis).
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
async function isUserOnline(userId) {
  return redisIsUserOnline(userId);
}

/**
 * Update last_seen timestamp. Called on WebSocket disconnect.
 * @param {string} userId
 */
async function updateLastSeen(userId) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data:  { lastSeen: new Date() },
    });
  } catch (err) {
    logger.warn('Failed to update user lastSeen', { userId, error: err.message });
  }
}

module.exports = { searchUsers, getUserById, isUserOnline, updateLastSeen };
