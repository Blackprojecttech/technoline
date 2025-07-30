import React, { useState, useEffect } from 'react'
import { Tree, Button, Modal, Form, Input, message, Spin, Space, Tag, Switch, TreeSelect, Card, Typography, Popconfirm, Tooltip, Select } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, FolderOutlined, FolderOpenOutlined, EyeOutlined } from '@ant-design/icons'
import { useQuery } from 'react-query'

const { Title, Text } = Typography;
const { Option } = Select;

interface Category {
  _id: string
  name: string
  slug: string
  description?: string
  isActive: boolean
  productCount?: number
  createdAt: string
  parentId?: string | null;
  children?: Category[];
  characteristicGroupIds?: string[];
}

interface CharacteristicGroup {
  _id: string
  name: string
  description?: string
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

async function fetchCategories(): Promise<{ categories: Category[]; total: number }> {
  const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/categories`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
    }
  })
  if (!response.ok) {
    throw new Error('Failed to fetch categories')
  }
  const categories = await response.json()
  return {
    categories: categories,
    total: categories.length
  }
}

// Преобразование flat списка в дерево
function buildCategoryTree(categories: Category[]): Category[] {
  const map = new Map<string, Category & { children: Category[] }>();
  categories.forEach(cat => {
    if (typeof cat.productCount !== 'number') cat.productCount = 0;
    map.set(cat._id, { ...cat, children: [] });
  });
  const tree: Category[] = [];
  map.forEach(cat => {
    if (cat.parentId && map.has(cat.parentId)) {
      map.get(cat.parentId)!.children!.push(cat);
    } else {
      tree.push(cat);
    }
  });
  return tree;
}

// Преобразование категорий из API в формат для Ant Design Tree
const mapCategoriesToTreeData = (categories: Category[]): any[] =>
  categories.map((cat: Category) => ({
    title: cat.name,
    key: cat._id,
    children: cat.children && cat.children.length > 0 ? mapCategoriesToTreeData(cat.children) : [],
    data: cat,
  }));

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [parentId, setParentId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [treeExpandedKeys, setTreeExpandedKeys] = useState<string[]>([]);
  const [characteristicGroups, setCharacteristicGroups] = useState<CharacteristicGroup[]>([]);

  // Автоматическая прокрутка вверх при загрузке страницы
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Загрузка категорий
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/categories`);
      const data = await response.json();
      setCategories(data);
    } catch (e) {
      message.error('Ошибка загрузки категорий');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Загрузка групп характеристик
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/characteristic-groups`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });
        if (!response.ok) throw new Error('Failed to fetch groups');
        const data = await response.json();
        setCharacteristicGroups(data);
      } catch (e) {
        message.error('Ошибка загрузки групп характеристик');
      }
    };
    fetchGroups();
  }, []);

  // Генерация slug
  const createSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[а-яё]/g, (char: string) => {
        const map: { [key: string]: string } = {
          'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
          'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
          'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
          'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
          'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
        };
        return map[char] || char;
      })
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  // Добавление/редактирование категории
  const handleSubmit = async (values: any) => {
    try {
      const payload = {
        name: values.name,
        slug: createSlug(values.name),
        parentId: parentId || null,
        characteristicGroupIds: values.characteristicGroupIds || [],
      };
      const url = editingCategory
        ? `${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/categories/${editingCategory._id}`
        : `${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/categories`;
      const method = editingCategory ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        message.success(editingCategory ? 'Категория обновлена' : 'Категория создана');
        setIsModalVisible(false);
        form.resetFields();
        setEditingCategory(null);
        setParentId(null);
        fetchCategories();
      } else {
        message.error('Ошибка сохранения категории');
      }
    } catch (e) {
      message.error('Ошибка сохранения категории');
    }
  };

  // Drag & Drop перемещение
  const onDrop = async (info: any) => {
    const dropKey = info.node.key;
    const dropParentId = info.node.parentId || null;
    const dragKey = info.dragNode.key;
    const newParentId = (info.node as any).data._id;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/categories/${dragKey}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ parentId: newParentId })
      });
      if (response.ok) {
        message.success('Категория перемещена');
        fetchCategories();
      } else {
        message.error('Ошибка перемещения');
      }
    } catch (e) {
      message.error('Ошибка перемещения');
    }
  };

  // Удаление категории
  const handleDelete = async (categoryId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });

      if (response.ok) {
        message.success('Категория удалена');
        fetchCategories();
      } else {
        message.error('Ошибка при удалении категории');
      }
    } catch (error) {
      message.error('Ошибка сети');
    }
  };

  // Обработчик редактирования
  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    form.setFieldsValue({
      name: category.name,
      characteristicGroupIds: category.characteristicGroupIds || [],
    });
    setParentId(category.parentId || null);
    setIsModalVisible(true);
  };

  // Обработчик добавления
  const handleAdd = () => {
    setEditingCategory(null);
    form.resetFields();
    setParentId(null);
    setIsModalVisible(true);
  };

  // Построение данных для TreeSelect
  const buildTreeSelectData = (categories: Category[], excludeId?: string): any[] => {
    return categories
      .filter(cat => cat._id !== excludeId)
      .map(cat => ({
        title: cat.name,
        value: cat._id,
        children: cat.children ? buildTreeSelectData(cat.children, excludeId) : []
      }));
  };

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
                <FolderOutlined style={{ marginRight: 8 }} />
                Управление категориями
              </Title>
              <Text type="secondary">
                Создавайте, редактируйте и организуйте категории товаров
              </Text>
            </div>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              size="large"
              onClick={handleAdd}
              style={{ 
                background: '#52c41a', 
                borderColor: '#52c41a',
                boxShadow: '0 2px 8px rgba(82, 196, 26, 0.3)'
              }}
            >
              Добавить категорию
            </Button>
          </div>
        }
        style={{ 
          borderRadius: '12px', 
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          border: 'none'
        }}
      >
        <Spin spinning={loading} size="large">
          <div style={{ marginTop: 16 }}>
            <Tree
              treeData={mapCategoriesToTreeData(categories)}
              draggable
              blockNode
              onDrop={onDrop}
              defaultExpandAll
              showLine
              showIcon
              titleRender={(nodeData: any) => (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '8px 0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <FolderOpenOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                    <Text strong style={{ fontSize: '14px' }}>
                      {nodeData.title}
                    </Text>
                  </div>
                  <Space size="small">
                    <Tooltip title="Просмотреть на сайте">
                      <Button 
                        type="text" 
                        icon={<EyeOutlined />} 
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          const frontendUrl = 'http://localhost:3100';
                          const categoryUrl = `${frontendUrl}/catalog/${nodeData.data.slug}`;
                          window.open(categoryUrl, '_blank');
                        }}
                        style={{ color: '#52c41a' }}
                      />
                    </Tooltip>
                    <Tooltip title="Редактировать">
                      <Button 
                        type="text" 
                        icon={<EditOutlined />} 
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(nodeData.data);
                        }}
                        style={{ color: '#1890ff' }}
                      />
                    </Tooltip>
                    <Tooltip title="Удалить">
                      <Popconfirm
                        title="Удалить категорию?"
                        description="Это действие нельзя отменить. Все подкатегории также будут удалены."
                        onConfirm={() => handleDelete(nodeData.data._id)}
                        okText="Удалить"
                        cancelText="Отмена"
                        okType="danger"
                      >
                        <Button 
                          type="text" 
                          icon={<DeleteOutlined />} 
                          size="small"
                          danger
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Popconfirm>
                    </Tooltip>
                  </Space>
                </div>
              )}
              style={{
                background: '#fff',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #f0f0f0'
              }}
            />
          </div>
        </Spin>

        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <FolderOutlined style={{ marginRight: 8, color: '#1890ff' }} />
              {editingCategory ? 'Редактировать категорию' : 'Добавить категорию'}
            </div>
          }
          open={isModalVisible}
          onCancel={() => { 
            setIsModalVisible(false); 
            setEditingCategory(null); 
            form.resetFields(); 
          }}
          onOk={() => form.submit()}
          okText={editingCategory ? 'Сохранить' : 'Добавить'}
          cancelText="Отмена"
          width={500}
          centered
        >
          <Form 
            form={form} 
            layout="vertical" 
            onFinish={handleSubmit}
            style={{ marginTop: 16 }}
          >
            <Form.Item
              name="name"
              label="Название категории"
              rules={[
                { required: true, message: 'Введите название категории' },
                { min: 2, message: 'Название должно содержать минимум 2 символа' }
              ]}
            >
              <Input 
                placeholder="Введите название категории" 
                size="large"
                prefix={<FolderOutlined style={{ color: '#bfbfbf' }} />}
              />
            </Form.Item>

            <Form.Item
              name="characteristicGroupIds"
              label="Группы характеристик"
            >
              <Select
                mode="multiple"
                placeholder="Выберите группы характеристик"
                allowClear
                showSearch
                optionFilterProp="children"
                style={{ width: '100%' }}
              >
                {characteristicGroups.map(group => (
                  <Option key={group._id} value={group._id}>{group.name}</Option>
                ))}
              </Select>
            </Form.Item>

            {!editingCategory && (
              <Form.Item label="Родительская категория">
                <TreeSelect
                  value={parentId}
                  onChange={setParentId}
                  treeData={buildTreeSelectData(categories)}
                  placeholder="Без родителя (корневая категория)"
                  allowClear
                  treeDefaultExpandAll
                  size="large"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            )}
          </Form>
        </Modal>
      </Card>
    </div>
  );
} 