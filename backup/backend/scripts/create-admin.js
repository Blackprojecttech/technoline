const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Подключение к MongoDB
mongoose.connect('mongodb://localhost:27017/technoline-store', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Схема пользователя (упрощенная версия)
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin', 'moderator'], default: 'user' },
  isActive: { type: Boolean, default: true },
  emailVerified: { type: Boolean, default: false }
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);

async function createAdmin() {
  try {
    // Проверяем, существует ли уже админ
    const existingAdmin = await User.findOne({ email: 'admin@test.com' });
    
    if (existingAdmin) {
      console.log('Админ уже существует:', existingAdmin.email);
      console.log('Роль:', existingAdmin.role);
      return;
    }

    // Хешируем пароль
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('123456', salt);

    // Создаем админа
    const admin = new User({
      email: 'admin@test.com',
      password: hashedPassword,
      firstName: 'Администратор',
      lastName: 'Системы',
      role: 'admin',
      isActive: true,
      emailVerified: true
    });

    await admin.save();
    console.log('Админ создан успешно:', admin.email);
    console.log('Логин: admin@test.com');
    console.log('Пароль: 123456');
    
  } catch (error) {
    console.error('Ошибка при создании админа:', error);
  } finally {
    mongoose.connection.close();
  }
}

createAdmin(); 