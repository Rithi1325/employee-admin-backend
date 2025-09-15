const { authorize } = require('./auth');

exports.adminOnly = (req, res, next) => {
  authorize('admin')(req, res, next);
};