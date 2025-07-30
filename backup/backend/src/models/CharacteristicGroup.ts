import mongoose, { Schema, Document } from 'mongoose'

export interface ICharacteristicGroup extends Document {
  name: string
  description?: string
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

const CharacteristicGroupSchema = new Schema<ICharacteristicGroup>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
})

// Индексы для оптимизации запросов
CharacteristicGroupSchema.index({ name: 1 })
CharacteristicGroupSchema.index({ isActive: 1 })
CharacteristicGroupSchema.index({ sortOrder: 1 })

export default mongoose.model<ICharacteristicGroup>('CharacteristicGroup', CharacteristicGroupSchema) 