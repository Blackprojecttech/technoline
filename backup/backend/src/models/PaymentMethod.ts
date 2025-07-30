import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentMethod extends Document {
  name: string;
  description?: string;
  isActive: boolean;
  deliveryTypes: string[]; // id способов доставки, с которыми разрешено использовать
  systemCode: string; // уникальный код для связи с фронтом/бэком
  // Дополнительные поля для информации
  displayTitle?: string; // Заголовок для отображения
  displayDescription?: string; // Описание для отображения
  features?: string[]; // Массив преимуществ
  icon?: string; // Эмодзи иконка
  color?: string; // Цвет для отображения
  specialNote?: string; // Особое примечание
  noteType?: 'info' | 'warning' | 'success'; // Тип примечания
}

const PaymentMethodSchema: Schema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  isActive: { type: Boolean, default: true },
  deliveryTypes: [{ type: String }],
  systemCode: { type: String, required: true, unique: true },
  // Дополнительные поля
  displayTitle: { type: String },
  displayDescription: { type: String },
  features: [{ type: String }],
  icon: { type: String },
  color: { type: String, default: 'blue' },
  specialNote: { type: String },
  noteType: { type: String, enum: ['info', 'warning', 'success'], default: 'info' },
}, { timestamps: true });

export default mongoose.model<IPaymentMethod>('PaymentMethod', PaymentMethodSchema); 