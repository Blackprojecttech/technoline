import React, { useState, useEffect } from 'react'
import { Table, Button, Space, Tag, Modal, message, Form, Input, InputNumber, Switch, Card, Typography, Spin, Select } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import DeliveryZonesManager from '../components/DeliveryZonesManager';
import { Select as AntdSelect } from 'antd';

interface DeliveryMethod {
  _id: string
  name: string
  description?: string
  conditions?: string
  workingHours?: string
  address?: string
  restrictions?: string
  deadlines?: string
  costType: 'fixed' | 'percentage' | 'zone' | 'fixed_plus_percentage'
  fixedCost?: number
  costPercentage?: number
  isActive?: boolean
  useFlexibleIntervals?: boolean
  intervalType?: 'standard' | 'flexible' | 'cdek'
  // Пользовательские интервалы
  customInterval1?: string
  customInterval2?: string
  // Параметры времени доставки
  orderTimeFrom?: string
  orderTimeTo?: string
  // Время доставки для сегодня
  deliveryTodayTimeFrom?: string
  deliveryTodayTimeTo?: string
  // Время доставки для завтра
  deliveryTomorrowTimeFrom?: string
  deliveryTomorrowTimeTo?: string
  // Условия для определения дня доставки
  orderTimeForToday?: string
  orderTimeForTomorrow?: string
  // Проверка адреса доставки
  requireAddressValidation?: boolean
  addressValidationType?: 'moscow_mkad' | 'moscow_region' | 'region'
  createdAt: string
  updatedAt: string
  // Новые поля для зон
  useZones?: boolean
  zoneKeys?: string[]
  // Тип доставки
  type?: 'courier' | 'pickup' | 'urgent'
  allowWeekendDelivery?: boolean
}

const DeliveryMethods: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingMethod, setEditingMethod] = useState<DeliveryMethod | null>(null)
  const queryClient = useQueryClient()
  const [form] = Form.useForm()
  const [zonesModalVisible, setZonesModalVisible] = useState(false);
  const [zones, setZones] = useState<any[]>([]);

  // Автоматическая прокрутка вверх при загрузке страницы
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    // Загружаем зоны для мультиселекта
    fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/admin/delivery-zones`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
    })
      .then(res => res.json())
      .then(data => setZones(data.zones || []));
  }, []);

  const { data: deliveryMethods = [], isLoading } = useQuery('delivery', async () => {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/delivery`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
      }
    })
    if (!response.ok) {
      throw new Error('Failed to fetch delivery methods')
    }
    const data = await response.json()
    return data.deliveryMethods || []
  })

  const createDeliveryMutation = useMutation({
    mutationFn: async (values: any) => {
      console.log('🔐 Creating delivery method with values:', values)
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/delivery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(values)
      })
      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Server error:', errorData)
        throw new Error(errorData.message || 'Failed to create delivery method')
      }
      return response.json()
    },
    onSuccess: () => {
      message.success('Метод доставки создан успешно!')
      queryClient.invalidateQueries('delivery')
      setIsModalVisible(false)
      form.resetFields()
    },
    onError: (error: any) => {
      message.error(`Ошибка при создании метода доставки: ${error.message}`)
      console.error('Create error:', error)
    }
  })

  const updateDeliveryMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string, values: any }) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/delivery/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(values)
      })
      if (!response.ok) {
        throw new Error('Failed to update delivery method')
      }
      return response.json()
    },
    onSuccess: () => {
      message.success('Метод доставки обновлен успешно!')
      queryClient.invalidateQueries('delivery')
      setIsModalVisible(false)
      form.resetFields()
    },
    onError: (error) => {
      message.error('Ошибка при обновлении метода доставки')
      console.error('Update error:', error)
    }
  })

  const deleteDeliveryMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/delivery/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      })
      if (!response.ok) {
        throw new Error('Failed to delete delivery method')
      }
      return response.json()
    },
    onSuccess: () => {
      message.success('Метод доставки удален успешно!')
      queryClient.invalidateQueries('delivery')
    },
    onError: (error) => {
      message.error('Ошибка при удалении метода доставки')
      console.error('Delete error:', error)
    }
  })

  const handleCreate = () => {
    setEditingMethod(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEdit = (record: DeliveryMethod) => {
    setEditingMethod(record)
    
    // Определяем тип интервалов на основе существующих данных
    let intervalType = 'standard';
    if (record.intervalType === 'cdek') {
      intervalType = 'cdek';
    } else if (record.intervalType === 'flexible' || record.useFlexibleIntervals) {
      intervalType = 'flexible';
    }
    
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      conditions: record.conditions,
      workingHours: record.workingHours,
      address: record.address,
      restrictions: record.restrictions,
      deadlines: record.deadlines,
      isActive: record.isActive !== false, // По умолчанию true, если не указано
      intervalType: intervalType,
      useFlexibleIntervals: record.useFlexibleIntervals || false, // По умолчанию false (стандартные интервалы)
      customInterval1: record.customInterval1 || '',
      customInterval2: record.customInterval2 || '',
      costType: record.costType || 'fixed',
      fixedCost: record.fixedCost,
      costPercentage: record.costPercentage,
      requireAddressValidation: record.requireAddressValidation || false,
      addressValidationType: record.addressValidationType || 'moscow_mkad',
      useZones: record.useZones || false,
      zoneKeys: record.zoneKeys || [],
      type: record.type || 'courier', // Добавляем поле type
      allowWeekendDelivery: record.allowWeekendDelivery || false
    })
    setIsModalVisible(true)
  }

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Подтверждение удаления',
      content: 'Вы уверены, что хотите удалить этот метод доставки?',
      okText: 'Удалить',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: () => deleteDeliveryMutation.mutate(id)
    })
  }

  const handleModalOk = () => {
    form.validateFields().then((values) => {
      onFinish(values);
    })
  }

  const handleModalCancel = () => {
    setIsModalVisible(false)
    setEditingMethod(null)
    form.resetFields()
  }

  const onFinish = (values: any) => {
    console.log('📝 Form values before processing:', values);
    
    // Преобразуем объекты Day.js в строки времени (если они остались)
    const processedValues = { ...values };
    
    // Убеждаемся, что новые поля включены
    console.log('🔍 Checking interval type:', {
      intervalType: processedValues.intervalType,
      customInterval1: processedValues.customInterval1,
      customInterval2: processedValues.customInterval2
    });

    // Устанавливаем useFlexibleIntervals на основе intervalType для обратной совместимости
    if (processedValues.intervalType === 'flexible') {
      processedValues.useFlexibleIntervals = true;
    } else {
      processedValues.useFlexibleIntervals = false;
    }

    console.log('📤 Processed values for submission:', processedValues);

    if (processedValues.useZones) {
      processedValues.zoneKeys = zones.map(z => z.key);
    }

    if (processedValues.costType === 'zone') {
      processedValues.zoneKeys = zones.map(z => z.key);
    }

    if (editingMethod) {
      updateDeliveryMutation.mutate({ id: editingMethod._id, values: processedValues })
    } else {
      createDeliveryMutation.mutate(processedValues)
    }
  }

  const columns = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <strong>{text}</strong>
    },
    {
      title: 'Тип интервалов',
      key: 'intervals',
      render: (record: DeliveryMethod) => {
        if (record.intervalType === 'cdek') {
          return <Tag color="green">СДЭК (авто)</Tag>;
        }
        if (record.intervalType === 'flexible' || record.useFlexibleIntervals) {
          return (
            <div>
              <Tag color="blue">Свои интервалы</Tag>
              {record.customInterval1 && record.customInterval2 && (
                <div style={{ marginTop: 4, fontSize: '12px', color: '#666' }}>
                  {record.customInterval1}, {record.customInterval2}
                </div>
              )}
            </div>
          );
        }
        return <Tag color="orange">Стандартные (2ч)</Tag>;
      }
    },
    {
      title: 'Стоимость',
      key: 'cost',
      render: (record: DeliveryMethod) => {
        if (record.costType === 'zone') {
          return <Tag color="purple">По зонам</Tag>;
        }
        if (record.costType === 'fixed_plus_percentage' && record.fixedCost && record.costPercentage) {
          return <Tag color="cyan">{record.fixedCost} ₽ + {record.costPercentage}%</Tag>;
        }
        if (record.costType === 'percentage' && record.costPercentage && record.costPercentage > 0) {
          return <Tag color="blue">{record.costPercentage}% от заказа</Tag>;
        } else if (record.costType === 'fixed' && record.fixedCost && record.fixedCost > 0) {
          return <Tag color="green">{record.fixedCost} ₽</Tag>;
        } else if (record.costType === 'fixed' && (!record.fixedCost || record.fixedCost === 0)) {
          return <Tag color="orange">Бесплатно</Tag>;
        }
        return <span style={{ color: '#999' }}>Не указано</span>;
      }
    },
    {
      title: 'Проверка адреса',
      key: 'addressValidation',
      render: (record: DeliveryMethod) => {
        if (record.requireAddressValidation) {
          const validationType = record.addressValidationType === 'moscow_mkad' 
            ? 'В пределах МКАД' 
            : record.addressValidationType === 'moscow_region'
            ? 'За пределами МКАД (Подмосковье)'
            : 'За ЦКАД (регионы)';
          return <Tag color="purple">{validationType}</Tag>
        }
        return <span style={{ color: '#999' }}>Не требуется</span>
      }
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (record: DeliveryMethod) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => {
              Modal.info({
                title: record.name,
                content: (
                  <div>
                    <p><strong>Описание:</strong> {record.description || 'Нет описания'}</p>
                    {record.conditions && <p><strong>Условия:</strong> {record.conditions}</p>}
                    {record.workingHours && <p><strong>Часы работы:</strong> {record.workingHours}</p>}
                    {record.address && <p><strong>Адрес:</strong> {record.address}</p>}
                    {record.restrictions && <p><strong>Ограничения:</strong> {record.restrictions}</p>}
                    {record.deadlines && <p><strong>Сроки:</strong> {record.deadlines}</p>}
                    <p><strong>Статус:</strong> {record.isActive !== false ? 'Активен' : 'Неактивен'}</p>
                    <p><strong>Тип интервалов:</strong> {
                      record.intervalType === 'cdek' 
                        ? 'СДЭК (автоматический расчет)' 
                        : record.intervalType === 'flexible' || record.useFlexibleIntervals 
                        ? 'Свои интервалы' 
                        : 'Стандартные (по 2 часа)'
                    }</p>
                    {record.useFlexibleIntervals && record.customInterval1 && record.customInterval2 && (
                      <p><strong>Пользовательские интервалы:</strong> {record.customInterval1}, {record.customInterval2}</p>
                    )}
                    <p><strong>Стоимость:</strong> {
                      record.costType === 'percentage' && record.costPercentage && record.costPercentage > 0
                        ? `${record.costPercentage}% от стоимости заказа`
                        : record.costType === 'fixed' && record.fixedCost && record.fixedCost > 0
                        ? `${record.fixedCost} ₽`
                        : 'Бесплатно'
                    }</p>
                    <p><strong>Проверка адреса:</strong> {
                      record.requireAddressValidation
                        ? record.addressValidationType === 'moscow_mkad'
                          ? 'В пределах МКАД (Москва)'
                          : record.addressValidationType === 'moscow_region'
                          ? 'За пределами МКАД (Подмосковье)'
                          : 'За ЦКАД (регионы)'
                        : 'Не требуется'
                    }</p>
                    {record.orderTimeFrom && record.orderTimeTo && 
                     record.deliveryTodayTimeFrom && record.deliveryTodayTimeTo && 
                     record.deliveryTomorrowTimeFrom && record.deliveryTomorrowTimeTo && (
                      <div>
                        <p><strong>Время заказа:</strong> {record.orderTimeFrom} - {record.orderTimeTo}</p>
                        <p><strong>Доставка сегодня:</strong> {record.deliveryTodayTimeFrom} - {record.deliveryTodayTimeTo}</p>
                        <p><strong>Доставка завтра:</strong> {record.deliveryTomorrowTimeFrom} - {record.deliveryTomorrowTimeTo}</p>
                        {record.orderTimeForToday && (
                          <p><strong>Условие для доставки сегодня:</strong> заказ до {record.orderTimeForToday}</p>
                        )}
                        {record.orderTimeForTomorrow && (
                          <p><strong>Условие для доставки завтра:</strong> заказ до {record.orderTimeForTomorrow}</p>
                        )}
                      </div>
                    )}
                    <p><strong>Создан:</strong> {new Date(record.createdAt).toLocaleDateString()}</p>
                    <p><strong>Обновлен:</strong> {new Date(record.updatedAt).toLocaleDateString()}</p>
                  </div>
                ),
                width: 500
              })
            }}
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record._id)}
          />
        </Space>
      )
    }
  ]

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <Typography.Title level={2} style={{ margin: 0 }}>
            Методы доставки
          </Typography.Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            Добавить метод доставки
          </Button>
        </div>

        <Button type="default" style={{ marginBottom: 16 }} onClick={() => setZonesModalVisible(true)}>
          Редактировать зоны доставки
        </Button>
        <Modal
          title="Зоны доставки"
          open={zonesModalVisible}
          onCancel={() => setZonesModalVisible(false)}
          footer={null}
          width={700}
        >
          <DeliveryZonesManager />
        </Modal>

        <Table
          columns={columns}
          dataSource={deliveryMethods}
          rowKey="_id"
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} из ${total} методов доставки`
          }}
        />
      </Card>

      <Modal
        title={editingMethod ? 'Редактировать метод доставки' : 'Добавить метод доставки'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        okText={editingMethod ? 'Обновить' : 'Создать'}
        cancelText="Отмена"
        confirmLoading={createDeliveryMutation.isLoading || updateDeliveryMutation.isLoading}
      >
        <Form
          layout="vertical"
          onFinish={onFinish}
          initialValues={editingMethod || {}}
          form={form}
        >
          <Form.Item
            name="name"
            label="Название метода доставки"
            rules={[{ required: true, message: 'Введите название метода доставки' }]}
          >
            <Input placeholder="Введите название метода доставки" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
            rules={[{ required: true, message: 'Введите описание метода доставки' }]}
          >
            <Input.TextArea rows={3} placeholder="Введите описание метода доставки" />
          </Form.Item>

          <Form.Item
            name="conditions"
            label="Условия"
          >
            <Input.TextArea rows={2} placeholder="Введите условия доставки" />
          </Form.Item>

          <Form.Item
            name="workingHours"
            label="Часы работы"
          >
            <Input placeholder="Введите часы работы" />
          </Form.Item>

          <Form.Item
            name="type"
            label="Тип доставки"
            rules={[{ required: true, message: 'Выберите тип доставки' }]}
          >
            <Select
              options={[
                { value: 'courier', label: 'Курьером' },
                { value: 'pickup', label: 'Самовывоз' },
                { value: 'urgent', label: 'Срочная доставка' }
              ]}
              placeholder="Выберите тип доставки"
            />
          </Form.Item>

          {/* Адрес только для курьера */}
          {form.getFieldValue('type') !== 'pickup' && (
          <Form.Item
            name="address"
            label="Адрес"
          >
            <Input placeholder="Введите адрес" />
          </Form.Item>
          )}

          <Form.Item
            name="restrictions"
            label="Ограничения"
          >
            <Input.TextArea rows={2} placeholder="Введите ограничения" />
          </Form.Item>

          <Form.Item
            name="deadlines"
            label="Сроки"
          >
            <Input.TextArea rows={2} placeholder="Введите сроки доставки" />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="Статус"
            valuePropName="checked"
          >
            <Switch 
              checkedChildren="Активен" 
              unCheckedChildren="Неактивен"
            />
          </Form.Item>

          <Form.Item
            name="intervalType"
            label="Тип интервалов"
            rules={[{ required: true, message: 'Выберите тип интервалов' }]}
          >
            <Select placeholder="Выберите тип интервалов">
              <Select.Option value="standard">Стандартные (2 часа)</Select.Option>
              <Select.Option value="flexible">Свои интервалы</Select.Option>
              <Select.Option value="cdek">СДЭК (по адресу)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.intervalType !== currentValues.intervalType}
          >
            {({ getFieldValue }) => {
              const intervalType = getFieldValue('intervalType');
              
              if (intervalType === 'flexible') {
                return (
                  <>
                    <Typography.Title level={5} style={{ marginTop: 16, marginBottom: 8 }}>
                      Пользовательские интервалы
                    </Typography.Title>
                    <Form.Item
                      name="customInterval1"
                      label="Первый интервал (например: 13:00-17:00)"
                      rules={[
                        { required: true, message: 'Введите первый интервал' },
                        { pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]-([01]?[0-9]|2[0-3]):[0-5][0-9]$/, message: 'Формат: ЧЧ:ММ-ЧЧ:ММ' }
                      ]}
                    >
                      <Input placeholder="13:00-17:00" />
                    </Form.Item>
                    <Form.Item
                      name="customInterval2"
                      label="Второй интервал (например: 17:00-21:00)"
                      rules={[
                        { required: true, message: 'Введите второй интервал' },
                        { pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]-([01]?[0-9]|2[0-3]):[0-5][0-9]$/, message: 'Формат: ЧЧ:ММ-ЧЧ:ММ' }
                      ]}
                    >
                      <Input placeholder="17:00-21:00" />
                    </Form.Item>
                  </>
                );
              }
              
              if (intervalType === 'cdek') {
                return (
                  <>
                    <Typography.Title level={5} style={{ marginTop: 16, marginBottom: 8, color: '#1890ff' }}>
                      СДЭК - автоматический расчет доставки
                    </Typography.Title>
                    <div style={{ 
                      padding: '12px', 
                      backgroundColor: '#f6ffed', 
                      border: '1px solid #b7eb8f', 
                      borderRadius: '6px',
                      marginBottom: '16px'
                    }}>
                      <p style={{ margin: 0, color: '#52c41a' }}>
                        <strong>ℹ️ СДЭК интервалы:</strong>
                      </p>
                      <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                        <li>Сроки доставки рассчитываются автоматически по адресу</li>
                        <li>Учитывается расстояние и регион доставки</li>
                        <li>Интервалы формируются на основе данных СДЭК</li>
                        <li>Не требует ручной настройки времени</li>
                      </ul>
                    </div>
                  </>
                );
              }
              
              return null;
            }}
          </Form.Item>

          <Form.Item name="useZones" label="Использовать зоны доставки" valuePropName="checked">
            <Switch checkedChildren="Да" unCheckedChildren="Нет" />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.useZones !== curr.useZones}>
            {({ getFieldValue }) => getFieldValue('useZones') ? (
              <Form.Item name="zoneKeys" label="Зоны доставки" rules={[{ required: true, message: 'Выберите хотя бы одну зону' }]}> 
                <AntdSelect mode="multiple" placeholder="Выберите зоны" optionFilterProp="children">
                  {zones.map(z => <AntdSelect.Option key={z.key} value={z.key}>{z.name} ({z.price} ₽)</AntdSelect.Option>)}
                </AntdSelect>
              </Form.Item>
            ) : null}
          </Form.Item>

          <Form.Item
            name="allowWeekendDelivery"
            label="Разрешить доставку в выходные дни"
            valuePropName="checked"
            initialValue={false}
            tooltip="Если выключено — клиент не сможет выбрать субботу и воскресенье для доставки."
          >
            <Switch checkedChildren="Да" unCheckedChildren="Нет" />
          </Form.Item>

          <Typography.Title level={4} style={{ marginTop: 24, marginBottom: 16 }}>
            Настройки стоимости
          </Typography.Title>

          <Form.Item
            name="costType"
            label="Тип стоимости"
            rules={[{ required: true, message: 'Выберите тип стоимости' }]}
          >
            <Select placeholder="Выберите тип стоимости">
              <Select.Option value="fixed">Фиксированная стоимость</Select.Option>
              <Select.Option value="percentage">Процент от заказа</Select.Option>
              <Select.Option value="zone">По зонам</Select.Option>
              <Select.Option value="fixed_plus_percentage">Сумма + процент</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.costType !== currentValues.costType}
          >
            {({ getFieldValue }) => {
              const costType = getFieldValue('costType');
              
              if (costType === 'fixed') {
                return (
                  <Form.Item
                    name="fixedCost"
                    label="Фиксированная стоимость (₽)"
                    rules={[
                      { type: 'number', min: 0, message: 'Стоимость должна быть больше или равна 0' }
                    ]}
                  >
                    <InputNumber
                      placeholder="Введите стоимость доставки"
                      min={0}
                      precision={2}
                      style={{ width: '100%' }}
                      addonAfter="₽"
                    />
                  </Form.Item>
                );
              }
              
              if (costType === 'percentage') {
                return (
                  <Form.Item
                    name="costPercentage"
                    label="Процент от стоимости заказа (%)"
                    rules={[
                      { type: 'number', min: 0, max: 100, message: 'Процент должен быть от 0 до 100' }
                    ]}
                  >
                    <InputNumber
                      placeholder="Введите процент от стоимости заказа"
                      min={0}
                      max={100}
                      precision={2}
                      style={{ width: '100%' }}
                      addonAfter="%"
                    />
                  </Form.Item>
                );
              }

              if (costType === 'fixed_plus_percentage') {
                return (
                  <>
                    <Form.Item
                      name="fixedCost"
                      label="Фиксированная сумма (₽)"
                      rules={[
                        { required: true, message: 'Введите фиксированную сумму' },
                        { type: 'number', min: 0, message: 'Сумма должна быть больше или равна 0' }
                      ]}
                    >
                      <InputNumber
                        placeholder="Например: 500"
                        min={0}
                        precision={2}
                        style={{ width: '100%' }}
                        addonAfter="₽"
                      />
                    </Form.Item>
                    <Form.Item
                      name="costPercentage"
                      label="Процент от стоимости заказа (%)"
                      rules={[
                        { required: true, message: 'Введите процент' },
                        { type: 'number', min: 0, max: 100, message: 'Процент должен быть от 0 до 100' }
                      ]}
                    >
                      <InputNumber
                        placeholder="Например: 5"
                        min={0}
                        max={100}
                        precision={2}
                        style={{ width: '100%' }}
                        addonAfter="%"
                      />
                    </Form.Item>
                    <div style={{
                      padding: '12px',
                      background: '#f6ffed',
                      border: '1px solid #b7eb8f',
                      borderRadius: '6px',
                      marginBottom: '16px'
                    }}>
                      <div style={{ fontSize: '14px', color: '#52c41a', fontWeight: '500' }}>
                        💡 Пример расчета:
                      </div>
                      <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>
                        При заказе на 10,000₽: {getFieldValue('fixedCost') || 0}₽ + {getFieldValue('costPercentage') || 0}% = {(getFieldValue('fixedCost') || 0) + Math.round(10000 * ((getFieldValue('costPercentage') || 0) / 100))}₽
                      </div>
                    </div>
                  </>
                );
              }
              
              return null;
            }}
          </Form.Item>

          <Typography.Title level={4} style={{ marginTop: 24, marginBottom: 16 }}>
            Проверка адреса доставки
          </Typography.Title>

          <Form.Item
            name="requireAddressValidation"
            label="Требовать проверку адреса"
            valuePropName="checked"
          >
            <Switch 
              checkedChildren="Включено" 
              unCheckedChildren="Отключено"
            />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.requireAddressValidation !== currentValues.requireAddressValidation}
          >
            {({ getFieldValue }) => {
              const requireAddressValidation = getFieldValue('requireAddressValidation');
              
              if (requireAddressValidation) {
                return (
                  <Form.Item
                    name="addressValidationType"
                    label="Тип проверки адреса"
                    rules={[{ required: true, message: 'Выберите тип проверки адреса' }]}
                  >
                    <Select placeholder="Выберите тип проверки адреса">
                      <Select.Option value="moscow_mkad">В пределах МКАД (Москва)</Select.Option>
                      <Select.Option value="moscow_region">За пределами МКАД (Подмосковье)</Select.Option>
                      <Select.Option value="region">За ЦКАД (регионы)</Select.Option>
                    </Select>
                  </Form.Item>
                );
              }
              
              return null;
            }}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default DeliveryMethods 