import express from 'express';
import {
  getActiveDeliveryMethods,
  getAllDeliveryMethods,
  createDeliveryMethod,
  updateDeliveryMethod,
  deleteDeliveryMethod,
  getDeliveryMethodById,
  calculateDeliveryCost
} from '../controllers/deliveryController';
import { auth } from '../middleware/auth';
import { admin } from '../middleware/admin';

const router = express.Router();

// Публичные маршруты (для фронтенда)
router.get('/active', getActiveDeliveryMethods);
router.post('/calculate', calculateDeliveryCost);

// Защищенные маршруты (для админки)
router.get('/', auth, admin, getAllDeliveryMethods);
router.get('/:id', auth, admin, getDeliveryMethodById);
router.post('/', auth, admin, createDeliveryMethod);
router.put('/:id', auth, admin, updateDeliveryMethod);
router.delete('/:id', auth, admin, deleteDeliveryMethod);

export default router; 