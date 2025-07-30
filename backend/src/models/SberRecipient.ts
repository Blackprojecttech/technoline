import mongoose, { Document, Schema } from 'mongoose';

export interface ISberRecipient extends Document {
  name: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const sberRecipientSchema = new Schema<ISberRecipient>({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  createdBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Индексы
sberRecipientSchema.index({ name: 1 });
sberRecipientSchema.index({ createdBy: 1 });

export const SberRecipient = mongoose.model<ISberRecipient>('SberRecipient', sberRecipientSchema); 