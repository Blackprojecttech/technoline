const fetch = require('node-fetch');
require('dotenv').config();

async function getCdekToken() {
  try {
    const response = await fetch('https://api.cdek.ru/v2/oauth/token?parameters', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.CDEK_CLIENT_ID || 'EMscd6r9JnFiQ3bLoyjJY6eM78JrJceI',
        client_secret: process.env.CDEK_CLIENT_SECRET || 'PjLZPKBgI86kgKNzZI0'
      })
    });

    if (!response.ok) {
      throw new Error(`Ошибка получения токена: ${response.status}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('❌ Ошибка получения токена:', error);
    return null;
  }
}

async function debugCdekSearch() {
  try {
    console.log('🔍 Детальная отладка поиска ПВЗ в CDEK API...');
    
    const token = await getCdekToken();
    if (!token) {
      console.error('❌ Не удалось получить токен');
      return;
    }
    
    console.log('✅ Токен получен');
    
    // Тестовый адрес из заказа
    const testAddress = '163020, Россия, Архангельская область, Архангельск, ул. Терехина, 5';
    console.log('\n📋 Тестовый адрес:', testAddress);
    
    // 1. Ищем город Архангельск
    console.log('\n🏙️ Шаг 1: Ищем город Архангельск');
    const cityResponse = await fetch('https://api.cdek.ru/v2/location/cities?city=Архангельск', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (cityResponse.ok) {
      const cities = await cityResponse.json();
      console.log('🏙️ Найденные города:', cities.length);
      cities.forEach((city, index) => {
        console.log(`  ${index + 1}. ${city.city} (код: ${city.code})`);
      });
      
      if (cities.length > 0) {
        const cityCode = cities[0].code;
        console.log('🏙️ Используем код города:', cityCode);
        
        // 2. Получаем все ПВЗ в Архангельске
        console.log('\n🏪 Шаг 2: Получаем все ПВЗ в Архангельске');
        const pvzResponse = await fetch(`https://api.cdek.ru/v2/deliverypoints?city_code=${cityCode}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (pvzResponse.ok) {
          const pvzList = await pvzResponse.json();
          console.log('🏪 Всего ПВЗ в Архангельске:', pvzList.length);
          
          // 3. Ищем ПВЗ с улицей Терехина
          console.log('\n📍 Шаг 3: Ищем ПВЗ с улицей Терехина');
          const terekhinaPvz = pvzList.filter(pvz => 
            pvz.name?.toLowerCase().includes('терехина') ||
            pvz.address?.toLowerCase().includes('терехина')
          );
          
          console.log('📍 ПВЗ с улицей Терехина:', terekhinaPvz.length);
          terekhinaPvz.forEach((pvz, index) => {
            console.log(`  ${index + 1}. ${pvz.name} (${pvz.code})`);
            console.log(`     Адрес: ${pvz.address}`);
            console.log(`     Рабочее время: ${pvz.work_time}`);
            console.log('');
          });
          
          // 4. Показываем все ПВЗ для сравнения
          console.log('\n📋 Шаг 4: Все ПВЗ в Архангельске для сравнения');
          pvzList.forEach((pvz, index) => {
            console.log(`${index + 1}. ${pvz.name} (${pvz.code})`);
            console.log(`   Адрес: ${pvz.address}`);
            console.log(`   Рабочее время: ${pvz.work_time}`);
            console.log('');
          });
          
        } else {
          console.error('❌ Ошибка получения ПВЗ:', pvzResponse.status);
        }
      }
    } else {
      console.error('❌ Ошибка поиска города:', cityResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

debugCdekSearch(); 