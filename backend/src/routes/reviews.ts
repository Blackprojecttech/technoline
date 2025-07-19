import express from 'express';
import { auth } from '../middleware/auth';

const router = express.Router();

// Get reviews for a product
router.get('/product/:productId', async (req, res) => {
  try {
    res.json({ message: 'Reviews route working' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add review
router.post('/', auth, async (req, res) => {
  try {
    res.json({ message: 'Review added' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update review
router.put('/:reviewId', auth, async (req, res) => {
  try {
    res.json({ message: 'Review updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete review
router.delete('/:reviewId', auth, async (req, res) => {
  try {
    res.json({ message: 'Review deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 