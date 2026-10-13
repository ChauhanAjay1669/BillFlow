import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Business } from '../models/Business.js';

export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route. Please login.',
    });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.warn('[Auth] WARNING: JWT_SECRET not set. Using insecure default for development.');
    }
    const decoded = jwt.verify(token, jwtSecret || 'billflow_dev_only_secret_change_me');
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
      });
    }

    req.user = user;

    // Attach active business
    let business = await Business.findOne({ userId: user._id });
    if (!business) {
      // Auto-create a default business if somehow missing
      business = await Business.create({
        userId: user._id,
        businessName: `${user.name}'s Enterprises`,
      });
    }
    req.business = business;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token is invalid or expired.',
      error: error.message,
    });
  }
};
