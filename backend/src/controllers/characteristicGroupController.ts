import { Request, Response } from 'express'
import CharacteristicGroup from '../models/CharacteristicGroup'
import Characteristic from '../models/Characteristic'

// Получить все группы характеристик
export const getCharacteristicGroups = async (req: Request, res: Response) => {
  try {
    const groups = await CharacteristicGroup.find()
      .sort({ sortOrder: 1, name: 1 })
      .lean()
    
    return res.json(groups)
  } catch (error) {
    console.error('Error fetching characteristic groups:', error)
    return res.status(500).json({ message: 'Ошибка при загрузке групп характеристик' })
  }
}

// Получить группу характеристик по ID
export const getCharacteristicGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const group = await CharacteristicGroup.findById(id).lean()
    
    if (!group) {
      return res.status(404).json({ message: 'Группа характеристик не найдена' })
    }
    
    return res.json(group)
  } catch (error) {
    console.error('Error fetching characteristic group:', error)
    return res.status(500).json({ message: 'Ошибка при загрузке группы характеристик' })
  }
}

// Создать группу характеристик
export const createCharacteristicGroup = async (req: Request, res: Response) => {
  try {
    const { name, description, isActive, sortOrder } = req.body
    
    const group = new CharacteristicGroup({
      name,
      description,
      isActive: isActive !== undefined ? isActive : true,
      sortOrder: sortOrder || 0
    })
    
    await group.save()
    return res.status(201).json(group)
  } catch (error) {
    console.error('Error creating characteristic group:', error)
    return res.status(500).json({ message: 'Ошибка при создании группы характеристик' })
  }
}

// Обновить группу характеристик
export const updateCharacteristicGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { name, description, isActive, sortOrder } = req.body
    
    const group = await CharacteristicGroup.findByIdAndUpdate(
      id,
      {
        name,
        description,
        isActive,
        sortOrder
      },
      { new: true, runValidators: true }
    )
    
    if (!group) {
      return res.status(404).json({ message: 'Группа характеристик не найдена' })
    }
    
    return res.json(group)
  } catch (error) {
    console.error('Error updating characteristic group:', error)
    return res.status(500).json({ message: 'Ошибка при обновлении группы характеристик' })
  }
}

// Удалить группу характеристик
export const deleteCharacteristicGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    // Проверяем, есть ли связанные характеристики
    const characteristicsCount = await Characteristic.countDocuments({ groupId: id })
    if (characteristicsCount > 0) {
      return res.status(400).json({ 
        message: 'Нельзя удалить группу, у которой есть характеристики. Сначала удалите все характеристики.' 
      })
    }
    
    const group = await CharacteristicGroup.findByIdAndDelete(id)
    
    if (!group) {
      return res.status(404).json({ message: 'Группа характеристик не найдена' })
    }
    
    return res.json({ message: 'Группа характеристик удалена' })
  } catch (error) {
    console.error('Error deleting characteristic group:', error)
    return res.status(500).json({ message: 'Ошибка при удалении группы характеристик' })
  }
}

// Получить характеристики группы
export const getGroupCharacteristics = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params
    
    const characteristics = await Characteristic.find({ groupId })
      .sort({ sortOrder: 1, name: 1 })
      .lean()
    
    return res.json(characteristics)
  } catch (error) {
    console.error('Error fetching group characteristics:', error)
    return res.status(500).json({ message: 'Ошибка при загрузке характеристик группы' })
  }
} 