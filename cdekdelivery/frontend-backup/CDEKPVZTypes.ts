// Типы для логики поиска и выбора ПВЗ СДЭК

export interface PVZ {
  code: string;
  name: string;
  address: string;
  address_full?: string;
  work_time?: string;
  note?: string;
  phone?: string;
  _distance?: number;
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
    address_full?: string;
    city?: string;
    region?: string;
    postal_code?: string;
  };
  [key: string]: any;
}

export interface PVZSearchParams {
  address: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  lat?: number;
  lng?: number;
}

export interface PVZSearchResult {
  pvzList: PVZ[];
  usedRadius: number;
  error?: string;
}

export type PVZRadius = number;
export type PVZError = string | null;
export type SelectedPVZ = PVZ | null;

export interface AddressData {
  address: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  lat?: number;
  lng?: number;
} 