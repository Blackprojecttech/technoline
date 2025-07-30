const mongoose = require('mongoose');

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

async function updateAdminRole() {
  try {
    // Находим пользователя
    const user = await User.findOne({ email: 'admin@test.com' });
    
    if (!user) {
      console.log('Пользователь admin@test.com не найден');
      return;
    }

    console.log('Найден пользователь:', user.email);
    console.log('Текущая роль:', user.role);

    // Обновляем роль на admin
    user.role = 'admin';
    await user.save();

    console.log('Роль обновлена на admin');
    console.log('Логин: admin@test.com');
    console.log('Пароль: 123456');
    
  } catch (error) {
    console.error('Ошибка при обновлении роли:', error);
  } finally {
    mongoose.connection.close();
  }
}

updateAdminRole(); 