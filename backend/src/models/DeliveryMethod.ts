import mongoose, { Schema, Document } from 'mongoose';

export interface IDeliveryMethod extends Document {
  name: string;
  description: string;
  isActive?: boolean;
  order?: number;
  conditions?: string;
  workingHours?: string;
  address?: string;
  restrictions?: string;
  deadlines?: string;
  costType: 'fixed' | 'percentage' | 'zone'; // Тип стоимости: фиксированная или процент
  fixedCost?: number; // Фиксированная стоимость
  costPercentage?: number; // Процент от стоимости заказа
  // Параметры времени доставки
  orderTimeFrom?: string; // Время заказа с (формат HH:MM)
  orderTimeTo?: string; // Время заказа до (формат HH:MM)
  // Время доставки для сегодня
  deliveryTodayTimeFrom?: string; // Время доставки сегодня с (формат HH:MM)
  deliveryTodayTimeTo?: string; // Время доставки сегодня до (формат HH:MM)
  // Время доставки для завтра
  deliveryTomorrowTimeFrom?: string; // Время доставки завтра с (формат HH:MM)
  deliveryTomorrowTimeTo?: string; // Время доставки завтра до (формат HH:MM)
  // Условия для определения дня доставки
  orderTimeForToday?: string; // До какого времени заказать для доставки сегодня (формат HH:MM)
  orderTimeForTomorrow?: string; // До какого времени заказать для доставки завтра (формат HH:MM)
  // Новые поля для гибких временных интервалов
  useFlexibleIntervals?: boolean; // Использовать гибкие интервалы вместо стандартных
  intervalType?: 'standard' | 'flexible' | 'cdek';
  // Поле для разрешения доставки в выходные дни
  allowWeekendDelivery?: boolean; // Тип интервалов: стандартные, гибкие или СДЭК
  // Пользовательские интервалы
  customInterval1?: string; // Первый интервал (например, "13:00-17:00")
  customInterval2?: string; // Второй интервал (например, "17:00-21:00")
  // Интервалы для заказов до 10:00 (сегодня)
  earlyOrderIntervals?: string[]; // Массив интервалов типа ["13:00-17:00", "17:00-21:00"]
  // Интервалы для заказов после 10:00 (завтра/послезавтра)
  lateOrderIntervals?: string[]; // Массив интервалов типа ["13:00-17:00", "17:00-21:00"]
  // Время перехода между ранними и поздними заказами
  orderTransitionTime?: string; // Время перехода (например, "10:00")
  // Проверка адреса доставки
  requireAddressValidation?: boolean; // Требовать проверку адреса
  addressValidationType?: 'moscow_mkad' | 'moscow_region'; // Тип валидации адреса
  useZones?: boolean; // использовать зоны доставки
  zoneKeys?: string[]; // массив ключей выбранных зон
  // Добавлено для поддержки цен по зонам
  zonePrices?: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

const deliveryMethodSchema = new Schema<IDeliveryMethod>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  },
  conditions: {
    type: String,
    trim: true
  },
  workingHours: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  restrictions: {
    type: String,
    trim: true
  },
  deadlines: {
    type: String,
    trim: true
  },
  costType: {
    type: String,
    enum: ['fixed', 'percentage', 'zone'],
    default: 'fixed'
  },
  fixedCost: {
    type: Number,
    min: 0,
    default: null
  },
  costPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  },
  // Параметры времени доставки
  orderTimeFrom: {
    type: String,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, // Валидация формата HH:MM
    default: null
  },
  orderTimeTo: {
    type: String,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, // Валидация формата HH:MM
    default: null
  },
  // Время доставки для сегодня
  deliveryTodayTimeFrom: {
    type: String,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, // Валидация формата HH:MM
    default: null
  },
  deliveryTodayTimeTo: {
    type: String,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, // Валидация формата HH:MM
    default: null
  },
  // Время доставки для завтра
  deliveryTomorrowTimeFrom: {
    type: String,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, // Валидация формата HH:MM
    default: null
  },
  deliveryTomorrowTimeTo: {
    type: String,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, // Валидация формата HH:MM
    default: null
  },
  // Условия для определения дня доставки
  orderTimeForToday: {
    type: String,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, // Валидация формата HH:MM
    default: null
  },
  orderTimeForTomorrow: {
    type: String,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, // Валидация формата HH:MM
    default: null
  },
  // Новые поля для гибких временных интервалов
  useFlexibleIntervals: {
    type: Boolean,
    default: false
  },
  intervalType: {
    type: String,
    enum: ['standard', 'flexible', 'cdek'],
    default: 'standard'
  },
  // Пользовательские интервалы
  customInterval1: {
    type: String,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]-([01]?[0-9]|2[0-3]):[0-5][0-9]$/, // Валидация формата HH:MM-HH:MM
    default: null
  },
  customInterval2: {
    type: String,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]-([01]?[0-9]|2[0-3]):[0-5][0-9]$/, // Валидация формата HH:MM-HH:MM
    default: null
  },
  // Интервалы для заказов до 10:00 (сегодня)
  earlyOrderIntervals: {
    type: [String],
    default: []
  },
  // Интервалы для заказов после 10:00 (завтра/послезавтра)
  lateOrderIntervals: {
    type: [String],
    default: []
  },
  // Время перехода между ранними и поздними заказами
  orderTransitionTime: {
    type: String,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, // Валидация формата HH:MM
    default: null
  },
  // Проверка адреса доставки
  requireAddressValidation: {
    type: Boolean,
    default: false
  },
  addressValidationType: {
    type: String,
    enum: ['moscow_mkad', 'moscow_region', 'region'],
    default: null
  },
  useZones: {
    type: Boolean,
    default: false
  },
  zoneKeys: {
    type: [String],
    default: []
  },
  // Поле для разрешения доставки в выходные дни
  allowWeekendDelivery: {
    type: Boolean,
    default: false
  },
  // Добавлено для поддержки цен по зонам
  zonePrices: {
    type: Object,
    default: {}
  }
}, {
  timestamps: true
});

export default mongoose.model<IDeliveryMethod>('DeliveryMethod', deliveryMethodSchema); 