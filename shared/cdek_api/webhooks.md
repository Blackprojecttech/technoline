# Вебхуки и события (API СДЭК)

## Методы
- GET /v2/webhooks — список подписок
- POST /v2/webhooks — создание подписки
- GET /v2/webhooks/{uuid} — информация о подписке
- DELETE /v2/webhooks/{uuid} — удаление подписки

## Типы событий
- ORDER_STATUS — статусы заказов
- PRINT_FORM — готовность печатной формы
- PREALERT_CLOSED — закрытие преалерта
- ACCOMPANYING_WAYBILL — транспорт для СНТ
- OFFICE_AVAILABILITY — изменение доступности офиса
- ORDER_MODIFIED — изменение заказа
- DELIV_AGREEMENT — изменение договоренности о доставке
- DELIV_PROBLEM — проблемы доставки

## Структура событий и примеры — см. terms_and_types.md и исходные данные 