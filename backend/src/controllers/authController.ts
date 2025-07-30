// @ts-nocheck
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { sendMail } from '../utils/mailer';
import crypto from 'crypto';
import Notification from '../models/Notification';
import PushNotificationService from '../services/pushNotificationService';

// Generate JWT Token
const generateToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback-secret', {
    expiresIn: '30d'
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, phone, password, firstName, lastName, middleName, address, city, state, zipCode } = req.body;
    
    // Получаем реферальный код из куки или заголовков
    const referralCode = req.cookies?.referralCode || req.headers['x-referral-code'] as string;

    // Ищем существующего пользователя
    let user = await User.findOne({
      $or: [
        { email: email },
        { phone: phone }
      ]
    });

    if (user) {
      // Если пользователь существует и уже имеет пароль
      if (user.password) {
        res.status(400).json({ message: 'Пользователь с таким email или телефоном уже существует' });
        return;
      }

      // Обновляем данные существующего пользователя
      user.password = password;
      user.firstName = firstName;
      user.lastName = lastName;
      if (middleName) user.middleName = middleName;
      if (address) user.address = address;
      if (city) user.city = city;
      if (state) user.state = state;
      if (zipCode) user.zipCode = zipCode;
      user.isPartiallyRegistered = false;

      // Обработка реферальной системы для существующего пользователя (если он еще не привлечен)
      if (referralCode && !user.referredBy) {
        const referrer = await User.findOne({ referralCode });
        if (referrer) {
          user.referredBy = referrer._id;
          console.log('✅ Существующий пользователь привязан к реферальной ссылке (полная регистрация):', {
            referralCode,
            referrerId: referrer._id,
            referrerEmail: referrer.email,
            userId: user._id,
            userEmail: user.email
          });
        } else {
          console.log('❌ Реферальный код не найден:', referralCode);
        }
      }

      // Если указан адрес и у пользователя нет адресов, добавляем его как адрес по умолчанию
      if (address && (!user.addresses || user.addresses.length === 0)) {
        user.addresses = [{
          id: Date.now().toString(),
          name: 'Основной адрес',
          address,
          city: city || '',
          state: state || '',
          zipCode: zipCode || '',
          isDefault: true,
          createdAt: new Date()
        }];
      }

      await user.save();
      console.log('✅ Обновлен существующий пользователь:', user._id);
    } else {
      // Создаем нового пользователя
      user = new User({
        email,
        phone,
        password,
        firstName,
        lastName,
        middleName,
        address,
        city,
        state,
        zipCode,
        isPartiallyRegistered: false
      });

      // Если указан адрес, добавляем его в список адресов как адрес по умолчанию
      if (address) {
        user.addresses = [{
          id: Date.now().toString(),
          name: 'Основной адрес',
          address,
          city: city || '',
          state: state || '',
          zipCode: zipCode || '',
          isDefault: true,
          createdAt: new Date()
        }];
      }

      // Обработка реферальной системы для нового пользователя
      if (referralCode) {
        const referrer = await User.findOne({ referralCode });
        if (referrer) {
          user.referredBy = referrer._id;
          console.log('✅ Пользователь зарегистрирован по реферальной ссылке:', {
            referralCode,
            referrerId: referrer._id,
            referrerEmail: referrer.email,
            newUserId: user._id,
            newUserEmail: user.email
          });
        } else {
          console.log('❌ Реферальный код не найден:', referralCode);
        }
      } else {
        console.log('ℹ️ Регистрация без реферального кода');
      }

      await user.save();
      console.log('✅ Создан новый пользователь:', user._id);
    }

    // Обновление статистики рефералов при регистрации
    if (referralCode && user.referredBy) {
      try {
        const { Referral, ReferralClick } = await import('../models/Referral');
        
        // Обновляем общую статистику рефералов
        const referralUpdate = await Referral.updateOne(
          { referrerId: user.referredBy },
          { $inc: { registrations: 1 } }
        );
        console.log('📊 Обновлена статистика рефералов:', referralUpdate);

        // Помечаем клик как конвертированный в регистрацию
        const clickUpdate = await ReferralClick.updateOne(
          { 
            referrerId: user.referredBy,
            ip: req.ip || req.connection?.remoteAddress,
            convertedToRegistration: false
          },
          {
            $set: {
              convertedToRegistration: true,
              registrationDate: new Date(),
              referredUserId: user._id
            }
          }
        );
        console.log('🔄 Обновлен клик на регистрацию:', {
          matchedCount: clickUpdate.matchedCount,
          modifiedCount: clickUpdate.modifiedCount,
          ip: req.ip || req.connection?.remoteAddress,
          referredUserId: user._id
        });

        // Обновляем статистику реферера
        const userStatsUpdate = await User.updateOne(
          { _id: user.referredBy },
          { 
            $inc: { 
              'referralStats.totalReferrals': 1 
            },
            $setOnInsert: {
              'referralStats.totalEarnings': 0,
              'referralStats.availableBalance': 0,
              'referralStats.withdrawnAmount': 0,
              'referralStats.activeReferrals': 0
            }
          },
          { upsert: false } // Не создавать новый документ, только обновлять существующий
        );
        console.log('👤 Обновлена статистика пользователя-реферера:', userStatsUpdate);
      } catch (error) {
        console.error('Ошибка при обновлении статистики рефералов:', error);
      }
    }

    // Создаем приветственное уведомление
    const notification = new Notification({
      user: user._id,
      type: 'custom',
      text: `Поздравляем с успешной регистрацией, ${firstName}! 🎉\n\nДобро пожаловать в наш магазин. Мы рады видеть вас в числе наших клиентов и надеемся, что вы найдете у нас всё необходимое.\n\nЖелаем вам приятных покупок! 🛍️`,
      isRead: false
    });
    await notification.save();
    console.log('✅ Создано приветственное уведомление для пользователя:', user._id);

    // Отправляем push-уведомление о регистрации
    try {
      await PushNotificationService.sendWelcomeNotification(user._id, firstName);
      console.log('✅ Отправлено push-уведомление о регистрации');
    } catch (error) {
      console.log('❌ Ошибка отправки push-уведомления о регистрации:', error);
    }

    // Генерируем токен
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    );

    // Отправляем ответ
    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error in register:', error);
    res.status(500).json({ message: 'Ошибка сервера при регистрации' });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🔐 Login request headers:', req.headers);
    console.log('🔐 Login request body:', req.body);
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('❌ Missing email or password');
      res.status(400).json({ message: 'Email и пароль обязательны' });
      return;
    }

    // Check for user email
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found:', email);
      res.status(401).json({ message: 'Неверный email или пароль' });
      return;
    }

    console.log('✅ User found:', { id: user._id, email: user.email, role: user.role });

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('❌ Password mismatch for user:', email);
      res.status(401).json({ message: 'Неверный email или пароль' });
      return;
    }

    console.log('✅ Password verified for user:', email);

    // Check if user has admin panel access
    const isAdminRequest = req.headers.referer?.includes('admin') || req.headers.origin?.includes('admin');
    const allowedRoles = ['admin', 'moderator', 'accountant'];
    if (isAdminRequest && !allowedRoles.includes(user.role)) {
      console.log('❌ User without admin rights trying to access admin panel:', { email, role: user.role });
      res.status(403).json({ message: 'Доступ запрещен. Требуются права администратора, модератора или бухгалтера.' });
      return;
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id.toString());
    console.log('✅ Generated token for user:', { email, token: token.substring(0, 20) + '...' });

    res.json({
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      middleName: user.middleName,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      token
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?._id) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Error in getMe:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?._id) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    user.firstName = req.body.firstName || user.firstName;
    user.lastName = req.body.lastName || user.lastName;
    user.email = req.body.email || user.email;

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      role: updatedUser.role
    });
  } catch (error) {
    console.error('Error in updateProfile:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all users (Admin only)
// @route   GET /api/auth/users
// @access  Private/Admin
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments({});

    // Добавляем authProvider и linkedAccounts в выдачу
    const usersWithProviders = users.map(user => {
      const u = user.toObject();
      return {
        _id: u._id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        middleName: u.middleName,
        phone: u.phone,
        role: u.role,
        avatar: u.avatar,
        addresses: u.addresses || [],
        authProvider: u.authProvider || 'local',
        linkedAccounts: u.linkedAccounts || { google: false, yandex: false, telegram: false }
      };
    });

    res.json({
      users: usersWithProviders,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// @desc    Delete user (Admin only)
// @route   DELETE /api/auth/users/:id
// @access  Private/Admin
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      await user.deleteOne();
      res.json({ message: 'Пользователь удален' });
    } else {
      res.status(404).json({ message: 'Пользователь не найден' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// @desc    Forgot password (отправка email с токеном)
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ message: 'Пользователь с таким email не найден' });
      return;
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '1h' });
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    await sendMail({
      to: user.email,
      subject: 'Восстановление пароля',
      html: `<p>Для сброса пароля перейдите по ссылке: <a href="${resetUrl}">${resetUrl}</a></p>`
    });
    res.json({ message: 'Письмо для восстановления пароля отправлено' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// @desc    Reset password (установка нового пароля по токену)
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      res.status(400).json({ message: 'Требуется токен и новый пароль' });
      return;
    }
    let payload: any;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    } catch (e) {
      res.status(400).json({ message: 'Недействительный или истёкший токен' });
      return;
    }
    const user = await User.findById(payload.id);
    if (!user) {
      res.status(404).json({ message: 'Пользователь не найден' });
      return;
    }
    user.password = password;
    await user.save();
    res.json({ message: 'Пароль успешно обновлён' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// @desc    Google OAuth
// @route   POST /api/auth/google
// @access  Public
export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { accessToken } = req.body;
    // TODO: Валидация токена через Google API
    const googleUser = { id: 'google_id', email: 'user@gmail.com', name: 'User Name' };
    let user = await User.findOne({ googleId: googleUser.id });
    if (!user) {
      user = await User.findOne({ email: googleUser.email });
      if (user) {
        user.googleId = googleUser.id;
        user.linkedAccounts = { ...(user.linkedAccounts || {}), google: true };
        if (!user.authProvider || user.authProvider === 'local') user.authProvider = 'google';
        await user.save();
      } else {
        user = await User.create({
          email: googleUser.email,
          firstName: googleUser.name.split(' ')[0],
          lastName: googleUser.name.split(' ')[1] || '',
          googleId: googleUser.id,
          password: Math.random().toString(36).slice(-8), // Временный пароль
          emailVerified: true,
          authProvider: 'google',
          linkedAccounts: { google: true, yandex: false, telegram: false }
        });
      }
    } else {
      user.linkedAccounts = { ...(user.linkedAccounts || {}), google: true };
      if (!user.authProvider || user.authProvider === 'local') user.authProvider = 'google';
      await user.save();
    }
    res.json({
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      authProvider: user.authProvider,
      linkedAccounts: user.linkedAccounts,
      token: generateToken(user._id.toString())
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const yandexAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { accessToken } = req.body;
    // TODO: Валидация токена через Yandex API
    const yandexUser = { id: 'yandex_id', email: 'user@yandex.ru', name: 'User Name' };
    let user = await User.findOne({ yandexId: yandexUser.id });
    if (!user) {
      user = await User.findOne({ email: yandexUser.email });
      if (user) {
        user.yandexId = yandexUser.id;
        user.linkedAccounts = { ...(user.linkedAccounts || {}), yandex: true };
        if (!user.authProvider || user.authProvider === 'local') user.authProvider = 'yandex';
        await user.save();
      } else {
        user = await User.create({
          email: yandexUser.email,
          firstName: yandexUser.name.split(' ')[0],
          lastName: yandexUser.name.split(' ')[1] || '',
          yandexId: yandexUser.id,
          password: Math.random().toString(36).slice(-8),
          emailVerified: true,
          authProvider: 'yandex',
          linkedAccounts: { google: false, yandex: true, telegram: false }
        });
      }
    } else {
      user.linkedAccounts = { ...(user.linkedAccounts || {}), yandex: true };
      if (!user.authProvider || user.authProvider === 'local') user.authProvider = 'yandex';
      await user.save();
    }
    res.json({
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      authProvider: user.authProvider,
      linkedAccounts: user.linkedAccounts,
      token: generateToken(user._id.toString())
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const telegramAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body;
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7798709445:AAGiNnhVH4NdRS6G84-OiI5lfcbzjqSf0Xk';
    // Проверка подписи (hash)
    const { hash, ...fields } = data;
    const secret = crypto.createHash('sha256').update(TELEGRAM_BOT_TOKEN).digest();
    const sorted = Object.keys(fields).sort().map(key => `${key}=${fields[key]}`).join('\n');
    const hmac = crypto.createHmac('sha256', secret).update(sorted).digest('hex');
    if (hmac !== hash) {
      return res.status(403).json({ message: 'Invalid Telegram signature' });
    }
    // Найти или создать пользователя по telegramId
    let user = await User.findOne({ telegramId: data.id });
    if (!user) {
      user = await User.create({
        telegramId: data.id,
        firstName: data.first_name || '',
        lastName: data.last_name || '',
        username: data.username || '',
        avatar: data.photo_url || '',
        email: data.username ? `${data.username}@telegram.user` : undefined,
        password: Math.random().toString(36).slice(-8),
        emailVerified: true,
        authProvider: 'telegram',
        linkedAccounts: { google: false, yandex: false, telegram: true }
      });
    } else {
      user.linkedAccounts = { ...(user.linkedAccounts || {}), telegram: true };
      if (!user.authProvider || user.authProvider === 'local') user.authProvider = 'telegram';
      await user.save();
    }
    res.json({
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      avatar: user.avatar,
      role: user.role,
      authProvider: user.authProvider,
      linkedAccounts: user.linkedAccounts,
      token: generateToken(user._id.toString())
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const checkAccess = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const user = await User.findById(req.user._id).select('role');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if user has admin panel access
    const isAdminRequest = req.headers.referer?.includes('admin') || req.headers.origin?.includes('admin');
    const allowedRoles = ['admin', 'moderator', 'accountant'];
    
    if (isAdminRequest && !allowedRoles.includes(user.role)) {
      return res.status(403).json({ 
        message: 'Access denied',
        hasAccess: false
      });
    }

    return res.json({
      hasAccess: true,
      role: user.role
    });
  } catch (error) {
    console.error('Error in checkAccess:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}; 