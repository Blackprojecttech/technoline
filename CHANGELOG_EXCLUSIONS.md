# Система исключений в Changelog Watcher

## Проблема

Система `changelog-watcher.js` отслеживала все изменения файлов, включая автоматически генерируемые файлы, что приводило к записи в changelog изменений, которые пользователь не делал вручную.

## Решение

Добавлены исключения для автоматически генерируемых файлов в конфигурацию `changelog-watcher.js`.

## Исключенные файлы и папки

### 1. Автоматически генерируемые страницы категорий
```
/frontend/app/catalog/.*/page.tsx
```
**Причина:** Эти файлы автоматически создаются и обновляются скриптом `create-category-pages.js` при:
- Запуске backend сервера
- Создании новой категории
- Обновлении категории
- Удалении категории

### 2. Скрипты автоматической генерации
```
/frontend/scripts/create-category-pages.js
```
**Причина:** Этот файл содержит логику автоматической генерации страниц и не должен отслеживаться как пользовательское изменение.

### 3. Файлы состояния и временные файлы
```
/.changelog-watcher-state.json
/.rollback-lock
```
**Причина:** Эти файлы используются самой системой changelog для отслеживания состояния и не должны попадать в changelog.

### 4. Стандартные исключения
- `node_modules/` - зависимости
- `.git/` - система контроля версий
- `.next/` - кэш Next.js
- `dist/`, `build/` - скомпилированные файлы
- `uploads/` - загруженные файлы
- `vendor/` - сторонние библиотеки
- `.vscode/`, `.idea/` - настройки IDE
- Различные временные файлы (`.tmp`, `.swp`, `.log`)

## Как это работает

### 1. Проверка исключений

Система проверяет каждый измененный файл через функцию `ignored()`:

```javascript
function ignored(filePath) {
  return IGNORED_PATHS.some(pattern =>
    pattern instanceof RegExp
      ? pattern.test(filePath)
      : filePath === pattern
  );
}
```

Если файл соответствует любому из паттернов исключения, он не будет записан в changelog.

### 2. Проверка содержимого

Система также проверяет, действительно ли изменилось содержимое файла:

```javascript
function logChange(action, filePath, oldContent = null, newContent = null) {
  if (action === 'change') {
    // Нормализуем содержимое для сравнения
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
  // ... запись в changelog
}
```

Если старое и новое содержимое одинаковые (после нормализации), запись не создается.

## Преимущества

1. **Чистый changelog** - только реальные изменения пользователя
2. **Меньше шума** - нет автоматических изменений
3. **Лучшая производительность** - меньше записей для обработки
4. **Точность** - только осмысленные изменения
5. **Исключение дублирующих изменений** - не записываются изменения с одинаковым содержимым

## Добавление новых исключений

Для добавления нового исключения добавьте паттерн в массив `IGNORED_PATHS`:

```javascript
const IGNORED_PATHS = [
  // ... существующие исключения
  /новый\/паттерн\/для\/исключения/,
];
```

## Проверка исключений

Чтобы проверить, что файл исключен, можно добавить отладочный вывод:

```javascript
function ignored(filePath) {
  const isIgnored = IGNORED_PATHS.some(pattern =>
    pattern instanceof RegExp
      ? pattern.test(filePath)
      : filePath === pattern
  );
  
  if (isIgnored) {
    console.log(`Файл исключен: ${filePath}`);
  }
  
  return isIgnored;
}
``` 