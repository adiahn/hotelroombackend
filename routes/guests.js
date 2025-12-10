import express from 'express';
import mongoose from 'mongoose';
import Guest from '../models/Guest.js';
import Room from '../models/Room.js';
import Agent from '../models/Agent.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/auth.js';
import { validate, validateObjectId, guestValidation } from '../middleware/validation.js';

const router = express.Router();

const calculateRoomOccupancy = async (roomId, userId) => {
  const activeGuests = await Guest.countDocuments({
    roomId,
    userId,
    checkedOut: false
  });
  return activeGuests;
};

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

    if (agentId !== undefined && agentId !== '') {
      if (agentId === 'null') {
        query.agentId = null;
      } else {
        if (!mongoose.Types.ObjectId.isValid(agentId)) {
          return res.status(400).json({ error: 'Invalid agent ID format' });
        }
        query.agentId = agentId;
      }
    }

    const guests = await Guest.find(query)
      .populate('agentId', 'name _id')
      .populate('roomId', 'number capacity _id')
      .sort({ createdAt: -1 });

    res.json(guests);
  } catch (error) {
    next(error);
  }
});

router.post('/', validate(guestValidation), async (req, res, next) => {
  try {
    const { name, agentId, roomId, checkInDate, expectedCheckOutDate } = req.body;

    const room = await Room.findOne({ _id: roomId, userId: req.user._id });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (agentId) {
      const agent = await Agent.findOne({ _id: agentId, userId: req.user._id });
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      if (room.assignedAgentId && room.assignedAgentId.toString() !== agentId) {
        return res.status(400).json({ error: 'Room is already assigned to another agent' });
      }

      const existingGuest = await Guest.findOne({
        userId: req.user._id,
        agentId,
        roomId,
        checkedOut: false
      });

      if (existingGuest) {
        return res.status(400).json({ error: 'Agent is already checked into this room' });
      }

      room.assignedAgentId = agentId;
      room.occupiedBeds = room.capacity;
      await room.save();
    } else {
      const currentOccupancy = await calculateRoomOccupancy(roomId, req.user._id);
      
      if (room.assignedAgentId) {
        return res.status(400).json({ error: 'Room is assigned to an agent. Cannot add direct booking' });
      }

      if (currentOccupancy >= room.capacity) {
        return res.status(400).json({ error: 'Room is at full capacity' });
      }

      room.occupiedBeds = currentOccupancy + 1;
      await room.save();
    }

    const guest = await Guest.create({
      userId: req.user._id,
      name: name.trim(),
      agentId: agentId || null,
      roomId,
      checkInDate: checkInDate ? new Date(checkInDate) : new Date(),
      expectedCheckOutDate: expectedCheckOutDate ? new Date(expectedCheckOutDate) : undefined
    });

    const populatedGuest = await Guest.findById(guest._id)
      .populate('agentId', 'name _id')
      .populate('roomId', 'number capacity _id');

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
      .populate('agentId', 'name _id')
      .populate('roomId', 'number capacity _id')
      .sort({ createdAt: -1 });

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
      .populate('agentId', 'name _id')
      .populate('roomId', 'number capacity _id');

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

    const { name, agentId, roomId, checkInDate, expectedCheckOutDate } = req.body;

    if (name) {
      guest.name = name.trim();
    }

    if (checkInDate !== undefined) {
      const newCheckInDate = checkInDate ? new Date(checkInDate) : new Date();
      if (guest.expectedCheckOutDate && newCheckInDate >= guest.expectedCheckOutDate) {
        return res.status(400).json({ error: 'Check-in date must be before expected check-out date' });
      }
      guest.checkInDate = newCheckInDate;
    }

    const oldRoom = await Room.findById(guest.roomId);
    const isRoomChange = roomId && roomId !== guest.roomId.toString();
    const newRoom = isRoomChange ? await Room.findOne({ _id: roomId, userId: req.user._id }) : oldRoom;

    if (isRoomChange) {
      if (!mongoose.Types.ObjectId.isValid(roomId)) {
        return res.status(400).json({ error: 'Invalid room ID format' });
      }
      if (!newRoom) {
        return res.status(404).json({ error: 'Room not found' });
      }
    }

    let newAgentId = guest.agentId;
    const isAgentChange = agentId !== undefined;

    if (agentId !== undefined) {
      if (agentId === null || agentId === '' || agentId === 'null') {
        newAgentId = null;
        guest.agentId = null;
      } else {
        if (!mongoose.Types.ObjectId.isValid(agentId)) {
          return res.status(400).json({ error: 'Invalid agent ID format' });
        }
        const agent = await Agent.findOne({ _id: agentId, userId: req.user._id });
        if (!agent) {
          return res.status(404).json({ error: 'Agent not found' });
        }
        newAgentId = agentId;
        guest.agentId = agentId;
      }
    }

    const actualAgentChange = isAgentChange && (newAgentId?.toString() !== guest.agentId?.toString());

    if (isRoomChange || actualAgentChange) {
      if (oldRoom && oldRoom.userId.toString() === req.user._id.toString()) {
        if (guest.agentId) {
          const otherAgentGuests = await Guest.countDocuments({
            roomId: oldRoom._id,
            userId: req.user._id,
            agentId: guest.agentId,
            checkedOut: false,
            _id: { $ne: guest._id }
          });
          if (otherAgentGuests === 0) {
            oldRoom.assignedAgentId = null;
            oldRoom.occupiedBeds = 0;
          } else {
            oldRoom.occupiedBeds = oldRoom.capacity;
          }
        } else {
          const currentOccupancy = await calculateRoomOccupancy(oldRoom._id, req.user._id);
          oldRoom.occupiedBeds = currentOccupancy;
        }
        await oldRoom.save();
      }

      if (isRoomChange) {
        if (newAgentId) {
          if (newRoom.assignedAgentId && newRoom.assignedAgentId.toString() !== newAgentId.toString()) {
            return res.status(400).json({ error: 'New room is already assigned to another agent' });
          }
          newRoom.assignedAgentId = newAgentId;
          newRoom.occupiedBeds = newRoom.capacity;
        } else {
          if (newRoom.assignedAgentId) {
            return res.status(400).json({ error: 'Room is assigned to an agent. Cannot add direct booking' });
          }
          const currentOccupancy = await calculateRoomOccupancy(newRoom._id, req.user._id);
          if (currentOccupancy >= newRoom.capacity) {
            return res.status(400).json({ error: 'Room is at full capacity' });
          }
          newRoom.occupiedBeds = currentOccupancy + 1;
        }
        await newRoom.save();
        guest.roomId = roomId;
      } else if (isAgentChange && !isRoomChange) {
        if (newAgentId) {
          if (oldRoom.assignedAgentId && oldRoom.assignedAgentId.toString() !== newAgentId.toString()) {
            return res.status(400).json({ error: 'Room is already assigned to another agent' });
          }
          oldRoom.assignedAgentId = newAgentId;
          oldRoom.occupiedBeds = oldRoom.capacity;
        } else {
          oldRoom.assignedAgentId = null;
          const currentOccupancy = await calculateRoomOccupancy(oldRoom._id, req.user._id);
          oldRoom.occupiedBeds = currentOccupancy;
        }
        await oldRoom.save();
      }
    }

    if (expectedCheckOutDate !== undefined) {
      const newCheckOutDate = expectedCheckOutDate ? new Date(expectedCheckOutDate) : null;
      if (newCheckOutDate && guest.checkInDate && newCheckOutDate <= guest.checkInDate) {
        return res.status(400).json({ error: 'Expected check-out date must be after check-in date' });
      }
      guest.expectedCheckOutDate = newCheckOutDate;
    }

    await guest.save();

    const populatedGuest = await Guest.findById(guest._id)
      .populate('agentId', 'name _id')
      .populate('roomId', 'number capacity _id');

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
      return res.status(400).json({ error: 'Guest already checked out' });
    }

    guest.checkedOut = true;
    guest.checkedOutDate = new Date();
    await guest.save();

    const room = await Room.findById(guest.roomId);
    if (room && room.userId.toString() === req.user._id.toString()) {
      if (guest.agentId) {
        room.assignedAgentId = null;
        room.occupiedBeds = 0;
      } else {
        const currentOccupancy = await calculateRoomOccupancy(guest.roomId, req.user._id);
        room.occupiedBeds = currentOccupancy;
      }
      await room.save();
    }

    const populatedGuest = await Guest.findById(guest._id)
      .populate('agentId', 'name _id')
      .populate('roomId', 'number capacity _id');

    res.json(populatedGuest);
  } catch (error) {
    next(error);
  }
});

export default router;

