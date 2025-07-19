import express from 'express';
import * as paymentMethodController from '../controllers/paymentMethodController';
import { auth } from '../middleware/auth';
import { admin } from '../middleware/admin';

const router = express.Router();

// Публичный роут для получения способов оплаты по способу доставки
router.get('/by-delivery/:deliveryMethodId', paymentMethodController.getPaymentMethodsByDelivery);

// Защищенные маршруты (для админки)
router.get('/', auth, admin, paymentMethodController.getAllPaymentMethods);
router.get('/:id', auth, admin, paymentMethodController.getPaymentMethod);
router.post('/', auth, admin, paymentMethodController.createPaymentMethod);
router.put('/:id', auth, admin, paymentMethodController.updatePaymentMethod);
router.delete('/:id', auth, admin, paymentMethodController.deletePaymentMethod);

export default router; 