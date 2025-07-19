// @ts-nocheck
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { sendMail } from '../utils/mailer';

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
    console.log('🔐 Register request headers:', req.headers);
    console.log('🔐 Register request body:', req.body);
    const { email, password, firstName, lastName, phone } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      console.log('❌ Missing required fields:', { email: !!email, password: !!password, firstName: !!firstName, lastName: !!lastName });
      res.status(400).json({ message: 'Все обязательные поля должны быть заполнены' });
      return;
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      console.log('❌ User already exists:', email);
      res.status(400).json({ message: 'Пользователь с таким email уже существует' });
      return;
    }

    console.log('✅ Creating user with data:', { email, firstName, lastName, phone: phone || 'not provided' });

    // Create user
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      phone
    });

    if (user) {
      console.log('✅ User created successfully:', user._id);
      res.status(201).json({
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        token: generateToken(user._id.toString())
      });
    } else {
      console.log('❌ Failed to create user');
      res.status(400).json({ message: 'Неверные данные пользователя' });
    }
  } catch (error) {
    console.error('❌ Register error:', error);
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
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

    console.log('✅ User found:', user._id);

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('❌ Password mismatch for user:', email);
      res.status(401).json({ message: 'Неверный email или пароль' });
      return;
    }

    console.log('✅ Password verified for user:', email);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.json({
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      token: generateToken(user._id.toString())
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
    if (!req.user) {
      res.status(401).json({ message: 'Пользователь не авторизован' });
      return;
    }
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Пользователь не авторизован' });
      return;
    }
    const user = await User.findById(req.user._id);

    if (user) {
      user.firstName = req.body.firstName || user.firstName;
      user.lastName = req.body.lastName || user.lastName;
      user.phone = req.body.phone || user.phone;
      user.avatar = req.body.avatar || user.avatar;

      if (req.body.password) {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phone: updatedUser.phone,
        role: updatedUser.role,
        avatar: updatedUser.avatar,
        token: generateToken(updatedUser._id.toString())
      });
    } else {
      res.status(404).json({ message: 'Пользователь не найден' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
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

    res.json({
      users,
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
        await user.save();
      } else {
        user = await User.create({
          email: googleUser.email,
          firstName: googleUser.name.split(' ')[0],
          lastName: googleUser.name.split(' ')[1] || '',
          googleId: googleUser.id,
          password: Math.random().toString(36).slice(-8), // Временный пароль
          emailVerified: true
        });
      }
    }
    
    res.json({
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
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
        await user.save();
      } else {
        user = await User.create({
          email: yandexUser.email,
          firstName: yandexUser.name.split(' ')[0],
          lastName: yandexUser.name.split(' ')[1] || '',
          yandexId: yandexUser.id,
          password: Math.random().toString(36).slice(-8),
          emailVerified: true
        });
      }
    }
    
    res.json({
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      token: generateToken(user._id.toString())
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

export const telegramAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { accessToken } = req.body;
    // TODO: Валидация токена через Telegram API
    const telegramUser = { id: 'telegram_id', username: 'user', name: 'User Name' };
    
    let user = await User.findOne({ telegramId: telegramUser.id });
    if (!user) {
      user = await User.create({
        email: `${telegramUser.username}@telegram.user`,
        firstName: telegramUser.name.split(' ')[0],
        lastName: telegramUser.name.split(' ')[1] || '',
        telegramId: telegramUser.id,
        password: Math.random().toString(36).slice(-8),
        emailVerified: true
      });
    }
    
    res.json({
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      token: generateToken(user._id.toString())
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
}; 