import { body, validationResult, param } from 'express-validator';
import mongoose from 'mongoose';

export const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg
      }))
    });
  };
};

export const validateObjectId = (field = 'id') => {
  return param(field).custom((value) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new Error('Invalid ID format');
    }
    return true;
  });
};

export const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail()
    .toLowerCase(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

export const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail()
    .toLowerCase(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

export const roomValidation = [
  body('number')
    .notEmpty()
    .withMessage('Room number is required')
    .trim(),
  body('capacity')
    .isInt({ min: 1 })
    .withMessage('Capacity must be a number and at least 1')
];

export const roomUpdateValidation = [
  body('number')
    .optional()
    .notEmpty()
    .withMessage('Room number cannot be empty')
    .trim(),
  body('capacity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Capacity must be a number and at least 1'),
  body('assignedAgentId')
    .optional()
    .custom((value) => {
      if (value !== null && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid agent ID format');
      }
      return true;
    })
];

export const agentValidation = [
  body('name')
    .notEmpty()
    .withMessage('Agent name is required')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Agent name cannot be empty')
];

export const guestValidation = [
  body('name')
    .notEmpty()
    .withMessage('Guest name is required')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Guest name cannot be empty'),
  body('agentId')
    .optional()
    .custom((value) => {
      if (value !== null && value !== undefined && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid agent ID format');
      }
      return true;
    }),
  body('roomId')
    .notEmpty()
    .withMessage('Room ID is required')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid room ID format');
      }
      return true;
    }),
  body('checkInDate')
    .optional()
    .isISO8601()
    .withMessage('Check-in date must be a valid date'),
  body('expectedCheckOutDate')
    .optional()
    .isISO8601()
    .withMessage('Expected check-out date must be a valid date')
    .custom((value, { req }) => {
      if (value && req.body.checkInDate) {
        const checkIn = new Date(req.body.checkInDate);
        const checkOut = new Date(value);
        if (checkOut <= checkIn) {
          throw new Error('Expected check-out date must be after check-in date');
        }
      }
      return true;
    })
];

