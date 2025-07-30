import express from 'express';
import { uploadSingle, uploadMultiple, handleUploadError } from '../middleware/upload';
import { auth, adminOrAccountant } from '../middleware/auth';
import path from 'path';

const router = express.Router();

// Загрузка одного изображения
router.post('/image', auth, adminOrAccountant, uploadSingle, (req, res): void => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'Файл не был загружен' });
      return;
    }

    // Возвращаем путь к файлу
    const fileUrl = `/uploads/${req.file.filename}`;
    
    res.json({
      success: true,
      file: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        url: fileUrl,
        size: req.file.size
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при загрузке файла' });
  }
});

// Загрузка нескольких изображений
router.post('/images', auth, adminOrAccountant, (req, res, next) => {
  console.log('Upload endpoint hit');
  console.log('Request headers:', req.headers);
  console.log('Request body keys:', Object.keys(req.body || {}));
  
  uploadMultiple(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(500).json({ message: 'Ошибка при загрузке файлов', error: err.message });
    }
    
    console.log('Upload request received:', req.files);
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Файлы не были загружены' });
    }

    const files = (req.files as Express.Multer.File[]).map(file => ({
      filename: file.filename,
      originalname: file.originalname,
      url: `/uploads/${file.filename}`,
      size: file.size
    }));

    console.log('Files processed:', files);

    return res.json({
      success: true,
      files
    });
  });
});

// Получение изображения
router.get('/uploads/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../../uploads', filename);
  
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).json({ message: 'Файл не найден' });
    }
  });
});

export default router; 