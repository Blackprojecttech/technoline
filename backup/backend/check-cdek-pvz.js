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

async function checkCdekPvz() {
  try {
    console.log('🔍 Проверяем ПВЗ в CDEK API...');
    
    const token = await getCdekToken();
    if (!token) {
      console.error('❌ Не удалось получить токен');
      return;
    }
    
    console.log('✅ Токен получен');
    
    // Тест 1: Проверяем ПВЗ в Санкт-Петербурге
    console.log('\n📋 Тест 1: ПВЗ в Санкт-Петербурге');
    
    const spbResponse = await fetch('https://api.cdek.ru/v2/location/cities?city=Санкт-Петербург', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (spbResponse.ok) {
      const spbCities = await spbResponse.json();
      console.log('🏙️ Города СПб:', spbCities);
      
      if (spbCities.length > 0) {
        const spbCityCode = spbCities[0].code;
        console.log('🏙️ Код города СПб:', spbCityCode);
        
        const spbPvzResponse = await fetch(`https://api.cdek.ru/v2/deliverypoints?city_code=${spbCityCode}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (spbPvzResponse.ok) {
          const spbPvzList = await spbPvzResponse.json();
          console.log('🏪 ПВЗ в СПб:', spbPvzList.length);
          
          // Ищем ПВЗ в Стрельне
          const strelnaPvz = spbPvzList.filter(pvz => 
            pvz.address?.toLowerCase().includes('стрельна') ||
            pvz.address?.toLowerCase().includes('львовская')
          );
          
          console.log('📍 ПВЗ в Стрельне:', strelnaPvz.length);
          strelnaPvz.forEach(pvz => {
            console.log(`  - ${pvz.name} (${pvz.code}): ${pvz.address}`);
          });
        }
      }
    }
    
    // Тест 2: Проверяем ПВЗ в Архангельске
    console.log('\n📋 Тест 2: ПВЗ в Архангельске');
    
    const arkhResponse = await fetch('https://api.cdek.ru/v2/location/cities?city=Архангельск', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (arkhResponse.ok) {
      const arkhCities = await arkhResponse.json();
      console.log('🏙️ Города Архангельск:', arkhCities);
      
      if (arkhCities.length > 0) {
        const arkhCityCode = arkhCities[0].code;
        console.log('🏙️ Код города Архангельск:', arkhCityCode);
        
        const arkhPvzResponse = await fetch(`https://api.cdek.ru/v2/deliverypoints?city_code=${arkhCityCode}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (arkhPvzResponse.ok) {
          const arkhPvzList = await arkhPvzResponse.json();
          console.log('🏪 ПВЗ в Архангельске:', arkhPvzList.length);
          
          // Ищем ПВЗ на ул. Терехина
          const terekhinaPvz = arkhPvzList.filter(pvz => 
            pvz.address?.toLowerCase().includes('терехина')
          );
          
          console.log('📍 ПВЗ на ул. Терехина:', terekhinaPvz.length);
          terekhinaPvz.forEach(pvz => {
            console.log(`  - ${pvz.name} (${pvz.code}): ${pvz.address}`);
          });
        }
      }
    }
    
    console.log('\n🎯 Выводы:');
    console.log('  - Если ПВЗ не найдены, значит адреса в заказах не совпадают с адресами в CDEK');
    console.log('  - Нужно использовать точные адреса ПВЗ из CDEK API');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
}

checkCdekPvz(); 