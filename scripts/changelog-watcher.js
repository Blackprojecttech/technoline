const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const glob = require('glob');

const PROJECT_ROOT = process.cwd();
const CHANGELOG_PATH = path.join(PROJECT_ROOT, 'backend', 'logs', 'ai-changelog.json');
const lockPath = '.rollback-lock';

function isRollbackInProgress() {
  return fs.existsSync(lockPath);
}

const IGNORED_PATHS = [
  /node_modules/,
  /\.git/,
  /\.next/,
  /dist/,
  /build/,
  /public\/.*\.(png|jpe?g|gif|svg|webp|ico|bmp|tiff|mp4|mp3|ogg|wav|mov|avi|zip|rar|7z|tar|gz|exe|dll|bin|DS_Store)$/i,
  /uploads\/.*\.(png|jpe?g|gif|svg|webp|ico|bmp|tiff|mp4|mp3|ogg|wav|mov|avi|zip|rar|7z|tar|gz|exe|dll|bin|DS_Store)$/i,
  /cache/,
  /\.DS_Store$/,
  /\.env/,
  /\.log$/,
  /\.tmp$/,
  /\.swp$/,
  /\.lock$/,
  /vendor/,
  /\.vscode/,
  /\.idea/,
  CHANGELOG_PATH, // абсолютный путь к changelog-файлу
  // Исключаем автоматически генерируемые страницы категорий
  /frontend\/app\/catalog\/.*\/page\.tsx$/,
  // Исключаем скрипты автоматической генерации
  /frontend\/scripts\/create-category-pages\.js$/,
  // Исключаем файлы состояния и временные файлы
  /\.changelog-watcher-state\.json$/,
  /\.rollback-lock$/,
];

function ignored(filePath) {
  return IGNORED_PATHS.some(pattern =>
    pattern instanceof RegExp
      ? pattern.test(filePath)
      : filePath === pattern
  );
}

// Отслеживаем только исходные файлы в frontend, backend и admin/src
const WATCHED_DIRS = [
  path.join(PROJECT_ROOT, 'frontend'),
  path.join(PROJECT_ROOT, 'backend'),
  path.join(PROJECT_ROOT, 'admin', 'src'),
];

// Отслеживаем только исходные файлы с этими расширениями:
const ALLOWED_EXTENSIONS = [
  '.js', '.ts', '.tsx', '.jsx', '.json', '.css', '.scss', '.md', '.yml', '.yaml', '.env', '.html', '.php'
];

function isAllowedFile(filePath) {
  return ALLOWED_EXTENSIONS.some(ext => filePath.endsWith(ext));
}

function getFileHash(content) {
  return crypto.createHash('sha256').update(content || '').digest('hex');
}

// УБИРАЕМ ограничение на размер diff и разбиение на чанки
// function splitContentToChunks(content, chunkSize) { ... } // больше не нужно
// function getFileContentChunks(filePath) { ... } // больше не нужно

function getFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

const MAX_CHANGELOG_ENTRIES = 100; // Храним только последние 100 изменений

function saveChangelogEntry(entry) {
  let changelog = [];
  if (fs.existsSync(CHANGELOG_PATH)) {
    try {
      changelog = JSON.parse(fs.readFileSync(CHANGELOG_PATH, 'utf8'));
    } catch {}
  }
  changelog.push(entry);
  // Оставляем только последние MAX_CHANGELOG_ENTRIES
  if (changelog.length > MAX_CHANGELOG_ENTRIES) {
    changelog = changelog.slice(-MAX_CHANGELOG_ENTRIES);
  }
  fs.writeFileSync(CHANGELOG_PATH, JSON.stringify(changelog, null, 2));
}

function logChange(action, filePath, oldContent = null, newContent = null) {
  // Проверяем, что содержимое действительно изменилось
  if (action === 'change') {
    // Нормализуем содержимое для сравнения (убираем лишние пробелы)
    const normalizeContent = (content) => {
      if (!content) return '';
      return content.trim().replace(/\s+/g, ' ');
    };
    
    const normalizedOld = normalizeContent(oldContent);
    const normalizedNew = normalizeContent(newContent);
    
    if (normalizedOld === normalizedNew) {
      console.log(`Пропускаем запись: содержимое файла не изменилось - ${filePath}`);
      return;
    }
  }
  
  const entry = {
    timestamp: new Date().toISOString(),
    action,
    file: filePath,
    old: oldContent,
    new: newContent,
    description: `${action}: ${filePath}`
  };
  saveChangelogEntry(entry);
}

// Файл для хранения хэшей/состояния файлов
const statePath = '.changelog-watcher-state.json';
let fileState = {};

// Фаза инициализации: если нет состояния, обходим все файлы и сохраняем их mtime
if (!fs.existsSync(statePath)) {
  console.log('Changelog watcher: инициализация, запоминаю текущее состояние файлов...');
  for (const dir of WATCHED_DIRS) {
    const files = glob.sync(dir + '/**/*.{js,jsx,ts,tsx,css,json}', { nodir: true });
    for (const file of files) {
      try {
        fileState[file] = fs.statSync(file).mtimeMs;
      } catch {}
    }
  }
  fs.writeFileSync(statePath, JSON.stringify(fileState, null, 2));
  console.log('Changelog watcher: инициализация завершена.');
}
// После инициализации — обычный watcher
fileState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));

// Флаг первого запуска (нет состояния)
const isFirstRun = Object.keys(fileState).length === 0;

let lastRollbackTime = 0;
const ROLLBACK_IGNORE_MS = 3000; // 3 секунды

// Следим за lock-файлом отдельно
try {
  fs.watchFile(lockPath, { persistent: false, interval: 100 }, (curr, prev) => {
    if (prev.nlink === 1 && curr.nlink === 0) {
      // lock-файл только что исчез
      lastRollbackTime = Date.now();
    }
  });
} catch (e) {
  // fail silently
}

function shouldIgnoreEvent() {
  if (isRollbackInProgress()) return true;
  if (Date.now() - lastRollbackTime < ROLLBACK_IGNORE_MS) return true;
  return false;
}

const watcher = chokidar.watch(WATCHED_DIRS, {
  ignored,
  persistent: true,
  ignoreInitial: false,
  awaitWriteFinish: true,
});

const fileCache = new Map();

watcher
  .on('add', filePath => {
    if (shouldIgnoreEvent()) {
      return;
    }
    if (isFirstRun) {
      // Просто запоминаем состояние, не пишем в changelog
      fileState[filePath] = fs.statSync(filePath).mtimeMs;
      fs.writeFileSync(statePath, JSON.stringify(fileState, null, 2));
      return;
    }
    const content = getFileContent(filePath);
    logChange('add', filePath, null, content);
    fileCache.set(filePath, content);
  })
  .on('change', filePath => {
    if (shouldIgnoreEvent()) {
      return;
    }
    const prevContent = fileCache.get(filePath) ?? null;
    const newContent = getFileContent(filePath);
    
    // Проверяем, действительно ли содержимое изменилось
    if (prevContent === newContent) {
      console.log(`Пропускаем изменение: содержимое файла не изменилось - ${filePath}`);
      return;
    }
    
    logChange('change', filePath, prevContent, newContent);
    fileCache.set(filePath, newContent);
    fileState[filePath] = fs.statSync(filePath).mtimeMs;
    fs.writeFileSync(statePath, JSON.stringify(fileState, null, 2));
  })
  .on('unlink', filePath => {
    if (shouldIgnoreEvent()) {
      return;
    }
    const prevContent = fileCache.get(filePath) ?? null;
    logChange('unlink', filePath, prevContent, null);
    fileCache.delete(filePath);
  });

console.log('Changelog watcher запущен. Все изменения будут фиксироваться в .ai-changelog.json'); 