const mongoose = require('mongoose');
require('dotenv').config();

// Подключение к базе данных
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/techno-line');
    console.log('✅ MongoDB подключен');
  } catch (error) {
    console.error('❌ Ошибка подключения к MongoDB:', error);
    process.exit(1);
  }
};

// Модель долга
const debtSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  arrivalId: { type: String, required: true },
  supplierId: { type: String, required: true },
  supplierName: { type: String, required: true },
  amount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  remainingAmount: { type: Number, required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['active', 'partially_paid', 'paid', 'overdue'], default: 'active' },
  notes: { type: String },
  items: [{}],
  createdBy: { type: String, required: true }
}, { timestamps: true });

const Debt = mongoose.model('Debt', debtSchema);

async function cleanClientDebts() {
  try {
    await connectDB();
    
    console.log('🧹 Начинаем очистку долгов клиентов из таблицы Debt...');
    
    // Находим все долги, которые были созданы из чеков
    // Это долги с supplierId = 'client' или arrivalId начинающимся с 'receipt_'
    const clientDebts = await Debt.find({
      $or: [
        { supplierId: 'client' },
        { arrivalId: { $regex: /^receipt_/ } },
        { id: { $regex: /^debt_receipt_/ } }
      ]
    });
    
    console.log(`📋 Найдено ${clientDebts.length} долгов клиентов для удаления:`, 
      clientDebts.map(debt => ({
        id: debt.id,
        supplierName: debt.supplierName,
        amount: debt.amount,
        notes: debt.notes
      }))
    );
    
    if (clientDebts.length > 0) {
      // Удаляем найденные долги клиентов
      const result = await Debt.deleteMany({
        $or: [
          { supplierId: 'client' },
          { arrivalId: { $regex: /^receipt_/ } },
          { id: { $regex: /^debt_receipt_/ } }
        ]
      });
      
      console.log(`✅ Удалено ${result.deletedCount} долгов клиентов из таблицы Debt`);
      console.log('💡 Теперь долги клиентов будут отображаться только через систему платежей');
    } else {
      console.log('✅ Долги клиентов не найдены в таблице Debt');
    }
    
    // Проверяем, что остались только долги поставщикам
    const remainingDebts = await Debt.find({});
    console.log(`📊 Оставшихся долгов поставщикам: ${remainingDebts.length}`);
    
    mongoose.connection.close();
    console.log('🎉 Очистка завершена успешно');
    
  } catch (error) {
    console.error('❌ Ошибка при очистке долгов клиентов:', error);
    process.exit(1);
  }
}

cleanClientDebts(); 