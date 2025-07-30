import { useEffect, useState } from 'react';

export function useProfileAutofill(user: any, isAuthenticated: any, setFormData: any) {
  const [wasAddressAutofilled, setWasAddressAutofilled] = useState(false);

  useEffect(() => {
    if (!user || !isAuthenticated || wasAddressAutofilled) return;
    setFormData((prev: any) => ({
      ...prev,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || '',
      address: user.addresses && user.addresses[0] ? user.addresses[0].address : prev.address,
      city: user.addresses && user.addresses[0] ? user.addresses[0].city : prev.city,
      state: user.addresses && user.addresses[0] ? user.addresses[0].state : prev.state,
      zipCode: user.addresses && user.addresses[0] ? user.addresses[0].zipCode : prev.zipCode,
      country: user.addresses && user.addresses[0] ? user.addresses[0].country : prev.country,
    }));
    setWasAddressAutofilled(true);
  }, [user, isAuthenticated, wasAddressAutofilled, setFormData]);

  return {
    wasAddressAutofilled,
    setWasAddressAutofilled,
  };
} 