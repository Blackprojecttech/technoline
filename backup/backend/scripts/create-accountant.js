const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Схема пользователя (упрощенная версия)
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin', 'moderator', 'accountant'], default: 'user' },
  isActive: { type: Boolean, default: true },
  emailVerified: { type: Boolean, default: false }
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);

async function createAccountant() {
  try {
    // Подключение к MongoDB
    await mongoose.connect('mongodb://localhost:27017/technoline');
    
    // Проверяем, существует ли уже бухгалтер
    const existingAccountant = await User.findOne({ email: 'accountant@test.com' });
    
    if (existingAccountant) {
      console.log('Бухгалтер уже существует:', existingAccountant.email);
      console.log('Роль:', existingAccountant.role);
      return;
    }

    // Хешируем пароль
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('123456', salt);

    // Создаем бухгалтера
    const accountant = new User({
      email: 'accountant@test.com',
      password: hashedPassword,
      firstName: 'Главный',
      lastName: 'Бухгалтер',
      role: 'accountant',
      isActive: true,
      emailVerified: true
    });

    await accountant.save();
    console.log('✅ Бухгалтер создан успешно!');
    console.log('Email: accountant@test.com');
    console.log('Пароль: 123456');
    console.log('Роль: accountant');
    
  } catch (error) {
    console.error('❌ Ошибка при создании бухгалтера:', error);
  } finally {
    mongoose.connection.close();
  }
}

createAccountant(); 