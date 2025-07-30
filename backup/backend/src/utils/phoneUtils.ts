/**
 * Нормализует номер телефона, удаляя все нецифровые символы
 * @param phone Номер телефона в любом формате
 * @returns Нормализованный номер телефона, содержащий только цифры
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  // Удаляем все нецифровые символы
  const digits = phone.replace(/[^\d]/g, '');
  
  // Если номер начинается с 8, заменяем на 7
  if (digits.startsWith('8') && digits.length === 11) {
    return '7' + digits.slice(1);
  }
  
  return digits;
}

/**
 * Проверяет, является ли строка телефонным номером или его частью
 * @param str Строка для проверки
 * @returns true если строка похожа на телефонный номер или его часть
 */
export function isPhoneNumber(str: string): boolean {
  const normalized = normalizePhone(str);
  
  // Проверяем различные форматы:
  // - Полный номер (11 цифр, начинается с 7)
  // - Любая последовательность цифр длиной от 3 до 11
  return (
    /^7\d{10}$/.test(normalized) || // Полный номер
    (/^\d{3,11}$/.test(normalized)) // Часть номера
  );
}

/**
 * Создает регулярное выражение для поиска последовательности цифр с возможными разделителями
 * @param digits Строка цифр для поиска
 * @returns Регулярное выражение для поиска
 */
export function createDigitsSearchRegex(digits: string): RegExp {
  // Удаляем все нецифровые символы из входной строки
  const cleanDigits = digits.replace(/[^\d]/g, '');
  
  // Создаем паттерн, который ищет цифры с возможными разделителями между ними
  // Например, для "3332" создаст паттерн, который найдет "33-32", "33.32", "33 32" и т.д.
  const pattern = cleanDigits.split('').join('[^\\d]*');
  
  // Создаем регулярное выражение, которое:
  // 1. Может начинаться с любых символов (.*?)
  // 2. Содержит наши цифры с возможными разделителями между ними
  // 3. Может заканчиваться любыми символами (.*?)
  return new RegExp(`.*?${pattern}.*?`);
}

/**
 * Создает регулярное выражение для поиска номера телефона
 * @param phone Номер телефона для поиска
 * @returns Регулярное выражение для поиска
 */
export function createPhoneSearchRegex(phone: string): RegExp {
  return createDigitsSearchRegex(phone);
} 