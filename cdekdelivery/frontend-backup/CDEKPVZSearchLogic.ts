import { PVZ, PVZSearchParams, PVZSearchResult } from './CDEKPVZTypes';

// Радиусы поиска (метры)
const SEARCH_RADII = [5000, 10000, 20000, 30000, 40000, 50000, 60000, 70000, 80000, 90000, 100000];

/**
 * Основная функция поиска ПВЗ СДЭК по адресу и координатам
 * @param pvzList - исходный массив ПВЗ (например, с бэкенда)
 * @param baseLat - широта точки поиска
 * @param baseLng - долгота точки поиска
 * @returns PVZSearchResult с найденными ПВЗ, радиусом и ошибкой
 */
export function searchCdekPVZByRadius(pvzList: PVZ[], baseLat: number, baseLng: number): PVZSearchResult {
  let foundPVZ: PVZ[] = [];
  let usedRadius: number | null = null;
  for (const r of SEARCH_RADII) {
    foundPVZ = pvzList.filter(pvz => typeof pvz._distance === 'number' && pvz._distance <= r);
    if (foundPVZ.length > 0) {
      usedRadius = r;
      break;
    }
  }
  return {
    pvzList: foundPVZ,
    usedRadius: usedRadius || SEARCH_RADII[SEARCH_RADII.length - 1],
    error: foundPVZ.length === 0 ? `Пункты выдачи не найдены в радиусе ${SEARCH_RADII[SEARCH_RADII.length - 1]/1000} км.` : undefined,
  };
}

// Пример функции для вычисления расстояния между точками (Haversine)
export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Радиус Земли в км
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// TODO: добавить функции для получения координат, работы с DaData, кэширования, если нужно 