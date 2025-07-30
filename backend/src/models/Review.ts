import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
  product: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  authorName: string;
  rating: number;
  text: string;
  answer?: string;
  status: 'new' | 'answered' | 'hidden';
  createdAt: string; // только дата YYYY-MM-DD
  updatedAt: Date;
  isApproved: boolean;
  images?: string[];
}

const ReviewSchema = new Schema<IReview>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  text: { type: String, required: true, maxlength: 2000 },
  answer: { type: String, default: '' },
  status: { type: String, enum: ['new', 'answered', 'hidden'], default: 'new' },
  createdAt: { type: String, required: true },
  isApproved: { type: Boolean, default: false },
  images: { type: [String], default: [] },
}, {
  timestamps: true
});

export default mongoose.model<IReview>('Review', ReviewSchema); 