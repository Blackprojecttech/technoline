export async function getCdekExpectedDeliveryDate(pvzData: any): Promise<string | null> {
  try {
    const region = pvzData.region || pvzData.location?.region;
    const city = pvzData.city || pvzData.location?.city;
    const city_code = pvzData.city_code || pvzData.location?.city_code;
    const fias_guid = pvzData.fias_guid || pvzData.location?.fias_guid;
    const address = pvzData.address_full || pvzData.address || pvzData.location?.address;
    if (!region || !city || !city_code) return null;
    const params = new URLSearchParams();
    params.append('region', region);
    params.append('city', city);
    params.append('city_code', String(city_code));
    if (fias_guid) params.append('fias_guid', fias_guid);
    params.append('address', address);
    params.append('from_address', 'Москва, Митино, ул. Митинская, д. 1');
    params.append('from_city_code', '44');
    params.append('from_fias_guid', 'c2deb16a-0330-4f05-821f-1d09c93331e6');
    params.append('from_postal_code', '125222');
    params.append('tariff_code', '136');
    const res = await fetch(`/api/cdek/delivery-dates?${params.toString()}`);
    const data = await res.json();
    if (data && data.periods && data.periods.length > 0 && data.periods[0].period_min) {
      const days = Number(data.periods[0].period_min) + 2;
      const today = new Date();
      today.setDate(today.getDate() + days);
      return today.toISOString().split('T')[0];
    } else if (data && data.dates && data.dates.length > 0) {
      return data.dates[0];
    } else {
      return null;
    }
  } catch (e) {
    return null;
  }
} 