import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
    sparse: true // позволяет null/undefined значения, но уникальность проверяется только для не-null значений
  },
  type: {
    type: String,
    enum: ['receipt', 'debt', 'arrival', 'client_record', 'наличные', 'перевод', 'кэб', 'manual_client_debt'],
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
    type: String,
    enum: ['yes', 'no', 'debt'],
    default: 'no'
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
    enum: ['active', 'incassated', 'debt'],
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