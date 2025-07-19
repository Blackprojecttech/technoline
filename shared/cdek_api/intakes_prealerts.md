# Заявки, преалерты, договоренности (API СДЭК)

## Заявки на курьера
- POST /v2/intakes — регистрация заявки
- POST /v2/intakes/availableDays — доступные даты
- PATCH /v2/intakes — изменение статуса
- GET /v2/intakes/{uuid} — информация по заявке
- DELETE /v2/intakes/{uuid} — удаление заявки
- GET /v2/orders/{orderUuid}/intakes — все заявки по заказу

## Преалерты
- POST /v2/prealert — регистрация преалерта
- GET /v2/prealert/{uuid} — информация о преалерте

## Договоренности о доставке
- GET /v2/delivery/intervals — интервалы по заказу
- POST /v2/delivery — регистрация договоренности
- GET /v2/delivery/{uuid} — информация о договоренности
- POST /v2/delivery/estimatedIntervals — интервалы до создания заказа

## Отказ и возврат
- POST /v2/orders/{uuid}/refusal — регистрация отказа
- POST /v2/orders/{uuid}/clientReturn — клиентский возврат

(Примеры запросов/ответов и структуры — см. исходные данные) 