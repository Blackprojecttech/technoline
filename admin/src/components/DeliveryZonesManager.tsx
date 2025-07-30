import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, message, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

interface DeliveryZone {
  _id?: string;
  key: string;
  name: string;
  price: number;
  sortOrder: number;
}

const apiUrl = `${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/admin/delivery-zones`;

const DeliveryZonesManager: React.FC = () => {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [form] = Form.useForm();

  const fetchZones = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      const data = await res.json();
      setZones(data.zones || []);
    } catch (e) {
      message.error('Ошибка при загрузке зон');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchZones(); }, []);

  const handleAdd = () => {
    setEditingZone(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (zone: DeliveryZone) => {
    setEditingZone(zone);
    form.setFieldsValue(zone);
    setModalVisible(true);
  };

  const handleDelete = async (zone: DeliveryZone) => {
    Modal.confirm({
      title: 'Удалить зону?',
      content: `Вы уверены, что хотите удалить зону "${zone.name}"?`,
      okText: 'Удалить',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          await fetch(`${apiUrl}/${zone._id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
          });
          message.success('Зона удалена');
          fetchZones();
        } catch {
          message.error('Ошибка при удалении зоны');
        }
      }
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingZone && editingZone._id) {
        // update
        await fetch(`${apiUrl}/${editingZone._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
          },
          body: JSON.stringify(values)
        });
        message.success('Зона обновлена');
      } else {
        // create
        await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
          },
          body: JSON.stringify(values)
        });
        message.success('Зона добавлена');
      }
      setModalVisible(false);
      fetchZones();
    } catch (e: any) {
      message.error(e?.message || 'Ошибка при сохранении зоны');
    }
  };

  // Сортировка зон (drag&drop можно добавить позже)
  const moveZone = async (index: number, direction: -1 | 1) => {
    const newZones = [...zones];
    if (index + direction < 0 || index + direction >= zones.length) return;
    // swap sortOrder
    const temp = newZones[index].sortOrder;
    newZones[index].sortOrder = newZones[index + direction].sortOrder;
    newZones[index + direction].sortOrder = temp;
    // swap in array
    [newZones[index], newZones[index + direction]] = [newZones[index + direction], newZones[index]];
    setZones(newZones);
    // save both
    await Promise.all([
      fetch(`${apiUrl}/${newZones[index]._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(newZones[index])
      }),
      fetch(`${apiUrl}/${newZones[index + direction]._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(newZones[index + direction])
      })
    ]);
    fetchZones();
  };

  const columns = [
    { title: 'Название', dataIndex: 'name', key: 'name' },
    { title: 'Ключ', dataIndex: 'key', key: 'key' },
    { title: 'Стоимость', dataIndex: 'price', key: 'price', render: (v: number) => `${v} ₽` },
    {
      title: 'Сортировка',
      key: 'sort',
      render: (_: any, _zone: DeliveryZone, idx: number) => (
        <Space>
          <Button icon={<ArrowUpOutlined />} size="small" disabled={idx === 0} onClick={() => moveZone(idx, -1)} />
          <Button icon={<ArrowDownOutlined />} size="small" disabled={idx === zones.length - 1} onClick={() => moveZone(idx, 1)} />
        </Space>
      )
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, zone: DeliveryZone) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEdit(zone)} />
          <Button icon={<DeleteOutlined />} danger onClick={() => handleDelete(zone)} />
        </Space>
      )
    }
  ];

  return (
    <div>
      <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} style={{ marginBottom: 16 }}>
        Добавить зону
      </Button>
      <Table
        columns={columns}
        dataSource={zones}
        rowKey="_id"
        loading={loading}
        pagination={false}
        size="small"
      />
      <Modal
        title={editingZone ? 'Редактировать зону' : 'Добавить зону'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        okText={editingZone ? 'Сохранить' : 'Добавить'}
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Название зоны" rules={[{ required: true, message: 'Введите название зоны' }]}> <Input /> </Form.Item>
          <Form.Item name="key" label="Ключ (латиницей, уникально)" rules={[{ required: true, message: 'Введите ключ зоны' }]}> <Input /> </Form.Item>
          <Form.Item name="price" label="Стоимость (₽)" rules={[{ required: true, type: 'number', min: 0, message: 'Введите стоимость' }]}> <InputNumber min={0} style={{ width: '100%' }} /> </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DeliveryZonesManager; 