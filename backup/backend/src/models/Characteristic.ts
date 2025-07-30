import mongoose, { Schema, Document } from 'mongoose'

export interface ICharacteristic extends Document {
  name: string
  createdAt: Date
  updatedAt: Date
}

const CharacteristicSchema = new Schema<ICharacteristic>({
  name: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
})

CharacteristicSchema.index({ name: 1 })

export default mongoose.model<ICharacteristic>('Characteristic', CharacteristicSchema) 