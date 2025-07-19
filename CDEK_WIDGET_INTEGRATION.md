# Интеграция виджета CDEK 3.0

## Обзор

Виджет CDEK 3.0 предоставляет готовое решение для интеграции карты с пунктами выдачи заказов (ПВЗ) и расчета стоимости доставки в интернет-магазинах.

## Компоненты

### 1. CDEKWidjet.tsx
Основной компонент для интеграции виджета CDEK 3.0.

**Функции:**
- Загрузка скрипта виджета CDEK
- Инициализация виджета с настройками
- Обработка событий виджета
- Обработка ошибок загрузки

**Пропсы:**
```typescript
interface CDEKWidjetProps {
  from: {
    country_code: string;
    city: string;
    postal_code?: number;
    code?: number;
    address?: string;
  };
  apiKey?: string;
  canChoose?: boolean;
  servicePath?: string;
  hideFilters?: {
    have_cashless?: boolean;
    have_cash?: boolean;
    is_dressing_room?: boolean;
    type?: boolean;
  };
  hideDeliveryOptions?: {
    office?: boolean;
    door?: boolean;
  };
  debug?: boolean;
  goods?: Array<{
    width: number;
    height: number;
    length: number;
    weight: number;
  }>;
  defaultLocation?: [number, number] | string;
  lang?: 'rus' | 'eng';
  currency?: string;
  tariffs?: {
    office?: number[];
    door?: number[];
    pickup?: number[];
  };
  onReady?: () => void;
  onCalculate?: (tariffs: any, address: any) => void;
  onChoose?: (deliveryMode: string, tariff: any, address: any) => void;
}
```

### 2. CDEKWidjetWrapper.tsx
Компонент-обертка для интеграции виджета в корзину.

**Функции:**
- Парсинг адреса для получения города
- Обработка событий виджета
- Отображение информации о выбранной доставке
- Интеграция с системой корзины

## Интеграция в корзину

### Обновление страницы корзины

В файле `frontend/app/cart/page.tsx` добавлен переключатель между старым и новым виджетом:

```typescript
// Добавлен импорт
import CDEKWidjetWrapper from '../../components/CDEKWidjetWrapper';

// Добавлено состояние
const [useCDEKWidjet, setUseCDEKWidjet] = useState<boolean>(false);

// В секции CDEK доставки добавлен переключатель
{selectedMethod.intervalType === 'cdek' && (
  <div className="space-y-4">
    {/* Переключатель между виджетами */}
    <div className="flex items-center space-x-4 mb-4">
      <label className="flex items-center space-x-2">
        <input
          type="radio"
          checked={!useCDEKWidjet}
          onChange={() => setUseCDEKWidjet(false)}
          className="text-blue-600"
        />
        <span className="text-sm font-medium">Стандартный виджет</span>
      </label>
      <label className="flex items-center space-x-2">
        <input
          type="radio"
          checked={useCDEKWidjet}
          onChange={() => setUseCDEKWidjet(true)}
          className="text-blue-600"
        />
        <span className="text-sm font-medium">Новый виджет CDEK 3.0</span>
      </label>
    </div>

    {/* Выбор виджета */}
    {useCDEKWidjet ? (
      <CDEKWidjetWrapper
        address={formData.address}
        onDateSelect={handleDateSelect}
        selectedDate={cdekSelectedDate}
        selectedInterval={cdekSelectedInterval}
        selectedPVZ={cdekSelectedPVZ}
        goods={cartItems.map(item => ({
          width: 10,
          height: 10,
          length: 10,
          weight: 1
        }))}
      />
    ) : (
      <CDEKDeliverySelector
        address={formData.address}
        onDateSelect={handleDateSelect}
        selectedDate={cdekSelectedDate}
        selectedInterval={cdekSelectedInterval}
        selectedPVZ={cdekSelectedPVZ}
      />
    )}
  </div>
)}
```

## Настройка окружения

### 1. Переменные окружения

Добавьте в файл `.env.local`:

```env
# CDEK Widget Configuration
NEXT_PUBLIC_YANDEX_API_KEY=your_yandex_api_key_here
NEXT_PUBLIC_CDEK_WIDGET_DEBUG=true
```

### 2. Получение API ключей

**Яндекс.Карты API:**
1. Зарегистрируйтесь на [Яндекс.Карты для разработчиков](https://developer.tech.yandex.ru/)
2. Создайте приложение
3. Получите API ключ
4. Добавьте ключ в переменную `NEXT_PUBLIC_YANDEX_API_KEY`

**CDEK API (опционально):**
1. Зарегистрируйтесь в [CDEK](https://cdek.ru/)
2. Получите тестовые или боевые ключи API
3. Настройте сервис для расчетов

## Тестирование

### Тестовая страница

Создана тестовая страница `/test-cdek-widget` для демонстрации виджета:

- Настройка адреса доставки
- Отображение выбранных параметров
- Информация о функциях виджета
- Примечания по тестированию

### Функции для тестирования

1. **Поиск ПВЗ:** Введите адрес и найдите ближайшие пункты выдачи
2. **Расчет стоимости:** Выберите ПВЗ для расчета стоимости доставки
3. **Выбор даты:** Выберите удобную дату доставки
4. **Фильтрация:** Используйте фильтры по типу ПВЗ и способам оплаты

## События виджета

### onReady
Срабатывает после загрузки виджета:
```typescript
onReady: () => {
  console.log('Виджет CDEK загружен');
}
```

### onCalculate
Срабатывает после расчета стоимости:
```typescript
onCalculate: (tariffs: any, address: any) => {
  console.log('Расчет стоимости доставки:', { tariffs, address });
}
```

### onChoose
Срабатывает при выборе доставки:
```typescript
onChoose: (deliveryMode: string, tariff: any, address: any) => {
  console.log('Выбрана доставка:', { deliveryMode, tariff, address });
}
```

## Настройки виджета

### Основные параметры

```typescript
const widgetConfig = {
  from: {
    country_code: 'RU',
    city: 'Москва',
    address: 'ул. Тверская, д. 1'
  },
  apiKey: process.env.NEXT_PUBLIC_YANDEX_API_KEY,
  canChoose: true,
  debug: true,
  goods: [{
    width: 15,
    height: 10,
    length: 20,
    weight: 2
  }],
  lang: 'rus',
  currency: 'RUB',
  tariffs: {
    office: [234, 136, 138],
    door: [233, 137, 139],
    pickup: [234, 136, 138]
  }
};
```

### Фильтры и ограничения

```typescript
const filters = {
  hideFilters: {
    have_cashless: false,
    have_cash: false,
    is_dressing_room: false,
    type: false
  },
  hideDeliveryOptions: {
    office: false,
    door: false
  }
};
```

## Обработка ошибок

### Типичные ошибки

1. **Ошибка загрузки виджета:**
   - Проверьте доступность скрипта CDEK
   - Убедитесь в корректности API ключа

2. **Ошибка инициализации:**
   - Проверьте параметры конфигурации
   - Убедитесь в корректности адреса отправителя

3. **Ошибка расчета стоимости:**
   - Проверьте доступность сервиса расчетов
   - Убедитесь в корректности параметров груза

### Fallback данные

При ошибках API виджет использует тестовые данные для демонстрации функциональности.

## Производительность

### Оптимизация загрузки

1. **Асинхронная загрузка:** Скрипт виджета загружается асинхронно
2. **Ленивая инициализация:** Виджет инициализируется только при необходимости
3. **Очистка ресурсов:** При размонтировании компонента ресурсы освобождаются

### Мониторинг

```typescript
// Логирование событий
console.log('Виджет CDEK загружен');
console.log('Расчет стоимости доставки:', data);
console.log('Выбрана доставка:', selection);
```

## Безопасность

### API ключи

- Храните API ключи в переменных окружения
- Не включайте ключи в код
- Используйте разные ключи для разработки и продакшена

### Валидация данных

- Проверяйте корректность адресов
- Валидируйте параметры груза
- Обрабатывайте ошибки API

## Дальнейшее развитие

### Планируемые улучшения

1. **Кэширование данных:** Кэширование ПВЗ и расчетов
2. **Адаптивность:** Улучшение мобильной версии
3. **Интеграция с заказами:** Автоматическое создание заказов в CDEK
4. **Аналитика:** Отслеживание использования виджета

### Расширение функциональности

1. **Множественные грузы:** Поддержка нескольких товаров
2. **Специальные тарифы:** Интеграция с корпоративными тарифами
3. **Уведомления:** SMS/email уведомления о статусе доставки
4. **Отслеживание:** Интеграция с системой отслеживания посылок

## Поддержка

### Документация

- [Официальная документация CDEK Widget](https://github.com/cdek-it/widget)
- [API CDEK](https://api-docs.cdek.ru/)
- [Яндекс.Карты API](https://developer.tech.yandex.ru/)

### Контакты

- CDEK поддержка: [support@cdek.ru](mailto:support@cdek.ru)
- Яндекс.Карты поддержка: [maps-api@yandex.ru](mailto:maps-api@yandex.ru) 