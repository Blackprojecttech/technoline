import express from 'express'
import { auth, adminOrAccountant } from '../middleware/auth'
import {
  getCharacteristics,
  getCharacteristic,
  createCharacteristic,
  updateCharacteristic,
  deleteCharacteristic,
  getCharacteristicValues,
  createCharacteristicValue,
  updateCharacteristicValue,
  deleteCharacteristicValue
} from '../controllers/characteristicController'

const router = express.Router()

// Публичные роуты для фронта
router.get('/', getCharacteristics)
router.get('/:id', getCharacteristic)

// Все остальные роуты требуют авторизации
router.use(auth)

// Роуты для характеристик
router.post('/', adminOrAccountant, createCharacteristic)
router.put('/:id', adminOrAccountant, updateCharacteristic)
router.delete('/:id', adminOrAccountant, deleteCharacteristic)

// Роуты для значений характеристик
router.get('/:characteristicId/values', getCharacteristicValues)
router.post('/:characteristicId/values', adminOrAccountant, createCharacteristicValue)
router.put('/:characteristicId/values/:valueId', adminOrAccountant, updateCharacteristicValue)
router.delete('/:characteristicId/values/:valueId', adminOrAccountant, deleteCharacteristicValue)

export default router 