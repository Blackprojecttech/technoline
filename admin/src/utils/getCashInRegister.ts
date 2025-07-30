// Простая функция для получения суммы наличных в кассе со страницы "Расчеты"
export const getCashInRegisterAmount = (): number => {
  // Берем готовую сумму, рассчитанную на странице "Расчеты"
  return (window as any).cashInRegisterAmount || 0;
}; 