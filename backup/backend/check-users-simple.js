const mongoose = require('mongoose');

// Схема пользователя
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  password: String,
  phone: String,
  address: String,
  role: { type: String, default: 'user' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

mongoose.connect('mongodb://localhost:27017/technoline')
  .then(async () => {
    try {
      console.log('🔍 Проверяем пользователей в базе данных...');
      const users = await User.find({});
      console.log(`📊 Найдено пользователей: ${users.length}`);
      
      if (users.length === 0) {
        console.log('❌ Пользователей не найдено');
      } else {
        users.forEach((user, index) => {
          console.log(`${index + 1}. Email: ${user.email}, Роль: ${user.role}, Активен: ${user.isActive}`);
        });
      }
    } catch (error) {
      console.error('❌ Ошибка:', error);
    }
    process.exit();
  })
  .catch(err => {
    console.error('❌ Ошибка подключения к базе данных:', err);
    process.exit(1);
  }); 