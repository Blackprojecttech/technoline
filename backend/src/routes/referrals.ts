import express from 'express';
import { auth } from '../middleware/auth';
import { admin } from '../middleware/admin';
import {
  getUserReferralLink,
  trackReferralClick,
  getUserReferralStats,
  requestWithdrawal,
  getAllReferrals,
  getUserReferralDetails,
  getWithdrawalRequests,
  processWithdrawal
} from '../controllers/referralController';

const router = express.Router();

// Публичные маршруты
router.get('/track', trackReferralClick); // Отслеживание кликов по реферальным ссылкам

// Маршруты для аутентифицированных пользователей
router.get('/my-link', auth, getUserReferralLink); // Получить реферальную ссылку пользователя
router.get('/my-stats', auth, getUserReferralStats); // Получить статистику рефералов
router.post('/withdrawal', auth, requestWithdrawal); // Запрос на вывод средств

// Админские маршруты
router.get('/admin/all', auth, admin, getAllReferrals); // Получить все рефералы
router.get('/admin/user/:userId/details', auth, admin, getUserReferralDetails); // Получить детали рефералов пользователя
router.get('/admin/withdrawals', auth, admin, getWithdrawalRequests); // Получить заявки на вывод
router.patch('/admin/withdrawals/:withdrawalId', auth, admin, processWithdrawal); // Обработать заявку на вывод

export default router; 