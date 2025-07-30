import React, { useState, useEffect } from 'react'
import { 
  Table, Button, Space, Tag, message, Form, Input, Modal, 
  Tabs, Card, Typography, Spin, Row, Col, Tooltip,
  Select, Divider, Popconfirm
} from 'antd'
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, SaveOutlined, 
  SearchOutlined, SettingOutlined, TagsOutlined
} from '@ant-design/icons'

const { TextArea } = Input
const { Option } = Select
const { TabPane } = Tabs

interface Characteristic {
  _id: string;
  name: string;
}

interface CharacteristicValue {
  _id: string
  characteristicId: string
  value: string
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

const Characteristics: React.FC = () => {
  const [characteristics, setCharacteristics] = useState<Characteristic[]>([])
  const [characteristicValues, setCharacteristicValues] = useState<CharacteristicValue[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('characteristics')
  const [editingCharacteristic, setEditingCharacteristic] = useState<Characteristic | null>(null)
  const [editingValue, setEditingValue] = useState<CharacteristicValue | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isValueModalVisible, setIsValueModalVisible] = useState(false)
  const [form] = Form.useForm()
  const [valueForm] = Form.useForm()
  const [isBatchValueMode, setIsBatchValueMode] = useState(false);

  // Загрузка характеристик и их значений
  useEffect(() => {
    fetchCharacteristics()
  }, [])

  const fetchCharacteristics = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/characteristics`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      })
      if (!response.ok) throw new Error('Failed to fetch characteristics')
      const data = await response.json()
      setCharacteristics(data)
    } catch (error) {
      console.error('Error fetching characteristics:', error)
      message.error('Ошибка при загрузке характеристик')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCharacteristicValues = async (characteristicId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/characteristics/${characteristicId}/values`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      })
      if (!response.ok) throw new Error('Failed to fetch characteristic values')
      const data = await response.json()
      setCharacteristicValues(data)
    } catch (error) {
      console.error('Error fetching characteristic values:', error)
      message.error('Ошибка при загрузке значений характеристик')
    }
  }

  const handleCreateCharacteristic = () => {
    setEditingCharacteristic(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEditCharacteristic = (characteristic: Characteristic) => {
    setEditingCharacteristic(characteristic)
    form.setFieldsValue({
      name: characteristic.name
    })
    setIsModalVisible(true)
  }

  const handleSaveCharacteristic = async (values: any) => {
    try {
      let charId = editingCharacteristic?._id;
      if (!editingCharacteristic) {
        // Создаём характеристику
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/characteristics`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
          },
          body: JSON.stringify({ name: values.name })
        })
        if (!response.ok) throw new Error('Failed to create characteristic')
        const data = await response.json()
        charId = data._id
        // Добавляем значения
        const lines = (values.values || '').split('\n').map((v: string) => v.trim()).filter(Boolean)
        for (const line of lines) {
          await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/characteristics/${charId}/values`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            },
            body: JSON.stringify({ value: line, isActive: true })
          })
        }
      } else {
        // Только обновляем название
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/characteristics/${charId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
          },
          body: JSON.stringify({ name: values.name })
        })
        if (!response.ok) throw new Error('Failed to update characteristic')
      }
      message.success(editingCharacteristic ? 'Характеристика обновлена' : 'Характеристика и значения созданы')
      setIsModalVisible(false)
      fetchCharacteristics()
    } catch (error) {
      console.error('Error saving characteristic:', error)
      message.error('Ошибка при сохранении характеристики')
    }
  }

  const handleDeleteCharacteristic = async (id: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/characteristics/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      })
      
      if (!response.ok) throw new Error('Failed to delete characteristic')
      
      message.success('Характеристика удалена')
      fetchCharacteristics()
    } catch (error) {
      console.error('Error deleting characteristic:', error)
      message.error('Ошибка при удалении характеристики')
    }
  }

  const handleCreateValue = (characteristicId: string) => {
    setEditingValue(null)
    valueForm.resetFields()
    setEditingValue({ characteristicId } as CharacteristicValue)
    setIsValueModalVisible(true)
    setIsBatchValueMode(true)
  }

  const handleEditValue = (value: CharacteristicValue) => {
    setEditingValue(value)
    valueForm.setFieldsValue({
      value: value.value,
      isActive: value.isActive,
      sortOrder: value.sortOrder
    })
    setIsValueModalVisible(true)
    setIsBatchValueMode(false)
  }

  const handleSaveValue = async (values: any) => {
    try {
      if (isBatchValueMode) {
        const lines = values.value.split('\n').map((v: string) => v.trim()).filter(Boolean)
        for (const line of lines) {
          await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/characteristics/${editingValue?.characteristicId}/values`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            },
            body: JSON.stringify({ value: line, isActive: true, sortOrder: 0 })
          })
        }
        message.success('Значения добавлены')
        setIsValueModalVisible(false)
        if (editingValue?.characteristicId) {
          fetchCharacteristicValues(editingValue.characteristicId)
        }
        return
      }
      // Обычный режим (редактирование одного значения)
      const url = editingValue?._id 
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/characteristics/${editingValue.characteristicId}/values/${editingValue._id}`
        : `${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/characteristics/${editingValue?.characteristicId}/values`
      
      const method = editingValue?._id ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(values)
      })
      
      if (!response.ok) throw new Error('Failed to save characteristic value')
      
      message.success(editingValue?._id ? 'Значение обновлено' : 'Значение создано')
      setIsValueModalVisible(false)
      if (editingValue?.characteristicId) {
        fetchCharacteristicValues(editingValue.characteristicId)
      }
    } catch (error) {
      console.error('Error saving characteristic value:', error)
      message.error('Ошибка при сохранении значения')
    }
  }

  const handleDeleteValue = async (characteristicId: string, valueId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/characteristics/${characteristicId}/values/${valueId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      })
      
      if (!response.ok) throw new Error('Failed to delete characteristic value')
      
      message.success('Значение удалено')
      fetchCharacteristicValues(characteristicId)
    } catch (error) {
      console.error('Error deleting characteristic value:', error)
      message.error('Ошибка при удалении значения')
    }
  }

  const characteristicsColumns = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <strong>{text}</strong>
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 200,
      render: (_: any, record: Characteristic) => (
        <Space>
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => handleEditCharacteristic(record)}
          />
          <Button 
            type="text" 
            icon={<TagsOutlined />} 
            onClick={() => {
              setActiveTab('values')
              fetchCharacteristicValues(record._id)
            }}
          />
          <Popconfirm
            title="Удалить характеристику?"
            onConfirm={() => handleDeleteCharacteristic(record._id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  const valuesColumns = [
    {
      title: 'Значение',
      dataIndex: 'value',
      key: 'value',
      render: (text: string) => <strong>{text}</strong>
    },
    {
      title: 'Статус',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Активно' : 'Неактивно'}
        </Tag>
      )
    },
    {
      title: 'Сортировка',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 100
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      render: (_: any, record: CharacteristicValue) => (
        <Space>
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => handleEditValue(record)}
          />
          <Popconfirm
            title="Удалить значение?"
            onConfirm={() => handleDeleteValue(record.characteristicId, record._id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div style={{ padding: '24px' }}>
      <Card title="Управление характеристиками товаров">
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="Характеристики" key="characteristics">
            <div style={{ marginBottom: 16 }}>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleCreateCharacteristic}
              >
                Добавить характеристику
              </Button>
            </div>
            
            <Table
              columns={characteristicsColumns}
              dataSource={characteristics}
              rowKey="_id"
              loading={isLoading}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showQuickJumper: true
              }}
            />
          </TabPane>
          
          <TabPane tab="Значения характеристик" key="values">
            <div style={{ marginBottom: 16 }}>
              <Select
                placeholder="Выберите характеристику"
                style={{ width: 300, marginRight: 16 }}
                onChange={(characteristicId) => {
                  if (characteristicId) {
                    fetchCharacteristicValues(characteristicId)
                  }
                }}
              >
                {characteristics.map(char => (
                  <Option key={char._id} value={char._id}>
                    {char.name}
                  </Option>
                ))}
              </Select>
              
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => {
                  const selectedCharId = (document.querySelector('select[placeholder="Выберите характеристику"]') as HTMLSelectElement)?.value
                  if (selectedCharId) {
                    handleCreateValue(selectedCharId)
                  } else {
                    message.warning('Сначала выберите характеристику')
                  }
                }}
              >
                Добавить значение
              </Button>
            </div>
            
            <Table
              columns={valuesColumns}
              dataSource={characteristicValues}
              rowKey="_id"
              loading={isLoading}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showQuickJumper: true
              }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* Модальное окно для характеристики */}
      <Modal
        title={editingCharacteristic ? 'Редактировать характеристику' : 'Создать характеристику'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveCharacteristic}
        >
          <Form.Item
            name="name"
            label="Название характеристики"
            rules={[{ required: true, message: 'Введите название характеристики' }]}
          >
            <Input placeholder="Введите название характеристики" />
          </Form.Item>
          {!editingCharacteristic && (
            <Form.Item
              name="values"
              label="Значения (каждое с новой строки)"
            >
              <TextArea rows={5} placeholder="Например:\nКрасный\nСиний\nЗелёный" />
            </Form.Item>
          )}
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                {editingCharacteristic ? 'Обновить' : 'Создать'}
              </Button>
              <Button onClick={() => setIsModalVisible(false)}>
                Отмена
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно для значения характеристики */}
      <Modal
        title={editingValue?._id ? 'Редактировать значение' : 'Создать значения'}
        open={isValueModalVisible}
        onCancel={() => setIsValueModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={valueForm}
          layout="vertical"
          onFinish={handleSaveValue}
        >
          <Form.Item
            name="value"
            label={isBatchValueMode ? 'Значения (каждое с новой строки)' : 'Значение'}
            rules={[{ required: true, message: isBatchValueMode ? 'Введите хотя бы одно значение' : 'Введите значение' }]}
          >
            {isBatchValueMode ? (
              <TextArea rows={5} placeholder="Например:\nКрасный\nСиний\nЗелёный" />
            ) : (
              <Input placeholder="Введите значение характеристики" />
            )}
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="isActive"
                label="Статус"
                valuePropName="checked"
              >
                <Select>
                  <Option value={true}>Активно</Option>
                  <Option value={false}>Неактивно</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="sortOrder"
                label="Сортировка"
              >
                <Input type="number" placeholder="0" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                {editingValue?._id ? 'Обновить' : 'Добавить'}
              </Button>
              <Button onClick={() => setIsValueModalVisible(false)}>
                Отмена
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Characteristics 