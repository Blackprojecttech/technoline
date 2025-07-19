'use client';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Truck, MapPin, Clock, Info, ArrowRight, Circle } from 'lucide-react';
import { useState } from 'react';

interface DeliveryMethod {
  name: string;
  zonePrices?: Record<string, number>;
}
interface DeliveryInfo {
  deliveryMethods: DeliveryMethod[];
  zone: string | null;
  zoneKey: string | null;
}

export default function DeliveryPage() {
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCalculate = async () => {
    setError('');
    setDeliveryInfo(null);
    setLoading(true);
    try {
      const resp = await fetch('http://localhost:5002/api/delivery/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, lat, lng })
      });
      const data = await resp.json();
      setLoading(false);
      if (!resp.ok) {
        setError(data.message || 'Ошибка при расчёте доставки');
        return;
      }
      setDeliveryInfo(data);
      // Логирование для отладки:
      console.log('Ответ сервера:', data);
      if (data.deliveryMethods && data.zoneKey) {
        data.deliveryMethods.forEach((method: any) => {
          if (method.zonePrices) {
            const price = method.zonePrices[data.zoneKey];
            console.log('zoneKey:', data.zoneKey, 'zonePrices:', method.zonePrices, 'Найденная цена:', price);
          }
        });
      }
    } catch (e: any) {
      setLoading(false);
      setError('Ошибка при расчёте доставки');
      console.error(e);
    }
  };

  let price = null;
  let methodName = '';
  if (deliveryInfo && deliveryInfo.deliveryMethods && deliveryInfo.zoneKey) {
    const method = deliveryInfo.deliveryMethods.find((m: DeliveryMethod) => m.zonePrices && deliveryInfo.zoneKey && m.zonePrices[deliveryInfo.zoneKey] !== undefined);
    if (method && deliveryInfo.zoneKey) {
      price = method.zonePrices![deliveryInfo.zoneKey];
      methodName = method.name;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-light-50 to-accent-50">
      <Header />
      <main className="pt-32 pb-16">
        <div className="container mx-auto px-4 py-8 animate-fade-in max-w-xl">
          <h1 className="text-4xl font-bold mb-8 text-secondary-800">Расчёт стоимости доставки</h1>

          <div className="bg-white rounded-2xl shadow-lg p-8 border border-light-200 mb-8">
            <div className="mb-4">
              <label className="block mb-2 font-semibold text-secondary-800">Адрес доставки</label>
              <input
                className="w-full px-4 py-2 border rounded-lg mb-2"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Введите адрес (например, г Москва, г Троицк, ул Юбилейная)"
              />
              <div className="flex gap-2">
                <input
                  className="w-1/2 px-4 py-2 border rounded-lg"
                  value={lat}
                  onChange={e => setLat(e.target.value)}
                  placeholder="Широта (lat)"
                />
                <input
                  className="w-1/2 px-4 py-2 border rounded-lg"
                  value={lng}
                  onChange={e => setLng(e.target.value)}
                  placeholder="Долгота (lng)"
                />
              </div>
            </div>
            <button
              className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg hover:bg-primary-700 transition-colors duration-200 font-semibold"
              onClick={handleCalculate}
              disabled={loading}
            >
              {loading ? 'Рассчитываем...' : 'Рассчитать доставку'}
            </button>
            {error && <div className="text-red-600 mt-4">{error}</div>}
            {deliveryInfo && (
              <div className="mt-6">
                {price !== null ? (
                  <div className="text-xl font-bold text-primary-700">Стоимость доставки ({methodName}): <span className="text-2xl">{price} ₽</span></div>
                ) : (
                  <div className="text-lg text-secondary-700 flex items-center gap-2">Узнать цену <Info size={20} /></div>
                )}
                {deliveryInfo.zoneKey && (
                  <div className="text-sm text-gray-500 mt-2">zoneKey: <b>{deliveryInfo.zoneKey}</b></div>
                )}
                <div style={{ marginTop: 24 }}>
                  <h3>Результат:</h3>
                  <div>zoneKey: <b>{deliveryInfo.zoneKey ?? 'нет'}</b></div>
                  <div>zone: <b>{deliveryInfo.zone ?? 'нет'}</b></div>
                  <div>
                    <b>Доступные способы доставки:</b>
                    <ul>
                      {deliveryInfo.deliveryMethods.map((method: any, idx: number) => {
                        let price = null;
                        let debugMsg = '';
                        let zoneKeys = method.zonePrices ? Object.keys(method.zonePrices) : [];
                        if (deliveryInfo.zoneKey && method.zonePrices) {
                          price = method.zonePrices[deliveryInfo.zoneKey];
                          if (price === undefined) {
                            debugMsg = `Ключ "${deliveryInfo.zoneKey}" не найден в zonePrices: [${zoneKeys.join(', ')}]`;
                          } else {
                            debugMsg = `Цена найдена: ${price} ₽`;
                          }
                        } else if (!method.zonePrices) {
                          debugMsg = 'У этого способа доставки нет zonePrices';
                        } else if (!deliveryInfo.zoneKey) {
                          debugMsg = 'zoneKey не определён';
                        }
                        return (
                          <li key={idx} style={{ marginBottom: 12 }}>
                            <div><b>{method.name}</b></div>
                            <div>zonePrices: {method.zonePrices ? JSON.stringify(method.zonePrices) : 'нет'}</div>
                            <div style={{ color: price === undefined ? 'red' : 'green' }}>{debugMsg}</div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
      <style jsx global>{`
        .animate-fade-in {
          animation: fadeIn 0.7s cubic-bezier(0.4,0,0.2,1);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
} 