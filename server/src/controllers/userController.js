/**
 * DropShare — User Controller
 */

'use strict';

const userService = require('../services/userService');
const { HTTP_STATUS } = require('../constants');

async function searchUsers(req, res, next) {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
      return res.status(HTTP_STATUS.OK).json({ success: true, data: { users: [] } });
    }
    const users = await userService.searchUsers(q, req.user.userId);
    return res.status(HTTP_STATUS.OK).json({ success: true, data: { users } });
  } catch (err) {
    next(err);
  }
}

async function getUserStatus(req, res, next) {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'User not found' });
    }
    const online = await userService.isUserOnline(id);
    return res.status(HTTP_STATUS.OK).json({ success: true, data: { ...user, online } });
  } catch (err) {
    next(err);
  }
}

module.exports = { searchUsers, getUserStatus };
