import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Form, 
  Input, 
  Button, 
  Select, 
  InputNumber, 
  Switch, 
  Upload, 
  message, 
  Spin,
  Card,
  Row,
  Col,
  Divider,
  Space,
  TreeSelect,
  Modal
} from 'antd'
import { 
  SaveOutlined, 
  ArrowLeftOutlined, 
  UploadOutlined,
  DeleteOutlined,
  PlusOutlined
} from '@ant-design/icons'
import { ExternalLink as LucideExternalLink } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const { TextArea } = Input
const { Option } = Select

interface Product {
  _id: string
  name: string
  slug: string
  price: number
  costPrice?: number
  comparePrice?: number
  sku?: string
  mainImage: string
  isActive: boolean
  inStock: boolean
  stockQuantity: number
  categoryId: {
    _id: string
    name: string
  }
  description?: string
  createdAt: string
  updatedAt: string
  images?: string[]
  characteristics?: ProductCharacteristic[]
  isMainPage?: boolean;
  isPromotion?: boolean;
  isNewProduct?: boolean;
  isBestseller?: boolean;
}

interface Category {
  _id: string
  name: string
  slug: string
  parentId?: string
  children?: Category[]
}

interface CharacteristicGroup {
  _id: string;
  name: string;
}

interface Characteristic {
  _id: string;
  name: string;
  groupId: string;
  type: 'text' | 'number' | 'select' | 'boolean';
}

interface CharacteristicValueOption {
  _id: string;
  value: string;
}

interface ProductCharacteristic {
  characteristicId: string;
  value: string | number | boolean;
}

const ProductEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [product, setProduct] = useState<Product | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoadingProduct, setIsLoadingProduct] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [characteristics, setCharacteristics] = useState<Characteristic[]>([]);
  const [characteristicValues, setCharacteristicValues] = useState<{ [key: string]: CharacteristicValueOption[] }>({});
  const [productCharacteristics, setProductCharacteristics] = useState<ProductCharacteristic[]>(product?.characteristics || []);
  const [isCharModalVisible, setIsCharModalVisible] = useState(false);
  const [selectedCharacteristicId, setSelectedCharacteristicId] = useState<string | null>(null);
  const [newCharacteristicName, setNewCharacteristicName] = useState('');
  const [charValue, setCharValue] = useState('');
  const [useCustomValue, setUseCustomValue] = useState(false);
  const [isNewCharacteristic, setIsNewCharacteristic] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState('');

  // Функция для построения иерархического дерева категорий
  const buildCategoryTree = React.useCallback((categories: Category[]): Category[] => {
    // API уже возвращает дерево, поэтому просто возвращаем как есть
    if (categories.length > 0 && categories[0].children !== undefined) {
      return categories
    }
    
    // Если данные в плоском виде, строим дерево
    const categoryMap = new Map<string, Category>()
    const rootCategories: Category[] = []

    // Создаем карту всех категорий
    categories.forEach(category => {
      categoryMap.set(category._id, { ...category, children: [] })
    })

    // Строим дерево
    categories.forEach(category => {
      const categoryWithChildren = categoryMap.get(category._id)!
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId)
        if (parent) {
          parent.children!.push(categoryWithChildren)
        } else {
          // Если родитель не найден, добавляем как корневую категорию
          rootCategories.push(categoryWithChildren)
        }
      } else {
        rootCategories.push(categoryWithChildren)
      }
    })

    return rootCategories
  }, [])

  // Функция для преобразования категорий в формат TreeSelect
  const convertToTreeSelectData = React.useCallback((categories: Category[]): any[] => {
    return categories.map(category => ({
      title: (
        <span>
          {category.name}
          {category.children && category.children.length > 0 && (
            <span style={{ color: '#999', fontSize: '12px', marginLeft: 8 }}>
              ({category.children.length})
            </span>
          )}
        </span>
      ),
      value: category._id,
      key: category._id,
      children: category.children && category.children.length > 0 ? convertToTreeSelectData(category.children) : undefined,
      isLeaf: !category.children || category.children.length === 0,
      selectable: true // Позволяет выбирать как родительские, так и дочерние категории
    }))
  }, [])

  // Мемоизируем данные для TreeSelect
  const treeSelectData = React.useMemo(() => {
    return categories ? convertToTreeSelectData(buildCategoryTree(categories)) : [];
  }, [categories, convertToTreeSelectData, buildCategoryTree]);


  console.log('ProductEdit rendered, id:', id)

  // Загрузка товара
  useEffect(() => {
    console.log('Fetching product with id:', id)
    const fetchProduct = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/products/${id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        })
        if (!response.ok) throw new Error('Failed to fetch product')
        const data = await response.json()
        console.log('Product data:', data)
        setProduct(data)
      } catch (error) {
        console.error('Error fetching product:', error)
        message.error('Ошибка при загрузке товара')
      } finally {
        setIsLoadingProduct(false)
      }
    }

    if (id) {
      fetchProduct()
    }
  }, [id])

  // При загрузке товара:
  useEffect(() => {
    if (product) {
      let specialSection = 'none';
      if (product.isMainPage) specialSection = 'isMainPage';
      else if (product.isPromotion) specialSection = 'isPromotion';
      else if (product.isNewProduct) specialSection = 'isNewProduct';
      else if (product.isBestseller) specialSection = 'isBestseller';
      
      // Правильно устанавливаем ID категории для TreeSelect
      const categoryId = typeof product.categoryId === 'string' 
        ? product.categoryId 
        : product.categoryId?._id;
      
      form.setFieldsValue({
        ...product,
        categoryId: categoryId, // Явно устанавливаем ID категории
        specialSection,
      });
      setDescriptionValue(product.description || '');
      form.setFieldsValue({ description: product.description || '' });
    }
  }, [product, form]);

  // При инициализации формы:
  useEffect(() => {
    if (!product) {
      form.setFieldsValue({
        specialSection: 'none',
      });
    }
  }, [form, product]);

  // Загрузка категорий
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/categories`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        })
        if (!response.ok) throw new Error('Failed to fetch categories')
        const data = await response.json()
        setCategories(data)
      } catch (error) {
        console.error('Error fetching categories:', error)
        message.error('Ошибка при загрузке категорий')
      }
    }

    fetchCategories()
  }, [])

  // Загрузка групп и характеристик
  useEffect(() => {
    const fetchCharacteristics = async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/characteristics`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      if (response.ok) {
        response.json().then(setCharacteristics);
      }
    };
    fetchCharacteristics();
  }, []);

  // Загрузка значений для select-характеристик
  useEffect(() => {
    const fetchValues = async (charId: string) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/characteristics/${charId}/values`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      if (response.ok) {
        response.json().then(data => setCharacteristicValues(prev => ({ ...prev, [charId]: data })));
      }
    };
    characteristics.forEach(c => {
      if (!characteristicValues[c._id]) fetchValues(c._id);
    });
  }, [characteristics]);

  useEffect(() => {
    if (product && Array.isArray(product.characteristics)) {
      setProductCharacteristics(product.characteristics);
    }
  }, [product]);

  // Обновление товара
  const updateProduct = async (values: any) => {
    setIsUpdating(true)
    console.log('Updating product with values:', values);
    console.log('CategoryId being sent:', values.categoryId);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/products/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}` 
        },
        body: JSON.stringify(values)
      })
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        throw new Error('Failed to update product')
      }
      
      const updatedProduct = await response.json();
      console.log('Product updated successfully:', updatedProduct);
      
      message.success('Товар успешно обновлен')
      
      // Обновляем локальное состояние товара
      setProduct(updatedProduct);
      
      // Принудительно обновляем форму с новыми данными
      const categoryId = typeof updatedProduct.categoryId === 'string' 
        ? updatedProduct.categoryId 
        : updatedProduct.categoryId?._id;
      
      form.setFieldsValue({
        ...updatedProduct,
        categoryId: categoryId
      });
      
    } catch (error) {
      console.error('Error updating product:', error);
      message.error('Ошибка при обновлении товара')
    } finally {
      setIsUpdating(false)
    }
  }

  // Обновление изображений товара
  const updateProductImages = async (images: string[]) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ images })
      })
      if (!response.ok) throw new Error('Failed to update product images')
      console.log('Product images updated successfully');
    } catch (error) {
      console.error('Error updating product images:', error)
      message.error('Ошибка при сохранении изображений')
    }
  }

  // При сохранении товара:
  const handleSubmit = async (values: any) => {
    console.log('Form values received:', values);
    console.log('CategoryId in values:', values.categoryId);
    
    const { specialSection, ...rest } = values;
    const sectionFlags = {
      isMainPage: specialSection === 'isMainPage',
      isPromotion: specialSection === 'isPromotion',
      isNewProduct: specialSection === 'isNewProduct',
      isBestseller: specialSection === 'isBestseller',
    };
    const payload = { ...rest, ...sectionFlags };
    
    console.log('Payload being sent to server:', payload);
    console.log('CategoryId in payload:', payload.categoryId);
    
    try {
      await updateProduct({ ...payload, characteristics: productCharacteristics });
    } catch (error) {
      console.error('Error updating product:', error)
    }
  }

  const handleBack = () => {
          navigate('/admin/products')
  }

  // Добавить характеристику
  const handleAddCharacteristic = () => {
    setSelectedCharacteristicId(null);
    setNewCharacteristicName('');
    setCharValue('');
    setUseCustomValue(false);
    setIsNewCharacteristic(false);
    setIsCharModalVisible(true);
  };

  const alreadySelectedIds = productCharacteristics.map(pc => pc.characteristicId);
  const availableCharacteristics = characteristics.filter(c => !alreadySelectedIds.includes(c._id));

  const handleCharModalOk = async () => {
    if (isNewCharacteristic) {
      if (!newCharacteristicName.trim() || !charValue.trim()) {
        message.warning('Введите название и значение');
        return;
      }
      // Создать характеристику на сервере
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/characteristics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ name: newCharacteristicName })
      });
      if (!response.ok) {
        message.error('Ошибка при создании характеристики');
        return;
      }
      const data = await response.json();
      // Добавить значение к характеристике
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/characteristics/${data._id}/values`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ value: charValue, isActive: true })
      });
      setProductCharacteristics(prev => ([...prev, { characteristicId: data._id, value: charValue }]));
      setIsCharModalVisible(false);
      // Обновить список характеристик
      const updated = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/characteristics`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      if (updated.ok) setCharacteristics(await updated.json());
      return;
    }
    if (!selectedCharacteristicId) {
      message.warning('Выберите характеристику');
      return;
    }
    if (!charValue.trim()) {
      message.warning('Введите значение');
      return;
    }
    // Если пользователь выбрал 'Другое значение...' (useCustomValue), добавляем значение в базу
    if (useCustomValue) {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/characteristics/${selectedCharacteristicId}/values`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ value: charValue, isActive: true })
      });
      // Обновить список значений для этой характеристики
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/characteristics/${selectedCharacteristicId}/values`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCharacteristicValues(prev => ({ ...prev, [selectedCharacteristicId]: data }));
      }
    }
    setProductCharacteristics(prev => ([...prev, { characteristicId: selectedCharacteristicId, value: charValue }]));
    setIsCharModalVisible(false);
  };

  const handleCharModalCancel = () => {
    setIsCharModalVisible(false);
  };

  const handleCharacteristicValueChange = (index: number, value: any) => {
    setProductCharacteristics(prev => prev.map((item, i) => i === index ? { ...item, value } : item));
  };

  const handleRemoveCharacteristic = (index: number) => {
    setProductCharacteristics(prev => prev.filter((_, i) => i !== index));
  };



  // Функция для рекурсивного рендеринга опций категорий
  const renderCategoryOptions = (categories: Category[], level: number = 0): React.ReactNode[] => {
    return categories.map(category => [
      <Option key={category._id} value={category._id}>
        {'　'.repeat(level)}{category.name}
        {category.children && category.children.length > 0 && (
          <span style={{ color: '#999', fontSize: '12px' }}>
            {' '}({category.children.length})
          </span>
        )}
      </Option>,
      ...(category.children ? renderCategoryOptions(category.children, level + 1) : [])
    ]).flat()
  }

  // Функция для получения полного пути категории
  const getCategoryPath = (categoryId: string, categories: Category[]): string => {
    const findCategory = (id: string, cats: Category[]): Category | null => {
      for (const cat of cats) {
        if (cat._id === id) return cat
        if (cat.children) {
          const found = findCategory(id, cat.children)
          if (found) return found
        }
      }
      return null
    }

    const category = findCategory(categoryId, buildCategoryTree(categories))
    if (!category) return ''

    const path: string[] = []
    let current = category

    // Строим путь от корня до текущей категории
    while (current) {
      path.unshift(current.name)
      if (current.parentId) {
        current = findCategory(current.parentId, categories) || current
      } else {
        break
      }
    }

    return path.join(' → ')
  }

  // Функция для получения всех категорий в плоском виде для поиска
  const getAllCategories = (categories: Category[]): Category[] => {
    let allCategories: Category[] = []
    
    const traverse = (cats: Category[]) => {
      cats.forEach(cat => {
        allCategories.push(cat)
        if (cat.children && cat.children.length > 0) {
          traverse(cat.children)
        }
      })
    }
    
    traverse(categories)
    return allCategories
  }

  console.log('Rendering ProductEdit, isLoadingProduct:', isLoadingProduct, 'product:', product)

  if (isLoadingProduct) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
        <div style={{ marginLeft: 16 }}>Загрузка товара...</div>
      </div>
    )
  }

  if (!product) {
    return (
      <div style={{ padding: 20 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={handleBack} style={{ marginBottom: 16 }}>
          Назад к товарам
        </Button>
        <div>Товар не найден (ID: {id})</div>
      </div>
    )
  }

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
          Назад к товарам
        </Button>
      </div>

      <Card title={`Редактирование товара: ${product.name}`}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            isActive: true,
            inStock: true,
            stockQuantity: 0
          }}
        >
          <Row gutter={24}>
            <Col span={16}>
              <Form.Item
                label="Наименование товара"
                name="name"
                rules={[{ required: true, message: 'Введите наименование товара' }]}
              >
                <Input placeholder="Введите наименование товара" />
              </Form.Item>

              <Form.Item
                label="Артикул (SKU)"
                name="sku"
              >
                <Input placeholder="Введите артикул" />
              </Form.Item>

              <Form.Item
                label="Описание"
                name="description"
                valuePropName="value"
                getValueFromEvent={val => val}
              >
                <div>
                  <div style={{
                    height: expanded ? 400 : 240,
                    minHeight: 180,
                    overflowY: expanded ? 'visible' : 'auto',
                    transition: 'height 0.3s',
                    border: '1px solid #d9d9d9',
                    borderRadius: 6,
                    position: 'relative',
                    background: '#fff',
                    marginBottom: 0
                  }}>
                    <ReactQuill
                      theme="snow"
                      value={descriptionValue}
                      onChange={val => {
                        setDescriptionValue(val);
                        form.setFieldsValue({ description: val });
                      }}
                      style={{ minHeight: 160, border: 'none', height: '100%' }}
                    />
                  </div>
                  {expanded ? (
                    <div style={{ textAlign: 'right', marginTop: 48 }}>
                      <button
                        type="button"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#1890ff',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: 13
                        }}
                        onClick={() => setExpanded(false)}
                      >
                        Скрыть
                      </button>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'right', marginTop: 16 }}>
                      <button
                        type="button"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#1890ff',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: 13
                        }}
                        onClick={() => setExpanded(true)}
                      >
                        Показать полностью
                      </button>
                    </div>
                  )}
                </div>
              </Form.Item>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    label="Розничная цена"
                    name="price"
                    rules={[{ required: true, message: 'Введите цену' }]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="0"
                      formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                      parser={(value) => value!.replace(/\s?/g, '').replace(/[^\d]/g, '')}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="Старая цена"
                    name="comparePrice"
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="0"
                      formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                      parser={(value) => value!.replace(/\s?/g, '').replace(/[^\d]/g, '')}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="Закупочная цена"
                    name="costPrice"
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="0"
                      formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                      parser={(value) => value!.replace(/\s?/g, '').replace(/[^\d]/g, '')}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    label="Остаток на складе"
                    name="stockQuantity"
                    rules={[{ required: true, message: 'Введите количество' }]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      placeholder="0"
                      min={0}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="Категория"
                    name="categoryId"
                    extra="Выберите категорию или подкатегорию. Нажмите на стрелку рядом с категорией, чтобы раскрыть подкатегории. Можно выбрать как основную категорию, так и любую подкатегорию."
                  >
                    <TreeSelect
                      placeholder="Выберите категорию"
                      allowClear
                      treeData={treeSelectData}
                      treeDefaultExpandAll={false}
                      showSearch
                      filterTreeNode={(inputValue, treeNode) => {
                        const title = treeNode.title?.toString().toLowerCase() || ''
                        return title.includes(inputValue.toLowerCase())
                      }}
                      dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                      style={{ width: '100%' }}
                      treeNodeFilterProp="title"
                      showCheckedStrategy={TreeSelect.SHOW_PARENT}
                      maxTagCount={1}
                      treeNodeLabelProp="title"
                      dropdownMatchSelectWidth={false}
                      placement="bottomLeft"
                    />
                    {product?.categoryId && categories && (
                      <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                        Текущая категория: {getCategoryPath(typeof product.categoryId === 'string' ? product.categoryId : product.categoryId._id, categories)}
                      </div>
                    )}
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="Особый раздел" name="specialSection">
                <Select>
                  <Select.Option value="none">Нет</Select.Option>
                  <Select.Option value="isMainPage">Товар на главной</Select.Option>
                  <Select.Option value="isPromotion">Акция</Select.Option>
                  <Select.Option value="isNewProduct">Новинка</Select.Option>
                  <Select.Option value="isBestseller">Хит продаж</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="URL"
                name="slug"
                rules={[{ required: true, message: 'Введите URL (slug) товара' }]}
              >
                <Input placeholder="URL товара (например, apple-iphone-11-64gb-black-simesim-eu)" />
              </Form.Item>


            </Col>

            <Col span={8}>
              <Card
                title={
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Настройки</span>
                    {product && product.slug && (
                      <a
                        href={`http://localhost:3100/product/${product.slug}`}
                        className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-1 px-3 rounded-full shadow transition"
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Открыть страницу товара"
                        style={{ marginLeft: 8 }}
                      >
                        <LucideExternalLink size={16} style={{ marginRight: 4 }} />
                        Открыть товар
                      </a>
                    )}
                  </div>
                }
                size="small"
              >
                <Form.Item
                  label="Активен на сайте"
                  name="isActive"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>

                <Form.Item
                  label="В наличии"
                  name="inStock"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>

                <Divider />

                <div>
                  <h4>Изображения</h4>
                  <div style={{ marginBottom: 16 }}>
                    {product.mainImage && (
                      <img 
                        src={product.mainImage.startsWith('http') ? product.mainImage : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5002'}${product.mainImage}`}
                        alt="Главное изображение"
                        style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 4 }}
                        onError={(e) => {
                          console.error('Error loading main image:', e);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                  </div>
                  <Upload
                    listType="picture-card"
                    action={`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/upload/images`}
                    headers={{
                      'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
                    }}
                    data={(file) => {
                      console.log('Upload data function called with file:', file);
                      return {};
                    }}
                    customRequest={({ file, onSuccess, onError, onProgress }) => {
                      console.log('Custom request called with file:', file);
                      
                      const formData = new FormData();
                      formData.append('file', file);
                      
                      const xhr = new XMLHttpRequest();
                      
                      xhr.upload.addEventListener('progress', (e) => {
                        if (e.lengthComputable) {
                          const percent = Math.round((e.loaded / e.total) * 100);
                          console.log('Upload progress:', percent);
                          onProgress?.({ percent });
                        }
                      });
                      
                      xhr.addEventListener('load', () => {
                        console.log('XHR load event, status:', xhr.status);
                        console.log('XHR response:', xhr.responseText);
                        
                        if (xhr.status === 200) {
                          try {
                            const response = JSON.parse(xhr.responseText);
                            console.log('Parsed response:', response);
                            
                                                        // Принудительно обновляем состояние продукта
                            const newImageUrl = response.files?.[0]?.url || response.file?.url;
                            if (newImageUrl) {
                              // Добавляем полный URL для изображения
                              const fullImageUrl = newImageUrl.startsWith('http') 
                                ? newImageUrl 
                                : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5002'}${newImageUrl}`;
                              const updatedImages = [...(product?.images || []), fullImageUrl];
                              setProduct(prev => prev ? { ...prev, images: updatedImages } : null);
                              
                              // Сохраняем изменения в базе данных
                              updateProductImages(updatedImages);
                              
                              message.success('Изображение загружено успешно');
                            }
                            
                            onSuccess?.(response);
                            setUploadingImages(false);
                          } catch (error) {
                            console.error('Error parsing response:', error);
                            onError?.(error as Error);
                          }
                        } else {
                          console.error('Upload failed with status:', xhr.status);
                          setUploadingImages(false);
                          onError?.(new Error(`Upload failed: ${xhr.status}`));
                        }
                      });
                      
                      xhr.addEventListener('error', () => {
                        console.error('XHR error event');
                        setUploadingImages(false);
                        onError?.(new Error('Network error'));
                      });
                      
                      xhr.open('POST', `${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/upload/images`);
                      xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('admin_token')}`);
                      
                      xhr.send(formData);
                    }}
                    beforeUpload={(file) => {
                      console.log('Before upload:', file);
                      console.log('File size:', file.size);
                      console.log('File type:', file.type);
                      console.log('File name:', file.name);
                      return true;
                    }}
                    fileList={product.images?.map((img: string, index: number) => ({
                      uid: index.toString(),
                      name: `image-${index}`,
                      status: 'done',
                      url: img.startsWith('http') ? img : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5002'}${img}`,
                      thumbUrl: img.startsWith('http') ? img : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5002'}${img}`
                    })) || []}
                    onChange={(info) => {
                      console.log('Upload onChange:', info);
                      console.log('File status:', info.file.status);
                      console.log('File response:', info.file.response);
                      console.log('File error:', info.file.error);
                      console.log('File percent:', info.file.percent);
                      
                      if (info.file.status === 'uploading') {
                        setUploadingImages(true);
                        console.log('Upload started, percent:', info.file.percent);
                      } else if (info.file.status === 'done') {
                        setUploadingImages(false);
                        console.log('Upload completed, response:', info.file.response);
                        // Добавляем новое изображение к списку
                        const newImageUrl = info.file.response?.files?.[0]?.url || info.file.response?.file?.url;
                        console.log('New image URL:', newImageUrl);
                        if (newImageUrl) {
                          const updatedImages = [...(product?.images || []), newImageUrl];
                          setProduct(prev => prev ? { ...prev, images: updatedImages } : null);
                          message.success('Изображение загружено успешно');
                        } else {
                          console.error('Response structure:', info.file.response);
                          message.error('Не удалось получить URL загруженного изображения');
                        }
                      } else if (info.file.status === 'removed') {
                        console.log('File removed:', info.file);
                      } else if (info.file.status === 'error') {
                        setUploadingImages(false);
                        console.error('Upload error:', info.file.error);
                        message.error(`Ошибка при загрузке изображения: ${info.file.error?.message || 'Неизвестная ошибка'}`);
                      } else {
                        console.log('Unknown file status:', info.file.status);
                        console.log('Full file info:', info.file);
                      }
                    }}
                    onRemove={(file) => {
                      // Удаляем изображение из списка
                      const updatedImages = product?.images?.filter(img => img !== file.url) || [];
                      setProduct(prev => prev ? { ...prev, images: updatedImages } : null);
                    }}
                    disabled={uploadingImages}
                  >
                    <div>
                      {uploadingImages ? <Spin size="small" /> : <PlusOutlined />}
                      <div style={{ marginTop: 8 }}>
                        {uploadingImages ? 'Загрузка...' : 'Добавить'}
                      </div>
                    </div>
                  </Upload>
                </div>
              </Card>
            </Col>
          </Row>

          <Divider />

          <h3>Характеристики товара</h3>
          <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddCharacteristic} style={{ marginBottom: 12 }}>
            Добавить характеристику
          </Button>
          {productCharacteristics.length === 0 && <div style={{ color: '#888', marginBottom: 12 }}>Нет добавленных характеристик</div>}
          {productCharacteristics.map((item, idx) => {
            const char = characteristics.find(c => c._id === item.characteristicId);
            if (!char) return null;
            const values = characteristicValues[char._id] || [];
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ minWidth: 180, fontWeight: 500 }}>{char.name}</span>
                {values.length > 0 ? (
                  <Select
                    style={{ width: 200, marginLeft: 8 }}
                    value={item.value}
                    onChange={v => handleCharacteristicValueChange(idx, v)}
                    popupRender={menu => (
                      <>
                        {menu}
                        <div style={{ padding: 8, borderTop: '1px solid #eee' }}>
                          <Button type="link" style={{ padding: 0 }} onClick={() => handleCharacteristicValueChange(idx, '')}>
                            + Другое значение...
                          </Button>
                        </div>
                      </>
                    )}
                  >
                    {values.map(opt => (
                      <Option key={opt.value} value={opt.value}>{opt.value}</Option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    style={{ width: 200, marginLeft: 8 }}
                    value={item.value as string}
                    onChange={e => handleCharacteristicValueChange(idx, e.target.value)}
                  />
                )}
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemoveCharacteristic(idx)} />
              </div>
            );
          })}

          <Modal
            title="Добавить характеристику"
            open={isCharModalVisible}
            onOk={handleCharModalOk}
            onCancel={handleCharModalCancel}
            okText="Добавить"
            cancelText="Отмена"
          >
            <div style={{ marginBottom: 12 }}>
              <div style={{ marginBottom: 8 }}>
                <Select
                  showSearch
                  allowClear
                  style={{ width: '100%' }}
                  placeholder="Выберите характеристику или создайте новую"
                  value={isNewCharacteristic ? undefined : selectedCharacteristicId}
                  onChange={val => {
                    setSelectedCharacteristicId(val);
                    setIsNewCharacteristic(false);
                    setCharValue('');
                    setUseCustomValue(false);
                  }}
                  popupRender={menu => (
                    <>
                      {menu}
                      <div style={{ padding: 8, borderTop: '1px solid #eee' }}>
                        <Button type="link" style={{ padding: 0 }} onClick={() => {
                          setIsNewCharacteristic(true);
                          setSelectedCharacteristicId(null);
                          setCharValue('');
                          setUseCustomValue(false);
                        }}>
                          + Создать новую характеристику
                        </Button>
                      </div>
                    </>
                  )}
                >
                  {availableCharacteristics.map(char => (
                    <Option key={char._id} value={char._id}>{char.name}</Option>
                  ))}
                </Select>
              </div>
              {isNewCharacteristic && (
                <>
                  <Input
                    placeholder="Название новой характеристики"
                    style={{ marginBottom: 8 }}
                    value={newCharacteristicName}
                    onChange={e => setNewCharacteristicName(e.target.value)}
                  />
                  <Input
                    placeholder="Значение"
                    value={charValue}
                    onChange={e => setCharValue(e.target.value)}
                  />
                </>
              )}
              {!isNewCharacteristic && selectedCharacteristicId && (() => {
                const char = characteristics.find(c => c._id === selectedCharacteristicId);
                const values = (characteristicValues[char?._id || ''] || []);
                if (values.length > 0) {
                  return (
                    <>
                      <Select
                        style={{ width: '100%', marginBottom: 8 }}
                        placeholder="Выберите значение или добавьте своё"
                        value={useCustomValue ? undefined : charValue}
                        onChange={val => {
                          if (val === '__custom__') {
                            setUseCustomValue(true);
                            setCharValue('');
                          } else {
                            setUseCustomValue(false);
                            setCharValue(val);
                          }
                        }}
                      >
                        {values.map(opt => (
                          <Option key={opt.value} value={opt.value}>{opt.value}</Option>
                        ))}
                        <Option value="__custom__">+ Другое значение...</Option>
                      </Select>
                      {useCustomValue && (
                        <Input
                          placeholder="Введите своё значение"
                          value={charValue}
                          onChange={e => setCharValue(e.target.value)}
                        />
                      )}
                    </>
                  );
                }
                return (
                  <Input
                    placeholder="Значение"
                    value={charValue}
                    onChange={e => setCharValue(e.target.value)}
                  />
                );
              })()}
            </div>
          </Modal>

          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                icon={<SaveOutlined />}
                loading={isUpdating}
              >
                Сохранить изменения
              </Button>
              <Button onClick={handleBack}>
                Отмена
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
      {product && product.slug && (
        <a
          href={`http://localhost:3100/product/${product.slug}`}
          className="absolute top-4 left-4 flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-full shadow-lg transition z-20"
          target="_blank"
          rel="noopener noreferrer"
          title="Открыть страницу товара"
        >
          <LucideExternalLink size={18} />
          Открыть товар
        </a>
      )}
    </div>
  )
}

export default ProductEdit 