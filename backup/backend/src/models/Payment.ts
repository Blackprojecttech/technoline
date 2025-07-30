import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
    sparse: true // позволяет null/undefined значения, но уникальность проверяется только для не-null значений
  },
  type: {
    type: String,
    enum: ['наличные', 'перевод', 'кэб'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  supplier: String,
  orderId: String,
  inCashRegister: {
    type: Boolean,
    default: false
  },
  cashRegisterDate: Date,
  notes: String,
  category: String,
  paymentMethod: String,
  apiType: {
    type: String,
    enum: ['income', 'expense']
  },
  status: {
    type: String,
    enum: ['active', 'incassated'],
    default: 'active'
  },
  incassationDate: Date,
  adminName: String,
  arrivalId: String, // ID прихода для связи с покупками
  debtId: String // ID долга для связи с оплатой долгов
}, {
  timestamps: true
});

export const Payment = mongoose.model('Payment', paymentSchema); 