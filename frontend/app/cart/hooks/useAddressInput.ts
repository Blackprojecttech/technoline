import { useState } from 'react';
import { getDeliveryZoneByAddress } from '../../../utils/addressValidation';

export function useAddressInput(formData: any, setFormData: any, fetchAddressSuggestions: any) {
  const [addressZone, setAddressZone] = useState<'mkad' | 'ckad' | 'region' | 'unknown' | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleAddressInput = async (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setFormData((prev: any) => ({ ...prev, address: value }));
    if (value.length === 0) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      setAddressZone(null);
      return;
    }
    if (value.length >= 3) {
      const suggestions = await fetchAddressSuggestions(value);
      setAddressSuggestions(suggestions || []);
      setShowSuggestions(true);
    } else {
      setAddressSuggestions([]);
      setShowSuggestions(false);
    }
    if (value.length > 5) {
      const zone = await getDeliveryZoneByAddress(value);
      setAddressZone(zone);
    } else {
      setAddressZone(null);
    }
  };

  const handleSuggestionClick = (suggestion: any) => {
    setFormData((prev: any) => ({
      ...prev,
      address: suggestion.value || '',
      city: suggestion.data?.city || '',
      state: suggestion.data?.region_with_type || '',
      zipCode: suggestion.data?.postal_code || '',
      country: suggestion.data?.country || 'Россия',
      lat: suggestion.data?.geo_lat ? parseFloat(suggestion.data.geo_lat) : null,
      lng: suggestion.data?.geo_lon ? parseFloat(suggestion.data.geo_lon) : null,
    }));
    setShowSuggestions(false);
  };

  return {
    addressZone,
    addressSuggestions,
    showSuggestions,
    handleAddressInput,
    handleSuggestionClick,
    setShowSuggestions,
  };
} 