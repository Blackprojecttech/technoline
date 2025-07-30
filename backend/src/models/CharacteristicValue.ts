import mongoose, { Schema, Document } from 'mongoose'

export interface ICharacteristicValue extends Document {
  characteristicId: mongoose.Types.ObjectId
  value: string
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

const CharacteristicValueSchema = new Schema<ICharacteristicValue>({
  characteristicId: {
    type: Schema.Types.ObjectId,
    ref: 'Characteristic',
    required: true
  },
  value: {
    type: String,
    required: true,
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
CharacteristicValueSchema.index({ characteristicId: 1 })
CharacteristicValueSchema.index({ isActive: 1 })
CharacteristicValueSchema.index({ sortOrder: 1 })
CharacteristicValueSchema.index({ value: 1 })

export default mongoose.model<ICharacteristicValue>('CharacteristicValue', CharacteristicValueSchema) 