import React from 'react';

interface Address {
  id: string;
  name: string;
  address: string;
  isDefault: boolean;
  createdAt: string;
}

interface AddressListProps {
  addresses: Address[];
  openAddAddressModal: () => void;
  openEditAddressModal: (address: Address) => void;
  deleteAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
}

export default function AddressList({ addresses, openAddAddressModal, openEditAddressModal, deleteAddress, setDefaultAddress }: AddressListProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* MapPin icon */}
          <span className="text-gray-700 font-medium">Адреса доставки</span>
        </div>
        <button
          onClick={openAddAddressModal}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Добавить
        </button>
      </div>
      {addresses.length > 0 ? (
        <div className="space-y-2">
          {addresses.map((address) => (
            <div key={address.id} className={`flex items-start justify-between p-4 bg-white rounded-xl border ${address.isDefault ? 'border-green-400 shadow-green-100 shadow' : 'border-gray-200'} shadow-sm transition-all`}>
              <div className="flex items-start gap-3 flex-1">
                <div className={`p-2 rounded-full ${address.isDefault ? 'bg-green-100' : 'bg-blue-100'}`}>{/* MapPin icon */}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 truncate">{address.name}</span>
                    {address.isDefault && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                        {/* CheckCircle icon */} По умолчанию
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 break-words mb-2 pl-0.5">{address.address}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 items-end ml-4">
                {!address.isDefault && (
                  <button
                    onClick={() => setDefaultAddress(address.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors font-medium"
                  >
                    {/* CheckCircle icon */} По умолчанию
                  </button>
                )}
                <button
                  onClick={() => openEditAddressModal(address)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                >
                  {/* Edit icon */} Изменить
                </button>
                <button
                  onClick={() => deleteAddress(address.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors font-medium"
                >
                  {/* X icon */} Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500">
          <p>Адреса доставки не добавлены</p>
          <p className="text-sm">Добавьте адрес для быстрого оформления заказов</p>
        </div>
      )}
    </div>
  );
} 