# Методы работы с заказами (API СДЭК)

## Авторизация
- POST /v2/oauth/token — получение токена (OAuth 2.0)

## Локации
- GET /v2/location/suggest/cities — подсказки по городам
- GET /v2/location/regions — регионы
- GET /v2/location/postalcodes — индексы
- GET /v2/location/cities — города

## Офисы
- GET /v2/deliverypoints — список офисов (ПВЗ, постаматы)

## Калькулятор
- POST /v2/calculator/tarifflist — расчет по доступным тарифам
- POST /v2/calculator/tariff — расчет по коду тарифа
- GET /v2/calculator/alltariffs — список тарифов

## Заказы
- GET /v2/orders — информация по номеру/имени заказа
- POST /v2/orders — регистрация заказа
- PATCH /v2/orders — изменение заказа
- GET /v2/orders/{uuid} — информация по заказу
- DELETE /v2/orders/{uuid} — удаление заказа

## Международные ограничения
(см. документацию СДЭК) 