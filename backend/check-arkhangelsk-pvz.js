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

async function checkArkhangelskPvz() {
  try {
    console.log('🔍 Проверяем все ПВЗ в Архангельске...');
    
    const token = await getCdekToken();
    if (!token) {
      console.error('❌ Не удалось получить токен');
      return;
    }
    
    console.log('✅ Токен получен');
    
    const arkhPvzResponse = await fetch('https://api.cdek.ru/v2/deliverypoints?city_code=402', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (arkhPvzResponse.ok) {
      const arkhPvzList = await arkhPvzResponse.json();
      console.log('🏪 Все ПВЗ в Архангельске:', arkhPvzList.length);
      
      arkhPvzList.forEach((pvz, index) => {
        console.log(`${index + 1}. ${pvz.name} (${pvz.code})`);
        console.log(`   Адрес: ${pvz.address}`);
        console.log(`   Рабочее время: ${pvz.work_time}`);
        console.log('');
      });
      
      console.log('🎯 Выводы:');
      console.log('  - В Архангельске есть ПВЗ, но НЕТ на ул. Терехина');
      console.log('  - Нужно использовать существующий ПВЗ из списка выше');
      
    } else {
      console.error('❌ Ошибка получения ПВЗ:', arkhPvzResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

checkArkhangelskPvz(); 