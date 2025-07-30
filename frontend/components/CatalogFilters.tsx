import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface CatalogFiltersState {
  searchQuery: string | null;
  priceMin: string;
  priceMax: string;
  inStock: boolean;
  brand: string;
  rating: string;
  onlyDiscount: boolean;
  colors: string[];
}

interface CatalogFiltersProps {
  filters: CatalogFiltersState;
  onChange: (filters: CatalogFiltersState) => void;
  hideBrandFilter?: boolean;
  products?: { name: string; description?: string; sku?: string }[];
}

const BRANDS = [
  '', 'Apple', 'Samsung', 'Xiaomi', 'Sony', 'Honor', 'Asus', 'Adata', 'Другой'
];
const RATINGS = [
  '', '4', '4.5', '5'
];
// Моковый список цветов (можно сделать автоопределение по товарам)
const COLOR_PALETTE = [
  { name: 'Черный', value: ['черный', 'black', 'midnight', 'phantom black', 'graphite'], hex: '#222' },
  { name: 'Белый', value: ['белый', 'white'], hex: '#fff', border: true },
  { name: 'Серебристый', value: ['silver', 'серебристый'], hex: '#e5e7eb' },
  { name: 'Синий', value: ['синий', 'blue', 'pacific blue', 'navy', 'dark blue'], hex: '#2563eb' },
  { name: 'Красный', value: ['красный', 'red'], hex: '#ef4444' },
  { name: 'Зеленый', value: ['зеленый', 'green'], hex: '#22c55e' },
  { name: 'Серый', value: ['серый', 'gray', 'grey', 'space gray', 'space grey'], hex: '#6b7280' },
  { name: 'Золотой', value: ['золотой', 'gold', 'golden', 'starlight'], hex: '#facc15' },
  { name: 'Розовый', value: ['розовый', 'pink', 'rose gold'], hex: '#ec4899' },
  { name: 'Фиолетовый', value: ['фиолетовый', 'purple', 'violet', 'deep purple', 'lavender'], hex: '#a21caf' },
  { name: 'Оранжевый', value: ['оранжевый', 'orange'], hex: '#fb923c' },
];

export default function CatalogFilters({ filters, onChange, hideBrandFilter, products }: CatalogFiltersProps) {
  // Для анимации раскрытия секций (пример: рейтинг, цена)
  const [openSections, setOpenSections] = useState<{[key: string]: boolean}>({
    price: true,
    rating: false,
    brand: false,
    color: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Определяем, какие цвета реально встречаются в товарах
  const availableColors = useMemo(() => {
    if (!products) return COLOR_PALETTE;
    // 1. Оставляем только реально встречающиеся цвета
    let filtered = COLOR_PALETTE.filter(colorObj =>
      products.some(p => {
        const fields = [p.name, p.description, p.sku].filter(Boolean).map((s: any) => s.toLowerCase());
        return colorObj.value.some(v => fields.some(field => field.includes(v)));
      })
    );
    // 2. Сортируем по длине названия
    filtered = filtered.sort((a, b) => a.name.length - b.name.length);
    // 3. Чередуем короткие и длинные для симметрии
    const result: typeof filtered = [];
    let left = 0, right = filtered.length - 1;
    while (left <= right) {
      if (left === right) {
        result.push(filtered[left]);
      } else {
        result.push(filtered[left]);
        result.push(filtered[right]);
      }
      left++;
      right--;
    }
    return result;
  }, [products]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="space-y-6 bg-white rounded-2xl shadow-lg p-6 border border-light-200"
    >
      {/* Поиск */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Поиск</label>
        <input
          type="text"
          placeholder="Поиск товаров..."
          value={filters.searchQuery || ''}
          onChange={e => onChange({ ...filters, searchQuery: e.target.value })}
          className="w-full border border-light-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 transition-all duration-200 focus:shadow-md"
        />
      </div>
      {/* Цена (collapsible) */}
      <div>
        <button type="button" onClick={() => toggleSection('price')} className="flex items-center justify-between w-full mb-1 group">
          <span className="block text-xs font-semibold text-gray-500">Цена, ₽</span>
          <motion.span animate={{ rotate: openSections.price ? 90 : 0 }} className="ml-2 text-primary-500 transition-transform">
            ▶
          </motion.span>
        </button>
        <AnimatePresence initial={false}>
          {openSections.price && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="flex gap-2 mt-2">
                <input
                  type="number"
                  placeholder="от"
                  value={filters.priceMin}
                  onChange={e => onChange({ ...filters, priceMin: e.target.value })}
                  className="w-1/2 border border-light-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 transition-all duration-200 focus:shadow-md"
                />
                <input
                  type="number"
                  placeholder="до"
                  value={filters.priceMax}
                  onChange={e => onChange({ ...filters, priceMax: e.target.value })}
                  className="w-1/2 border border-light-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 transition-all duration-200 focus:shadow-md"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* Цвет (collapsible) */}
      <div>
        <button type="button" onClick={() => toggleSection('color')} className="flex items-center justify-between w-full mb-1 group">
          <span className="block text-xs font-semibold text-gray-500">Цвет</span>
          <motion.span animate={{ rotate: openSections.color ? 90 : 0 }} className="ml-2 text-primary-500 transition-transform">
            ▶
          </motion.span>
        </button>
        <AnimatePresence initial={false}>
          {openSections.color && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-2 mt-2">
                {/* Вариант 'Все' */}
                <label key="all-colors" className="flex items-center gap-1 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="color-filter"
                    checked={!filters.colors || filters.colors.length === 0}
                    onChange={() => onChange({ ...filters, colors: [] })}
                    className="hidden"
                  />
                  <span className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center transition-all duration-200 shadow-sm bg-gradient-to-br from-gray-100 to-gray-300">
                    {/* Можно добавить иконку или оставить пустым */}
                  </span>
                  <span className="text-xs text-gray-600">Все</span>
                </label>
                {availableColors.map(color => {
                  // value — массив синонимов, для фильтрации и хранения используем первый элемент
                  const mainValue = color.value[0];
                  return (
                    <label key={mainValue} className="flex items-center gap-1 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="color-filter"
                        checked={Array.isArray(filters.colors) && filters.colors.length > 0 && filters.colors.some(c => color.value.includes(c))}
                        onChange={e => {
                          if (e.target.checked) {
                            onChange({ ...filters, colors: color.value });
                          }
                        }}
                        className="hidden"
                      />
                      <span
                        className={`w-6 h-6 rounded-full border ${color.border ? 'border-gray-300' : ''} flex items-center justify-center transition-all duration-200 shadow-sm`}
                        style={{ background: color.hex }}
                      >
                        {filters.colors.some(c => color.value.includes(c)) && (
                          <span className="w-3 h-3 bg-white rounded-full border border-primary-500"></span>
                        )}
                      </span>
                      <span className="text-xs text-gray-600">{color.name}</span>
                    </label>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* В наличии */}
      <motion.div whileHover={{ scale: 1.03 }} className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          id="inStock"
          checked={filters.inStock}
          onChange={e => onChange({ ...filters, inStock: e.target.checked })}
          className="accent-primary-600 w-4 h-4 rounded border-gray-300 transition-all duration-200 focus:ring-2 focus:ring-primary-500"
        />
        <label htmlFor="inStock" className="text-sm text-gray-700 cursor-pointer">Только в наличии</label>
      </motion.div>
      {/* Только со скидкой */}
      <motion.div whileHover={{ scale: 1.03 }} className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          id="onlyDiscount"
          checked={filters.onlyDiscount}
          onChange={e => onChange({ ...filters, onlyDiscount: e.target.checked })}
          className="accent-pink-500 w-4 h-4 rounded border-gray-300 transition-all duration-200 focus:ring-2 focus:ring-pink-500"
        />
        <label htmlFor="onlyDiscount" className="text-sm text-gray-700 cursor-pointer">Только со скидкой</label>
      </motion.div>
      {/* Бренд (collapsible) */}
      {!hideBrandFilter && (
        <div>
          <button type="button" onClick={() => toggleSection('brand')} className="flex items-center justify-between w-full mb-1 group">
            <span className="block text-xs font-semibold text-gray-500">Бренд</span>
            <motion.span animate={{ rotate: openSections.brand ? 90 : 0 }} className="ml-2 text-primary-500 transition-transform">
              ▶
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {openSections.brand && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <select
                  value={filters.brand}
                  onChange={e => onChange({ ...filters, brand: e.target.value })}
                  className="w-full border border-light-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 transition-all duration-200 focus:shadow-md mt-2"
                >
                  {BRANDS.map((brand) => (
                    <option key={brand} value={brand}>{brand ? brand : 'Любой'}</option>
                  ))}
                </select>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      {/* Рейтинг (collapsible) */}
      <div>
        <button type="button" onClick={() => toggleSection('rating')} className="flex items-center justify-between w-full mb-1 group">
          <span className="block text-xs font-semibold text-gray-500">Рейтинг</span>
          <motion.span animate={{ rotate: openSections.rating ? 90 : 0 }} className="ml-2 text-primary-500 transition-transform">
            ▶
          </motion.span>
        </button>
        <AnimatePresence initial={false}>
          {openSections.rating && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <select
                value={filters.rating}
                onChange={e => onChange({ ...filters, rating: e.target.value })}
                className="w-full border border-light-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 transition-all duration-200 focus:shadow-md mt-2"
              >
                {RATINGS.map((r) => (
                  <option key={r} value={r}>{r ? `от ${r}★` : 'Любой'}</option>
                ))}
              </select>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
} 