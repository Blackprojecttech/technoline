# Печатные формы, чеки, наложенные платежи, паспортные данные (API СДЭК)

## Печатные формы
- POST /v2/print/orders — формирование квитанции
- GET /v2/print/orders/{uuid} — получение ссылки на квитанцию
- GET /v2/print/orders/{uuid}.pdf — скачивание квитанции
- POST /v2/print/barcodes — формирование ШК места
- GET /v2/print/barcodes/{uuid} — получение ссылки на ШК
- GET /v2/print/barcodes/{uuid}.pdf — скачивание ШК

## Наложенные платежи
- GET /v2/registries — реестры НП
- GET /v2/payment — информация о переводе НП

## Паспортные данные
- GET /v2/passport — информация о паспортах по заказу

## Чеки
- GET /v2/check — информация о чеках по заказу/дню 