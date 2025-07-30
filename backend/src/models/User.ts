import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  password?: string; // Делаем пароль необязательным
  firstName: string;
  lastName: string;
  middleName?: string;
  phone?: string;
  role: 'user' | 'admin' | 'moderator' | 'accountant';
  isPartiallyRegistered: boolean; // Флаг "мягкой" регистрации
  avatar?: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLogin?: Date;
  address?: string;
  addresses?: Array<{
    id: string;
    name: string;
    address: string;
    city?: string;
    state?: string;
    zipCode?: string;
    apartment?: string;
    entrance?: string;
    floor?: string;
    comment?: string;
    isDefault: boolean;
    createdAt: Date;
  }>;
  orders?: mongoose.Types.ObjectId[];
  favorites?: mongoose.Types.ObjectId[];
  googleId?: string;
  yandexId?: string;
  telegramId?: string;
  // Добавлено для соцсетей
  authProvider?: 'google' | 'yandex' | 'telegram' | 'local';
  linkedAccounts?: {
    google?: boolean;
    yandex?: boolean;
    telegram?: boolean;
  };
  // Реферальная система
  referralCode?: string; // Уникальный код реферала
  referredBy?: mongoose.Types.ObjectId; // Кто привлек этого пользователя
  referralStats?: {
    totalEarnings: number; // Общая сумма заработка
    availableBalance: number; // Доступный баланс
    withdrawnAmount: number; // Выведенная сумма
    totalReferrals: number; // Общее количество привлеченных
    activeReferrals: number; // Активные рефералы (сделавшие заказ)
  };
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: [true, 'Email обязателен'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Пожалуйста, введите корректный email']
  },
  password: {
    type: String,
    required: false, // Делаем пароль необязательным
    minlength: [6, 'Пароль должен содержать минимум 6 символов']
  },
  isPartiallyRegistered: {
    type: Boolean,
    default: false
  },
  firstName: {
    type: String,
    required: [true, 'Имя обязательно'],
    trim: true,
    maxlength: [50, 'Имя не может быть длиннее 50 символов']
  },
  middleName: {
    type: String,
    trim: true,
    maxlength: [50, 'Отчество не может быть длиннее 50 символов'],
    default: ''
  },
  lastName: {
    type: String,
    required: [true, 'Фамилия обязательна'],
    trim: true,
    maxlength: [50, 'Фамилия не может быть длиннее 50 символов']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s\-\(\)]+$/, 'Пожалуйста, введите корректный номер телефона']
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator', 'accountant'],
    default: 'user'
  },
  avatar: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date
  },
  address: {
    type: String,
    default: ''
  },
  addresses: [{
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Название адреса не может быть длиннее 100 символов']
    },
    address: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, 'Адрес не может быть длиннее 500 символов']
    },
    city: {
      type: String,
      trim: true,
      maxlength: [100, 'Город не может быть длиннее 100 символов'],
      default: ''
    },
    state: {
      type: String,
      trim: true,
      maxlength: [100, 'Область/регион не может быть длиннее 100 символов'],
      default: ''
    },
    zipCode: {
      type: String,
      trim: true,
      maxlength: [20, 'Индекс не может быть длиннее 20 символов'],
      default: ''
    },
    apartment: {
      type: String,
      trim: true,
      maxlength: [20, 'Квартира не может быть длиннее 20 символов'],
      default: ''
    },
    entrance: {
      type: String,
      trim: true,
      maxlength: [20, 'Подъезд не может быть длиннее 20 символов'],
      default: ''
    },
    floor: {
      type: String,
      trim: true,
      maxlength: [20, 'Этаж не может быть длиннее 20 символов'],
      default: ''
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [300, 'Комментарий не может быть длиннее 300 символов'],
      default: ''
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  orders: [{
    type: Schema.Types.ObjectId,
    ref: 'Order',
    default: []
  }],
  favorites: [{
    type: Schema.Types.ObjectId,
    ref: 'Product',
    default: []
  }],
  googleId: {
    type: String,
    default: ''
  },
  yandexId: {
    type: String,
    default: ''
  },
  telegramId: {
    type: String,
    trim: true,
    default: ''
  },
  // Добавлено для соцсетей
  authProvider: {
    type: String,
    enum: ['google', 'yandex', 'telegram', 'local'],
    default: 'local',
  },
  linkedAccounts: {
    google: { type: Boolean, default: false },
    yandex: { type: Boolean, default: false },
    telegram: { type: Boolean, default: false },
  },
  // Реферальная система
  referralCode: {
    type: String,
    unique: true,
    sparse: true, // Позволяет null значения без нарушения уникальности
    trim: true
  },
  referredBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  referralStats: {
    totalEarnings: { type: Number, default: 0 },
    availableBalance: { type: Number, default: 0 },
    withdrawnAmount: { type: Number, default: 0 },
    totalReferrals: { type: Number, default: 0 },
    activeReferrals: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret: any) {
      if ('password' in ret) {
        delete ret.password;
      }
      return ret;
    }
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Email is already indexed via unique: true in schema

export const User = mongoose.model<IUser>('User', userSchema); 