import express from 'express';
import Agent from '../models/Agent.js';
import Guest from '../models/Guest.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/auth.js';
import { validate, validateObjectId, agentValidation } from '../middleware/validation.js';

const router = express.Router();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const agents = await Agent.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(agents);
  } catch (error) {
    next(error);
  }
});

router.post('/', validate(agentValidation), async (req, res, next) => {
  try {
    const { name } = req.body;

    const agent = await Agent.create({
      userId: req.user._id,
      name: name.trim()
    });

    res.status(201).json(agent);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', validateObjectId(), authorize(Agent), async (req, res, next) => {
  try {
    res.json(req.resource);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', validateObjectId(), authorize(Agent), validate(agentValidation), async (req, res, next) => {
  try {
    const { name } = req.body;

    req.resource.name = name.trim();
    await req.resource.save();

    res.json(req.resource);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', validateObjectId(), authorize(Agent), async (req, res, next) => {
  try {
    const activeGuests = await Guest.findOne({
      agentId: req.resource._id,
      checkedOut: false
    });

    if (activeGuests) {
      return res.status(400).json({ error: 'Cannot delete agent with active guests' });
    }

    await Agent.findByIdAndDelete(req.resource._id);
    res.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/guests', validateObjectId(), authorize(Agent), async (req, res, next) => {
  try {
    const guests = await Guest.find({
      agentId: req.resource._id,
      userId: req.user._id,
      checkedOut: false
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

