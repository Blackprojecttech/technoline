import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';

// Создаем папку uploads если её нет
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Настройка хранилища
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Генерируем уникальное имя файла
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Фильтр файлов
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Проверяем тип файла
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Можно загружать только изображения!'));
  }
};

// Создаем экземпляр multer
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  }
});

// Middleware для загрузки одного изображения
export const uploadSingle = upload.single('image');

// Middleware для загрузки нескольких изображений
export const uploadMultiple = upload.array('file', 5); // максимум 5 изображений, поле 'file' используется по умолчанию в Ant Design

// Обработчик ошибок для multer
export const handleUploadError = (error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Multer error:', error);
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Файл слишком большой. Максимальный размер: 2MB' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Слишком много файлов. Максимум: 5 файлов' });
    }
  }
  return res.status(500).json({ message: 'Ошибка при загрузке файла' });
}; 