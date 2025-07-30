import express from 'express';
import { User, IUser } from '../models/User';
import { auth, adminOnly } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';

const router = express.Router();

// Get all users (Admin only)
router.get('/', auth, adminOnly, async (req, res) => {
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
});

// Get user by ID (Admin only)
router.get('/:id', auth, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'Пользователь не найден' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Update user (Admin only)
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      Object.assign(user, req.body);
      const updatedUser = await user.save();
      res.json(updatedUser);
    } else {
      res.status(404).json({ message: 'Пользователь не найден' });
    }
  } catch (error) {
    res.status(400).json({ message: 'Ошибка при обновлении пользователя' });
  }
});

// Delete user (Admin only)
router.delete('/:id', auth, adminOnly, async (req, res) => {
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
});

// Get user addresses
router.get('/:id/addresses', auth, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    const currentUser = req.user as IUser;
    if (String(currentUser?._id) !== req.params.id && currentUser?.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }
    return res.json({ addresses: user.addresses || [] });
  } catch (error) {
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Add new address
router.post('/:id/addresses', auth, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    const currentUser = req.user as IUser;
    if (String(currentUser?._id) !== req.params.id && currentUser?.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }
    const { name, address, isDefault = false } = req.body;
    if (!name || !address) {
      return res.status(400).json({ message: 'Название и адрес обязательны' });
    }
    if (isDefault || !user.addresses || user.addresses.length === 0) {
      if (user.addresses) {
        user.addresses.forEach(addr => addr.isDefault = false);
      }
    }
    const newAddress = {
      id: Date.now().toString(),
      name,
      address,
      isDefault: isDefault || (!user.addresses || user.addresses.length === 0),
      createdAt: new Date()
    };
    if (!user.addresses) {
      user.addresses = [];
    }
    user.addresses.push(newAddress);
    await user.save();
    return res.json({ address: newAddress, message: 'Адрес добавлен' });
  } catch (error) {
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Update address
router.put('/:id/addresses/:addressId', auth, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    const currentUser = req.user as IUser;
    if (String(currentUser?._id) !== req.params.id && currentUser?.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }
    const { name, address, isDefault } = req.body;
    const addressId = req.params.addressId;
    if (!user.addresses) {
      return res.status(404).json({ message: 'Адрес не найден' });
    }
    const addressIndex = user.addresses.findIndex(addr => addr.id === addressId);
    if (addressIndex === -1) {
      return res.status(404).json({ message: 'Адрес не найден' });
    }
    if (isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }
    if (name !== undefined) user.addresses[addressIndex].name = name;
    if (address !== undefined) user.addresses[addressIndex].address = address;
    if (isDefault !== undefined) user.addresses[addressIndex].isDefault = isDefault;
    await user.save();
    return res.json({ address: user.addresses[addressIndex], message: 'Адрес обновлен' });
  } catch (error) {
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Delete address
router.delete('/:id/addresses/:addressId', auth, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    const currentUser = req.user as IUser;
    if (String(currentUser?._id) !== req.params.id && currentUser?.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }
    const addressId = req.params.addressId;
    if (!user.addresses) {
      return res.status(404).json({ message: 'Адрес не найден' });
    }
    const addressIndex = user.addresses.findIndex(addr => addr.id === addressId);
    if (addressIndex === -1) {
      return res.status(404).json({ message: 'Адрес не найден' });
    }
    const deletedAddress = user.addresses[addressIndex];
    user.addresses.splice(addressIndex, 1);
    if (deletedAddress.isDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }
    await user.save();
    return res.json({ message: 'Адрес удален' });
  } catch (error) {
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Set default address
router.patch('/:id/addresses/:addressId/default', auth, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    const currentUser = req.user as IUser;
    if (String(currentUser?._id) !== req.params.id && currentUser?.role !== 'admin') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }
    const addressId = req.params.addressId;
    if (!user.addresses) {
      return res.status(404).json({ message: 'Адрес не найден' });
    }
    const addressIndex = user.addresses.findIndex(addr => addr.id === addressId);
    if (addressIndex === -1) {
      return res.status(404).json({ message: 'Адрес не найден' });
    }
    user.addresses.forEach(addr => addr.isDefault = false);
    user.addresses[addressIndex].isDefault = true;
    await user.save();
    return res.json({ address: user.addresses[addressIndex], message: 'Адрес по умолчанию установлен' });
  } catch (error) {
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получить избранное пользователя
router.get('/favorites', auth, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.user?._id).populate('favorites');
    if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
    return res.json({ favorites: user.favorites });
  } catch (error) {
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Добавить товар в избранное
router.post('/favorites/:productId', auth, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
    const productId = new mongoose.Types.ObjectId(req.params.productId);
    if (!user.favorites) user.favorites = [];
    if (!user.favorites.find(id => id.toString() === productId.toString())) {
      user.favorites.push(productId);
      await user.save();
    }
    return res.json({ favorites: user.favorites });
  } catch (error) {
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Удалить товар из избранного
router.delete('/favorites/:productId', auth, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
    const productId = req.params.productId;
    user.favorites = (user.favorites || []).filter(id => id.toString() !== productId);
    await user.save();
    return res.json({ favorites: user.favorites });
  } catch (error) {
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
});

export default router; 