import mongoose, { Schema, Document } from 'mongoose';

export interface IPushSubscription extends Document {
  user: mongoose.Types.ObjectId;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
  isActive: boolean;
  createdAt: Date;
  lastUsed?: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>({
  user: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  endpoint: { 
    type: String, 
    required: true 
  },
  p256dh: { 
    type: String, 
    required: true 
  },
  auth: { 
    type: String, 
    required: true 
  },
  userAgent: { 
    type: String 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  lastUsed: { 
    type: Date 
  }
});

// Индекс для быстрого поиска по пользователю
PushSubscriptionSchema.index({ user: 1 });
// Уникальная подписка по endpoint
PushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });

export default mongoose.model<IPushSubscription>('PushSubscription', PushSubscriptionSchema); 