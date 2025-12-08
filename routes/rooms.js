import express from 'express';
import Room from '../models/Room.js';
import Guest from '../models/Guest.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/auth.js';
import { validate, validateObjectId, roomValidation, roomUpdateValidation } from '../middleware/validation.js';

const router = express.Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const rooms = await Room.find({ userId: req.user._id })
      .populate('assignedAgentId', 'name')
      .sort({ createdAt: -1 });
    
    const roomsWithAssignedAgent = rooms.map(room => {
      const roomObj = room.toObject();
      return {
        ...roomObj,
        assignedAgentId: roomObj.assignedAgentId || null
      };
    });
    
    res.json(roomsWithAssignedAgent);
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

    const populatedRoom = await Room.findById(room._id)
      .populate('assignedAgentId', 'name');

    const roomObj = populatedRoom.toObject();
    const roomWithAssignedAgent = {
      ...roomObj,
      assignedAgentId: roomObj.assignedAgentId || null
    };

    res.status(201).json(roomWithAssignedAgent);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', validateObjectId(), authorize(Room), async (req, res, next) => {
  try {
    const room = await Room.findById(req.resource._id)
      .populate('assignedAgentId', 'name');
    
    const roomObj = room.toObject();
    const roomWithAssignedAgent = {
      ...roomObj,
      assignedAgentId: roomObj.assignedAgentId || null
    };
    
    res.json(roomWithAssignedAgent);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', validateObjectId(), authorize(Room), validate(roomUpdateValidation), async (req, res, next) => {
  try {
    const { number, capacity, assignedAgentId } = req.body;

    if (number && number !== req.resource.number) {
      const existingRoom = await Room.findOne({ userId: req.user._id, number });
      if (existingRoom) {
        return res.status(400).json({ error: 'Room number already exists' });
      }
    }

    if (assignedAgentId !== undefined) {
      if (assignedAgentId === null) {
        req.resource.assignedAgentId = null;
        req.resource.occupiedBeds = 0;
      } else {
        const Agent = (await import('../models/Agent.js')).default;
        const agent = await Agent.findOne({ _id: assignedAgentId, userId: req.user._id });
        if (!agent) {
          return res.status(404).json({ error: 'Agent not found' });
        }
        req.resource.assignedAgentId = assignedAgentId;
        req.resource.occupiedBeds = req.resource.capacity;
      }
    }

    if (number) req.resource.number = number;
    if (capacity !== undefined) {
      req.resource.capacity = capacity;
      if (req.resource.assignedAgentId) {
        req.resource.occupiedBeds = capacity;
      }
    }

    await req.resource.save();

    const populatedRoom = await Room.findById(req.resource._id)
      .populate('assignedAgentId', 'name');

    const roomObj = populatedRoom.toObject();
    const roomWithAssignedAgent = {
      ...roomObj,
      assignedAgentId: roomObj.assignedAgentId || null
    };

    res.json(roomWithAssignedAgent);
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

