import React, { createContext, useContext, useState } from 'react';
import { PVZ, SelectedPVZ, PVZError, PVZRadius } from './CDEKPVZTypes';

interface CDEKPVZContextProps {
  pvzList: PVZ[];
  setPvzList: (list: PVZ[]) => void;
  selectedPVZ: SelectedPVZ;
  setSelectedPVZ: (pvz: SelectedPVZ) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
  error: PVZError;
  setError: (e: PVZError) => void;
  usedRadius: PVZRadius | null;
  setUsedRadius: (r: PVZRadius | null) => void;
}

const CDEKPVZContext = createContext<CDEKPVZContextProps | undefined>(undefined);

export const CDEKPVZProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [pvzList, setPvzList] = useState<PVZ[]>([]);
  const [selectedPVZ, setSelectedPVZ] = useState<SelectedPVZ>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PVZError>(null);
  const [usedRadius, setUsedRadius] = useState<PVZRadius | null>(null);

  return (
    <CDEKPVZContext.Provider value={{ pvzList, setPvzList, selectedPVZ, setSelectedPVZ, loading, setLoading, error, setError, usedRadius, setUsedRadius }}>
      {children}
    </CDEKPVZContext.Provider>
  );
};

export function useCDEKPVZ() {
  const ctx = useContext(CDEKPVZContext);
  if (!ctx) throw new Error('useCDEKPVZ must be used within CDEKPVZProvider');
  return ctx;
} 