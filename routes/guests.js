import express from 'express';
import mongoose from 'mongoose';
import Guest from '../models/Guest.js';
import Room from '../models/Room.js';
import Agent from '../models/Agent.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/auth.js';
import { validate, validateObjectId, guestValidation } from '../middleware/validation.js';

const router = express.Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { checkedOut, roomId, agentId } = req.query;
    const query = { userId: req.user._id };

    if (checkedOut !== undefined) {
      query.checkedOut = checkedOut === 'true';
    }

    if (roomId) {
      if (!mongoose.Types.ObjectId.isValid(roomId)) {
        return res.status(400).json({ error: 'Invalid room ID format' });
      }
      query.roomId = roomId;
    }

    if (agentId) {
      if (!mongoose.Types.ObjectId.isValid(agentId)) {
        return res.status(400).json({ error: 'Invalid agent ID format' });
      }
      query.agentId = agentId;
    }

    const guests = await Guest.find(query)
      .populate('agentId', 'name')
      .populate('roomId', 'number capacity')
      .sort({ checkInDate: -1 });

    res.json(guests);
  } catch (error) {
    next(error);
  }
});

router.post('/', validate(guestValidation), async (req, res, next) => {
  try {
    const { name, agentId, roomId, expectedCheckOutDate } = req.body;

    const agent = await Agent.findOne({ _id: agentId, userId: req.user._id });
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const room = await Room.findOne({ _id: roomId, userId: req.user._id });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!room.hasAvailableBeds()) {
      return res.status(400).json({ error: 'Room is at full capacity' });
    }

    const guest = await Guest.create({
      userId: req.user._id,
      name: name.trim(),
      agentId,
      roomId,
      expectedCheckOutDate: expectedCheckOutDate ? new Date(expectedCheckOutDate) : undefined
    });

    room.occupiedBeds += 1;
    await room.save();

    const populatedGuest = await Guest.findById(guest._id)
      .populate('agentId', 'name')
      .populate('roomId', 'number capacity');

    res.status(201).json(populatedGuest);
  } catch (error) {
    next(error);
  }
});

router.get('/search', async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const searchRegex = new RegExp(q.trim(), 'i');

    const guests = await Guest.find({
      userId: req.user._id,
      checkedOut: false,
      $or: [
        { name: searchRegex }
      ]
    })
      .populate('agentId', 'name')
      .populate('roomId', 'number capacity')
      .sort({ checkInDate: -1 });

    const filteredGuests = guests.filter(guest => {
      const nameMatch = searchRegex.test(guest.name);
      const roomMatch = guest.roomId && searchRegex.test(guest.roomId.number);
      const agentMatch = guest.agentId && searchRegex.test(guest.agentId.name);
      return nameMatch || roomMatch || agentMatch;
    });

    res.json(filteredGuests);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', validateObjectId(), async (req, res, next) => {
  try {
    const guest = await Guest.findOne({
      _id: req.params.id,
      userId: req.user._id
    })
      .populate('agentId', 'name')
      .populate('roomId', 'number capacity');

    if (!guest) {
      return res.status(404).json({ error: 'Guest not found' });
    }

    res.json(guest);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', validateObjectId(), async (req, res, next) => {
  try {
    const guest = await Guest.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!guest) {
      return res.status(404).json({ error: 'Guest not found' });
    }

    if (guest.checkedOut) {
      return res.status(400).json({ error: 'Cannot update checked-out guest' });
    }

    const { name, agentId, roomId, expectedCheckOutDate } = req.body;

    if (name) {
      guest.name = name.trim();
    }

    if (agentId) {
      if (!mongoose.Types.ObjectId.isValid(agentId)) {
        return res.status(400).json({ error: 'Invalid agent ID format' });
      }
      const agent = await Agent.findOne({ _id: agentId, userId: req.user._id });
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      guest.agentId = agentId;
    }

    if (roomId) {
      if (!mongoose.Types.ObjectId.isValid(roomId)) {
        return res.status(400).json({ error: 'Invalid room ID format' });
      }
      const newRoom = await Room.findOne({ _id: roomId, userId: req.user._id });
      if (!newRoom) {
        return res.status(404).json({ error: 'Room not found' });
      }

      if (roomId !== guest.roomId.toString()) {
        const oldRoom = await Room.findById(guest.roomId);
        if (oldRoom) {
          oldRoom.occupiedBeds = Math.max(0, oldRoom.occupiedBeds - 1);
          await oldRoom.save();
        }

        if (!newRoom.hasAvailableBeds()) {
          return res.status(400).json({ error: 'New room is at full capacity' });
        }

        newRoom.occupiedBeds += 1;
        await newRoom.save();
        guest.roomId = roomId;
      }
    }

    if (expectedCheckOutDate !== undefined) {
      guest.expectedCheckOutDate = expectedCheckOutDate ? new Date(expectedCheckOutDate) : null;
    }

    await guest.save();

    const populatedGuest = await Guest.findById(guest._id)
      .populate('agentId', 'name')
      .populate('roomId', 'number capacity');

    res.json(populatedGuest);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/checkout', validateObjectId(), async (req, res, next) => {
  try {
    const guest = await Guest.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!guest) {
      return res.status(404).json({ error: 'Guest not found' });
    }

    if (guest.checkedOut) {
      return res.status(400).json({ error: 'Guest is already checked out' });
    }

    guest.checkedOut = true;
    guest.checkedOutDate = new Date();
    await guest.save();

    const room = await Room.findById(guest.roomId);
    if (room) {
      room.occupiedBeds = Math.max(0, room.occupiedBeds - 1);
      await room.save();
    }

    const populatedGuest = await Guest.findById(guest._id)
      .populate('agentId', 'name')
      .populate('roomId', 'number capacity');

    res.json(populatedGuest);
  } catch (error) {
    next(error);
  }
});

export default router;

