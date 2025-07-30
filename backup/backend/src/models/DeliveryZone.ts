import mongoose, { Document, Schema } from 'mongoose';

export interface IDeliveryZone extends Document {
  key: string; // уникальный ключ (например, slug)
  name: string; // название зоны
  price: number; // стоимость доставки
  sortOrder: number; // порядок сортировки
}

const deliveryZoneSchema = new Schema<IDeliveryZone>({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

export default mongoose.model<IDeliveryZone>('DeliveryZone', deliveryZoneSchema); 