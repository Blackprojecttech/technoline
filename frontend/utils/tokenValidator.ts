export const validateAndCleanToken = async () => {
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    console.log('ℹ️ Токен отсутствует');
    return null;
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://technoline-api.loca.lt/api'}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      console.log('✅ Токен действителен');
      return token;
    } else if (response.status === 401) {
      console.log('🔐 Токен недействителен - очищаем localStorage');
      localStorage.removeItem('authToken');
      // Можно также очистить другие связанные данные
      return null;
    } else {
      console.log('⚠️ Ошибка проверки токена:', response.status);
      return token; // Возвращаем токен, возможно это временная ошибка сети
    }
  } catch (error) {
    console.error('❌ Ошибка сети при проверке токена:', error);
    return token; // Возвращаем токен, возможно это временная ошибка сети
  }
};

export const clearInvalidToken = () => {
  console.log('🧹 Очистка недействительного токена');
  localStorage.removeItem('authToken');
  // При необходимости можно добавить очистку других данных
  window.location.reload(); // Перезагружаем страницу для сброса состояния
}; 