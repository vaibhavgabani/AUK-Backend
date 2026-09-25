import { Router } from 'express';
import {
  getEvents,
  createEvent,
  getEventById,
  updateEvent,
  deleteEvent,
} from '../controllers/event.controller.js';
import {
  getEventGigs,
  addGigToEvent,
  updateGigAssignment,
  deleteGigAssignment,
} from '../controllers/assignment.controller.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// Require authenticated Manager role for all event endpoints
router.use(authenticateToken, requireRole('manager'));

// Event CRUD routes
router.get('/', getEvents);
router.post('/', createEvent);
router.get('/:id', getEventById);
router.patch('/:id', updateEvent);
router.delete('/:id', deleteEvent);

// Gig assignment sub-resource routes
router.get('/:id/gigs', getEventGigs);
router.post('/:id/gigs', addGigToEvent);
router.patch('/:id/gigs/:assignmentId', updateGigAssignment);
router.delete('/:id/gigs/:assignmentId', deleteGigAssignment);

export default router;
