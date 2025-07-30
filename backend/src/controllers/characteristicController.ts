import { Request, Response } from 'express'
import Characteristic from '../models/Characteristic'
import CharacteristicValue from '../models/CharacteristicValue'

// Получить все характеристики с группами
export const getCharacteristics = async (req: Request, res: Response) => {
  try {
    const characteristics = await Characteristic.find()
      .sort({ name: 1 })
      .lean()
    
    return res.json(characteristics)
  } catch (error) {
    console.error('Error fetching characteristics:', error)
    return res.status(500).json({ message: 'Ошибка при загрузке характеристик' })
  }
}

// Получить характеристику по ID
export const getCharacteristic = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const characteristic = await Characteristic.findById(id).lean()
    
    if (!characteristic) {
      return res.status(404).json({ message: 'Характеристика не найдена' })
    }
    
    return res.json(characteristic)
  } catch (error) {
    console.error('Error fetching characteristic:', error)
    return res.status(500).json({ message: 'Ошибка при загрузке характеристики' })
  }
}

// Создать характеристику
export const createCharacteristic = async (req: Request, res: Response) => {
  try {
    const { name } = req.body
    const characteristic = new Characteristic({ name })
    await characteristic.save()
    return res.status(201).json(characteristic)
  } catch (error) {
    console.error('Error creating characteristic:', error)
    return res.status(500).json({ message: 'Ошибка при создании характеристики' })
  }
}

// Обновить характеристику
export const updateCharacteristic = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name } = req.body
    const characteristic = await Characteristic.findByIdAndUpdate(
      id,
      { name },
      { new: true, runValidators: true }
    )
    if (!characteristic) {
      return res.status(404).json({ message: 'Характеристика не найдена' })
    }
    return res.json(characteristic)
  } catch (error) {
    console.error('Error updating characteristic:', error)
    return res.status(500).json({ message: 'Ошибка при обновлении характеристики' })
  }
}

// Удалить характеристику
export const deleteCharacteristic = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    // Проверяем, есть ли связанные значения
    const valuesCount = await CharacteristicValue.countDocuments({ characteristicId: id })
    if (valuesCount > 0) {
      return res.status(400).json({ 
        message: 'Нельзя удалить характеристику, у которой есть значения. Сначала удалите все значения.' 
      })
    }
    
    const characteristic = await Characteristic.findByIdAndDelete(id)
    
    if (!characteristic) {
      return res.status(404).json({ message: 'Характеристика не найдена' })
    }
    
    return res.json({ message: 'Характеристика удалена' })
  } catch (error) {
    console.error('Error deleting characteristic:', error)
    return res.status(500).json({ message: 'Ошибка при удалении характеристики' })
  }
}

// Получить значения характеристики
export const getCharacteristicValues = async (req: Request, res: Response) => {
  try {
    const { characteristicId } = req.params
    
    const values = await CharacteristicValue.find({ characteristicId })
      .sort({ sortOrder: 1, value: 1 })
      .lean()
    
    return res.json(values)
  } catch (error) {
    console.error('Error fetching characteristic values:', error)
    return res.status(500).json({ message: 'Ошибка при загрузке значений характеристики' })
  }
}

// Создать значение характеристики
export const createCharacteristicValue = async (req: Request, res: Response) => {
  try {
    const { characteristicId } = req.params
    const { value, isActive, sortOrder } = req.body
    
    // Проверяем, что характеристика существует
    const characteristic = await Characteristic.findById(characteristicId)
    if (!characteristic) {
      return res.status(404).json({ message: 'Характеристика не найдена' })
    }
    
    const characteristicValue = new CharacteristicValue({
      characteristicId,
      value,
      isActive: isActive !== undefined ? isActive : true,
      sortOrder: sortOrder || 0
    })
    
    await characteristicValue.save()
    return res.status(201).json(characteristicValue)
  } catch (error) {
    console.error('Error creating characteristic value:', error)
    return res.status(500).json({ message: 'Ошибка при создании значения характеристики' })
  }
}

// Обновить значение характеристики
export const updateCharacteristicValue = async (req: Request, res: Response) => {
  try {
    const { characteristicId, valueId } = req.params
    const { value, isActive, sortOrder } = req.body
    
    const characteristicValue = await CharacteristicValue.findOneAndUpdate(
      { _id: valueId, characteristicId },
      {
        value,
        isActive,
        sortOrder
      },
      { new: true, runValidators: true }
    )
    
    if (!characteristicValue) {
      return res.status(404).json({ message: 'Значение характеристики не найдено' })
    }
    
    return res.json(characteristicValue)
  } catch (error) {
    console.error('Error updating characteristic value:', error)
    return res.status(500).json({ message: 'Ошибка при обновлении значения характеристики' })
  }
}

// Удалить значение характеристики
export const deleteCharacteristicValue = async (req: Request, res: Response) => {
  try {
    const { characteristicId, valueId } = req.params
    
    const characteristicValue = await CharacteristicValue.findOneAndDelete({
      _id: valueId,
      characteristicId
    })
    
    if (!characteristicValue) {
      return res.status(404).json({ message: 'Значение характеристики не найдено' })
    }
    
    return res.json({ message: 'Значение характеристики удалено' })
  } catch (error) {
    console.error('Error deleting characteristic value:', error)
    return res.status(500).json({ message: 'Ошибка при удалении значения характеристики' })
  }
} 