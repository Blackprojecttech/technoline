import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
  type: 'review_published' | 'review_moderated' | 'review_request' | 'custom' | 'order_created' | 'order_status_changed';
  text: string;
  link?: string;
  isRead: boolean;
  createdAt: Date;
  product?: {
    name: string;
    _id: mongoose.Types.ObjectId | string;
    slug?: string;
  };
}

const NotificationSchema = new Schema<INotification>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['review_published', 'review_moderated', 'review_request', 'custom', 'order_created', 'order_status_changed'], required: true },
  text: { type: String, required: true },
  link: { type: String },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  product: {
    name: { type: String },
    _id: { type: Schema.Types.ObjectId, ref: 'Product', required: function() { return this.type === 'review_request'; } },
    slug: { type: String }
  }
});

export default mongoose.model<INotification>('Notification', NotificationSchema); 