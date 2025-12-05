import express from 'express';
import Room from '../models/Room.js';
import Guest from '../models/Guest.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/auth.js';
import { validate, validateObjectId, roomValidation } from '../middleware/validation.js';

const router = express.Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const rooms = await Room.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(rooms);
  } catch (error) {
    next(error);
  }
});

router.post('/', validate(roomValidation), async (req, res, next) => {
  try {
    const { number, capacity } = req.body;

    const existingRoom = await Room.findOne({ userId: req.user._id, number });
    if (existingRoom) {
      return res.status(400).json({ error: 'Room number already exists' });
    }

    const room = await Room.create({
      userId: req.user._id,
      number,
      capacity
    });

    res.status(201).json(room);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', validateObjectId(), authorize(Room), async (req, res, next) => {
  try {
    res.json(req.resource);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', validateObjectId(), authorize(Room), validate(roomValidation), async (req, res, next) => {
  try {
    const { number, capacity } = req.body;

    if (number && number !== req.resource.number) {
      const existingRoom = await Room.findOne({ userId: req.user._id, number });
      if (existingRoom) {
        return res.status(400).json({ error: 'Room number already exists' });
      }
    }

    Object.assign(req.resource, { number, capacity });
    await req.resource.save();

    res.json(req.resource);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', validateObjectId(), authorize(Room), async (req, res, next) => {
  try {
    const activeGuests = await Guest.findOne({
      roomId: req.resource._id,
      checkedOut: false
    });

    if (activeGuests) {
      return res.status(400).json({ error: 'Cannot delete room with active guests' });
    }

    await Room.findByIdAndDelete(req.resource._id);
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/guests', validateObjectId(), authorize(Room), async (req, res, next) => {
  try {
    const guests = await Guest.find({
      roomId: req.resource._id,
      userId: req.user._id
    })
      .populate('agentId', 'name')
      .populate('roomId', 'number capacity')
      .sort({ checkInDate: -1 });

    res.json(guests);
  } catch (error) {
    next(error);
  }
});

export default router;

