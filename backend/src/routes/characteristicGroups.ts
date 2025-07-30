import express from 'express'
import { auth, adminOrAccountant } from '../middleware/auth'
import {
  getCharacteristicGroups,
  getCharacteristicGroup,
  createCharacteristicGroup,
  updateCharacteristicGroup,
  deleteCharacteristicGroup,
  getGroupCharacteristics
} from '../controllers/characteristicGroupController'

const router = express.Router()

// Все роуты требуют авторизации
router.use(auth)

// Роуты для групп характеристик
router.get('/', getCharacteristicGroups)
router.get('/:id', getCharacteristicGroup)
router.post('/', adminOrAccountant, createCharacteristicGroup)
router.put('/:id', adminOrAccountant, updateCharacteristicGroup)
router.delete('/:id', adminOrAccountant, deleteCharacteristicGroup)

// Роуты для характеристик группы
router.get('/:groupId/characteristics', getGroupCharacteristics)

export default router 