import mongoose from 'mongoose';
import { User } from '../src/models/User';

async function createAdminUser() {
  try {
    await mongoose.connect('mongodb://localhost:27017/technoline');
    
    // Проверяем, есть ли уже пользователь с таким email
    const existingUser = await User.findOne({ email: 'admin@test.com' });
    
    if (existingUser) {
      console.log('✅ Пользователь admin@test.com уже существует');
      console.log(`Роль: ${existingUser.role}`);
      return;
    }
    
    // Создаем нового администратора
    const adminUser = new User({
      email: 'admin@test.com',
      password: '123456',
      firstName: 'Администратор',
      lastName: 'Системы',
      role: 'admin',
      isActive: true,
      emailVerified: true
    });
    
    await adminUser.save();
    console.log('✅ Пользователь-администратор создан успешно!');
    console.log('Email: admin@test.com');
    console.log('Пароль: 123456');
    console.log('Роль: admin');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Ошибка при создании пользователя:', error);
    await mongoose.disconnect();
  }
}

createAdminUser(); 