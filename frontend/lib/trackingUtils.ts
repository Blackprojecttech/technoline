export function getStatusDescription(statusCode: string): string {
  const statusMap: { [key: string]: string } = {
    // CDEK API статусы
    'CREATED': 'Заказ создан',
    'ACCEPTED': 'Заказ принят',
    'RECEIVED_AT_SHIPMENT_WAREHOUSE': 'Принят на склад отправителя',
    'READY_FOR_SHIPMENT_IN_SENDER_CITY': 'Выдан на отправку в г. отправителе',
    'TAKEN_BY_TRANSPORTER_FROM_SENDER_CITY': 'Сдан перевозчику в г. отправителе',
    'SENT_TO_TRANSIT_CITY': 'Отправлен в г. транзит',
    'ACCEPTED_IN_TRANSIT_CITY': 'Встречен в г. транзите',
    'ACCEPTED_AT_TRANSIT_WAREHOUSE': 'Принят на склад транзита',
    'READY_FOR_SHIPMENT_IN_TRANSIT_CITY': 'Выдан на отправку в г. транзите',
    'TAKEN_BY_TRANSPORTER_FROM_TRANSIT_CITY': 'Сдан перевозчику в г. транзите',
    'DELIVERED': 'Заказ доставлен',
    'CANCELLED': 'Заказ отменен',
    'RETURNED': 'Заказ возвращен',
    'NOT_DELIVERED': 'Заказ не вручен',
    'IN_DELIVERY_POINT': 'Заказ в пункте выдачи',
    'ON_WAY_TO_RECIPIENT': 'Заказ в пути к получателю',
    'DELIVERED_TO_RECIPIENT': 'Заказ вручен получателю',
    'RETURNED_TO_DELIVERY_POINT': 'Заказ возвращен в пункт выдачи',
    'RETURNED_TO_SENDER': 'Заказ возвращен отправителю',
    'ON_WAY_TO_SENDER': 'Заказ в пути к отправителю',
    'DELIVERED_TO_SENDER': 'Заказ вручен отправителю',
    
    // Старые числовые коды (для совместимости)
    '1': 'Заказ создан',
    '2': 'Заказ принят',
    '3': 'Заказ в обработке',
    '4': 'Заказ передан в доставку',
    '5': 'Заказ в пути',
    '6': 'Заказ прибыл в пункт выдачи',
    '7': 'Заказ доставлен',
    '8': 'Заказ отменен',
    '9': 'Заказ возвращен',
    '10': 'Заказ вручен',
    '11': 'Заказ не вручен',
    '12': 'Заказ в пункте выдачи',
    '13': 'Заказ в пути к получателю',
    '14': 'Заказ вручен получателю',
    '15': 'Заказ возвращен в пункт выдачи',
    '16': 'Заказ возвращен отправителю',
    '17': 'Заказ в пути к отправителю',
    '18': 'Заказ вручен отправителю',
    '19': 'Заказ в пути к получателю',
    '20': 'Заказ в пути к отправителю'
  };

  return statusMap[statusCode] || statusCode;
}

export function getStatusColor(statusCode: string): string {
  const colorMap: { [key: string]: string } = {
    // CDEK API статусы
    'CREATED': 'blue',
    'ACCEPTED': 'blue',
    'RECEIVED_AT_SHIPMENT_WAREHOUSE': 'blue',
    'READY_FOR_SHIPMENT_IN_SENDER_CITY': 'orange',
    'TAKEN_BY_TRANSPORTER_FROM_SENDER_CITY': 'purple',
    'SENT_TO_TRANSIT_CITY': 'cyan',
    'ACCEPTED_IN_TRANSIT_CITY': 'blue',
    'ACCEPTED_AT_TRANSIT_WAREHOUSE': 'blue',
    'READY_FOR_SHIPMENT_IN_TRANSIT_CITY': 'orange',
    'TAKEN_BY_TRANSPORTER_FROM_TRANSIT_CITY': 'purple',
    'DELIVERED': 'green',
    'CANCELLED': 'red',
    'RETURNED': 'red',
    'NOT_DELIVERED': 'red',
    'IN_DELIVERY_POINT': 'green',
    'ON_WAY_TO_RECIPIENT': 'cyan',
    'DELIVERED_TO_RECIPIENT': 'green',
    'RETURNED_TO_DELIVERY_POINT': 'orange',
    'RETURNED_TO_SENDER': 'red',
    'ON_WAY_TO_SENDER': 'purple',
    'DELIVERED_TO_SENDER': 'green',
    
    // Старые числовые коды (для совместимости)
    '1': 'blue',
    '2': 'blue',
    '3': 'orange',
    '4': 'purple',
    '5': 'cyan',
    '6': 'green',
    '7': 'green',
    '8': 'red',
    '9': 'red',
    '10': 'green',
    '11': 'red',
    '12': 'green',
    '13': 'cyan',
    '14': 'green',
    '15': 'orange',
    '16': 'red',
    '17': 'purple',
    '18': 'green',
    '19': 'cyan',
    '20': 'purple'
  };

  return colorMap[statusCode] || 'default';
} 