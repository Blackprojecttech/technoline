import React from 'react';
import { PVZ, SelectedPVZ, PVZError, PVZRadius } from './CDEKPVZTypes';

interface CDEKPVZSelectorProps {
  pvzList: PVZ[];
  selectedPVZ: SelectedPVZ;
  onSelect: (pvz: PVZ) => void;
  loading: boolean;
  error: PVZError;
  usedRadius: PVZRadius | null;
}

export const CDEKPVZSelector: React.FC<CDEKPVZSelectorProps> = ({
  pvzList,
  selectedPVZ,
  onSelect,
  loading,
  error,
  usedRadius,
}) => {
  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold mb-2">Выберите пункт выдачи СДЭК</h3>
      {loading && (
        <div className="flex items-center space-x-2 animate-pulse">
          <div className="w-6 h-6 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Идёт поиск пунктов выдачи...</span>
        </div>
      )}
      {error && (
        <div className="text-red-500 mt-2">{error}</div>
      )}
      {!loading && !error && pvzList.length > 0 && (
        <ul className="space-y-2 mt-2">
          {pvzList.map((pvz) => (
            <li
              key={pvz.code}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedPVZ?.code === pvz.code ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}
              onClick={() => onSelect(pvz)}
            >
              <div className="font-semibold">{pvz.name}</div>
              <div className="text-sm text-gray-600">{pvz.address_full || pvz.address}</div>
              <div className="text-xs text-gray-400 mt-1">{pvz.work_time}</div>
              {pvz.note && <div className="text-xs text-gray-500 mt-1">{pvz.note}</div>}
              <div className="text-xs mt-1">{pvz._distance ? `${(pvz._distance * 1000).toFixed(0)} метров` : ''}</div>
            </li>
          ))}
        </ul>
      )}
      {selectedPVZ && (
        <div className="mt-4 p-3 rounded border border-blue-400 bg-blue-50">
          <div className="font-semibold">Выбран ПВЗ: {selectedPVZ.name}</div>
          <div className="text-sm text-gray-600">{selectedPVZ.address_full || selectedPVZ.address}</div>
        </div>
      )}
      {pvzList.length > 0 && usedRadius && (
        <div className="mb-2 text-sm text-gray-500">Показаны пункты выдачи в радиусе {usedRadius ? `${(usedRadius/1000).toFixed(0)} км` : ''}</div>
      )}
    </div>
  );
}; 