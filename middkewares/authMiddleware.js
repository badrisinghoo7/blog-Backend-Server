const jwt = require("jsonwebtoken");
const HttpError = require("../models/errorModel");

const authMiddleware = async (req, res, next) => {
  const Authorization = req.headers.Authorization || req.headers.authorization;

  if (Authorization && Authorization.startsWith("Bearer")) {
    const token = Authorization.split(" ")[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return next(new HttpError("Authentication failed.Invalid token", 403));
      }
      req.user = user;
      next();
    });
  } else {
    return next(new HttpError("Authentication failed. No token", 402));
  }
};

module.exports = authMiddleware;
