import React from 'react';

interface Order {
  _id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  deliveryMethod?: any;
  paymentMethod?: string;
  callRequest?: boolean;
  callStatus?: 'requested' | 'completed' | 'not_completed';
  deliveryDate?: string;
  cdekDeliveryDate?: string;
  items?: {
    productId: {
      _id: string;
      name: string;
      mainImage: string;
    };
  }[];
}

interface OrderHistoryProps {
  filteredOrders: Order[];
  isLoading: boolean;
  orderFilter: string;
  setOrderFilter: React.Dispatch<React.SetStateAction<'all' | 'in_transit' | 'completed'>>;
  getDeliveryMethodDisplayName: (method: any) => string;
  getPaymentMethodDisplayName: (code: string) => string;
  getDeliveryDateTime: (order: Order) => string;
  formatCurrency: (amount: number) => string;
  handleCallRequest: () => void;
  isCallRequestLoading: boolean;
  showDeliveryAddress: (order: Order) => void;
  OrderStatus: React.ComponentType<any>;
  Link: React.ComponentType<any>;
  orderCounts: { all: number; in_transit: number; completed: number };
}

export default function OrderHistory({
  filteredOrders,
  isLoading,
  orderFilter,
  setOrderFilter,
  getDeliveryMethodDisplayName,
  getPaymentMethodDisplayName,
  getDeliveryDateTime,
  formatCurrency,
  handleCallRequest,
  isCallRequestLoading,
  showDeliveryAddress,
  OrderStatus,
  Link,
  orderCounts
}: OrderHistoryProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">История заказов</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setOrderFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${orderFilter === 'all' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Все ({orderCounts.all})
          </button>
          <button
            onClick={() => setOrderFilter('in_transit')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${orderFilter === 'in_transit' ? 'bg-orange-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            В пути ({orderCounts.in_transit})
          </button>
          <button
            onClick={() => setOrderFilter('completed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${orderFilter === 'completed' ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Завершенные ({orderCounts.completed})
          </button>
        </div>
      </div>
      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Загрузка заказов</h3>
          <p className="text-gray-600">Получаем информацию о ваших покупках...</p>
        </div>
      ) : filteredOrders && filteredOrders.length > 0 ? (
        <div className="space-y-4">
          {filteredOrders.map((order, index) => (
            <div key={order._id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Миниатюры товаров заказа */}
                  <div className="flex items-center -space-x-2">
                    {order.items && order.items.slice(0, 4).map((item, idx) => {
                      let imgSrcProfile = '/placeholder-product.jpg';
                      let nameProfile = '';
                      if (item.productId && item.productId.mainImage) {
                        imgSrcProfile = item.productId.mainImage;
                        nameProfile = item.productId.name || '';
                      }
                      return item.productId ? (
                        <img
                          key={String(item.productId._id) + String(idx)}
                          src={imgSrcProfile}
                          alt={nameProfile}
                          title={nameProfile}
                          className="w-9 h-9 rounded-full border-2 border-white shadow object-cover bg-gray-100"
                          style={{ zIndex: 10 - idx }}
                        />
                      ) : null;
                    })}
                    {order.items && order.items.length > 4 && (
                      <div
                        className="w-9 h-9 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 shadow"
                        style={{ zIndex: 5 }}
                        title={`+${order.items.length - 4} товаров`}
                      >
                        +{order.items.length - 4}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-lg">Заказ #{order.orderNumber}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      {/* Calendar icon */}
                      <p className="text-sm text-gray-600">{new Date(order.createdAt).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    {order?.deliveryMethod && (
                      <div className="flex items-center space-x-2 mt-2">
                        {/* Truck icon */}
                        <p className="text-sm text-gray-600">{getDeliveryMethodDisplayName(order?.deliveryMethod)}</p>
                      </div>
                    )}
                    {order?.paymentMethod && (
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-sm text-gray-500">Способ оплаты:</span>
                        <span className="text-sm text-gray-900 font-medium">{getPaymentMethodDisplayName(order?.paymentMethod)}</span>
                      </div>
                    )}
                    {getDeliveryDateTime(order) && (
                      <div className="flex items-center space-x-2 mt-1">
                        {/* Calendar icon */}
                        <p className="text-sm text-gray-600">{getDeliveryDateTime(order)}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 text-xl">{formatCurrency(order.total)}</p>
                  <OrderStatus status={order.status} size="sm" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <Link href={`/orders/${order._id}`} className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl text-sm">
                    {/* Eye icon */}
                    <span>Перейти в заказ</span>
                  </Link>
                  {order?.deliveryMethod && (
                    <button
                      onClick={() => showDeliveryAddress(order)}
                      className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl text-sm"
                    >
                      {/* MapPin icon */}
                      <span>{'Адрес доставки'}</span>
                    </button>
                  )}
                </div>
                {(!order.callRequest || (order.callStatus === 'completed' || order.callStatus === 'not_completed')) && (
                  <button
                    onClick={handleCallRequest}
                    disabled={isCallRequestLoading}
                    className="w-full inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {/* Phone icon */}
                    <span>Позвоните мне</span>
                  </button>
                )}
                {order.callRequest && (
                  <div className={`w-full inline-flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium ${order.callStatus === 'completed' ? 'bg-green-100 text-green-700' : order.callStatus === 'not_completed' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                    {/* Phone icon */}
                    <span>
                      {order.callStatus === 'completed' ? 'Звонок выполнен' : order.callStatus === 'not_completed' ? 'Звонок не выполнен' : 'Запрошен звонок'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>У вас пока нет заказов</p>
        </div>
      )}
    </div>
  );
} 