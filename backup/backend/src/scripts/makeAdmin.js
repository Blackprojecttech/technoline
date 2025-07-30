const mongoose = require('mongoose');

async function makeAdmin() {
  try {
    // Подключение к MongoDB
    await mongoose.connect('mongodb://localhost:27017/technoline');
    
    // Найти пользователя по email и изменить роль
    const result = await mongoose.connection.db.collection('users').updateOne(
      { email: 'admin@test.com' },
      { $set: { role: 'admin' } }
    );
    
    if (result.modifiedCount > 0) {
      console.log('✅ Пользователь успешно назначен администратором!');
      console.log('Email: admin@test.com');
      console.log('Роль: admin');
    } else {
      console.log('❌ Пользователь не найден или роль уже изменена');
    }
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await mongoose.disconnect();
  }
}

makeAdmin(); 