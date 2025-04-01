
console.log("Placements route loaded");

import express from 'express';
import { check, validationResult } from 'express-validator';
import auth from '../middleware/auth.js';
import Placement from '../models/Placement.js';

const router = express.Router();

// @route   POST /api/placements
// @desc    Create a new placement for the logged-in user
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('row', 'Row is required and must be a number').isNumeric(),
      check('col', 'Col is required and must be a number').isNumeric(),
      check('type', 'Type is required').notEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { row, col, type } = req.body;
    try {
      const newPlacement = new Placement({
        user: req.user.id,
        row,
        col,
        type,
      });
      const placement = await newPlacement.save();
      res.json(placement);
    } catch (err) {
      console.error("Placement POST error:", err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   GET /api/placements
// @desc    Get all placements for the logged-in user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const placements = await Placement.find({ user: req.user.id });
    res.json(placements);
  } catch (err) {
    console.error("Placement GET error:", err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/placements/:id
// @desc    Delete a placement (reset a cell)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const placement = await Placement.findByIdAndDelete(req.params.id);
    if (!placement) {
      return res.status(404).json({ msg: 'Placement not found' });
    }
    res.json({ msg: 'Placement deleted' });
  } catch (err) {
    console.error("Placement DELETE error:", err.message);
    res.status(500).send('Server Error');
  }
});

export default router;