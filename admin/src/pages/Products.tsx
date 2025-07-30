import React, { useState, useEffect, useRef } from 'react'
import { 
  Table, Button, Space, Tag, Image, Modal, message, Form, Input, InputNumber, 
  Tree, Menu, Dropdown, Card, Typography, Spin, Row, Col, Checkbox, Tooltip,
  Select, Divider, TreeSelect, Upload, Progress
} from 'antd'
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, FolderOpenOutlined, 
  FolderAddOutlined, FolderOutlined, SaveOutlined, SearchOutlined, 
  ShoppingOutlined, HomeOutlined, StarOutlined, TrophyOutlined, 
  PercentageOutlined, InboxOutlined, EyeInvisibleOutlined, CopyOutlined,
  CheckCircleOutlined, CloseCircleOutlined, DownOutlined, DownloadOutlined, FileExcelOutlined, FileTextOutlined, UploadOutlined
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import * as XLSX from 'xlsx';

interface Category {
  _id: string
  name: string
  slug: string
  parentId?: string
  children?: Category[]
}

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
  characteristics?: {
    characteristicId: string;
    value: string;
  }[];
}

interface QuickFilter {
  key: string
  name: string
  icon: React.ReactNode
  count: number
  filter: (products: Product[]) => Product[]
}

interface SpecialSection {
  key: string
  name: string
  icon: React.ReactNode
  count: number
  filter: (products: Product[]) => Product[]
}

// 1. Добавляем загрузку characteristics (id+name)
interface Characteristic {
  _id: string;
  name: string;
}

const Products: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [categoryTree, setCategoryTree] = useState<Category[]>([])
  const [categoryContext, setCategoryContext] = useState<{visible: boolean, x: number, y: number, category: Category | null}>({visible: false, x: 0, y: 0, category: null})
  const [categoryEditModal, setCategoryEditModal] = useState<{visible: boolean, category: Category | null, mode: 'edit' | 'add' | null}>({visible: false, category: null, mode: null})
  const [categoryName, setCategoryName] = useState('')
  const [moveCategoryModal, setMoveCategoryModal] = useState<{visible: boolean, category: Category | null}>({visible: false, category: null})
  const [selectedTargetCategory, setSelectedTargetCategory] = useState<string>('')
  
  // Модальное окно редактирования товара
  const [productEditModal, setProductEditModal] = useState<{visible: boolean, product: Product | null}>({visible: false, product: null})
  const [isLoadingTree, setIsLoadingTree] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingProduct, setEditingProduct] = useState<string | null>(null)
  const [editingValues, setEditingValues] = useState<{[key: string]: any}>({})
  const queryClient = useQueryClient()

  // 1. Добавляем загрузку characteristics (id+name)
  const [characteristics, setCharacteristics] = useState<Characteristic[]>([]);
  const [manualCharacteristicNames, setManualCharacteristicNames] = useState<{ [col: string]: string }>({});

  // Получение категорий (дерево)
  const { data: categories, refetch: refetchCategories } = useQuery<Category[]>('categories', async () => {
    setIsLoadingTree(true)
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/categories`)
    setIsLoadingTree(false)
    if (!response.ok) throw new Error('Failed to fetch categories')
    const data = await response.json()
    console.log('Loaded categories for Products:', data)
    console.log('Categories structure:', data.map((cat: Category) => ({ id: cat._id, name: cat.name, parentId: cat.parentId, hasChildren: !!cat.children })))
    return data
  })

  useEffect(() => {
    if (categories) setCategoryTree(categories)
  }, [categories])

  useEffect(() => {
    const fetchCharacteristics = async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}/characteristics`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      if (response.ok) {
        setCharacteristics(await response.json());
      }
    };
    fetchCharacteristics();
  }, []);

  // --- Пагинация и лимит ---
  const LIMIT_OPTIONS = [10, 20, 50, 100, 200, 0];
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(() => {
    const saved = localStorage.getItem('products_page_size');
    return saved ? Number(saved) : 20;
  });
  useEffect(() => {
    localStorage.setItem('products_page_size', String(pageSize));
  }, [pageSize]);

  // --- Новое состояние для хранения данных по фильтру ---
  const [filterParams, setFilterParams] = useState<any>({});
  const { data: productsData, isLoading } = useQuery(['products', pageSize, filterParams], async () => {
    const limit = pageSize === 0 ? 100000 : pageSize;
    let url = `${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/products?limit=${limit}&admin=true`;
    // Добавляем параметры фильтра
    Object.entries(filterParams).forEach(([key, value]) => {
      url += `&${key}=${value}`;
    });
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch products');
    return response.json();
  });
  const products = productsData?.products || [];

  // --- Обработка клика по фильтру ---
  const handleFilterClick = (filterKey: string) => {
    setSelectedFilter(filterKey);
    let params: any = {};
    if (filterKey === 'no-category') params = { category: 'none' };
    else if (filterKey === 'out-of-stock') params = { stockQuantity: 0 };
    else if (filterKey === 'in-stock') params = { stockQuantity_gt: 0 };
    else if (filterKey === 'no-images') params = { noImages: 1 };
    else if (filterKey === 'with-images') params = { withImages: 1 };
    else if (filterKey === 'hidden') params = { isActive: false };
    else if (filterKey === 'visible') params = { isActive: true };
    else if (filterKey === 'isMainPage') params = { isMainPage: 1 };
    else if (filterKey === 'isPromotion') params = { isPromotion: 1 };
    else if (filterKey === 'isNewProduct') params = { isNewProduct: 1 };
    else if (filterKey === 'isBestseller') params = { isBestseller: 1 };
    else if (filterKey === 'duplicates') params = { duplicates: 1 };
    setFilterParams(params);
    setPage(1);
  };

  // --- Фильтрация товаров ---
  const getFilteredProducts = () => {
    let filtered = products

    // Поиск
    if (searchQuery) {
      filtered = filtered.filter((p: Product) => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Категория - приоритет над фильтрами
    if (selectedCategory) {
      filtered = filtered.filter((p: Product) => p.categoryId?._id === selectedCategory)
    }

    return filtered
  }

  // --- После объявления getFilteredProducts ---
  const filteredProducts = getFilteredProducts();
  const totalProducts = productsData?.totalCount || filteredProducts.length;
  const totalPages = pageSize === 0 ? 1 : Math.ceil(totalProducts / pageSize);

  // Получение товаров для фильтрации (с учетом выбранной категории)
  const getProductsForFiltering = () => {
    if (selectedCategory) {
      return products.filter((p: Product) => p.categoryId?._id === selectedCategory)
    }
    return products
  }

  // --- Состояния для асинхронных фильтров ---
  const [noCategoryCount, setNoCategoryCount] = useState(0);
  const [outOfStockCount, setOutOfStockCount] = useState(0);
  const [inStockCount, setInStockCount] = useState(0);
  const [noImagesCount, setNoImagesCount] = useState(0);
  const [withImagesCount, setWithImagesCount] = useState(0);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/products?category=none&limit=1&admin=true`)
      .then(res => res.json())
      .then(data => setNoCategoryCount(data.totalCount || 0));
    fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/products?stockQuantity=0&limit=1&admin=true`)
      .then(res => res.json())
      .then(data => setOutOfStockCount(data.totalCount || 0));
    fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/products?stockQuantity_gt=0&limit=1&admin=true`)
      .then(res => res.json())
      .then(data => setInStockCount(data.totalCount || 0));
    fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/products?noImages=1&limit=1&admin=true`)
      .then(res => res.json())
      .then(data => setNoImagesCount(data.totalCount || 0));
    fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/products?withImages=1&limit=1&admin=true`)
      .then(res => res.json())
      .then(data => setWithImagesCount(data.totalCount || 0));
    fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/products?isActive=false&limit=1&admin=true`)
      .then(res => res.json())
      .then(data => setHiddenCount(data.totalCount || 0));
    fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/products?isActive=true&limit=1&admin=true`)
      .then(res => res.json())
      .then(data => setVisibleCount(data.totalCount || 0));
  }, []);

  // --- Получение общего количества всех товаров для фильтра 'Все товары' ---
  const { data: productsDataAll } = useQuery(['products', 'all-count'], async () => {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/products?limit=1&admin=true`);
    if (!response.ok) throw new Error('Failed to fetch all products count');
    return response.json();
  });

  // Быстрые фильтры - показывают количество для всех товаров на сайте
  const quickFilters: QuickFilter[] = [
    {
      key: 'all',
      name: 'Все товары',
      icon: <SearchOutlined />, 
      count: productsDataAll?.totalCount || 0,
      filter: (products: Product[]) => products
    },
    {
      key: 'no-category',
      name: 'Товары без категорий',
      icon: <FolderOutlined />, 
      count: noCategoryCount,
      filter: (products: Product[]) => products.filter((p: Product) => !p.categoryId?._id)
    },
    {
      key: 'out-of-stock',
      name: 'Закончившиеся товары',
      icon: <CloseCircleOutlined />, 
      count: outOfStockCount,
      filter: (products: Product[]) => products.filter((p: Product) => p.stockQuantity <= 0)
    },
    {
      key: 'in-stock',
      name: 'Товары в наличии',
      icon: <CheckCircleOutlined />, 
      count: inStockCount,
      filter: (products: Product[]) => products.filter((p: Product) => p.stockQuantity > 0)
    },
    {
      key: 'no-images',
      name: 'Товары без изображений',
      icon: <Image />, 
      count: noImagesCount,
      filter: (products: Product[]) => products.filter((p: Product) => (!p.mainImage || p.mainImage === 'placeholder.jpg') && (!p.images || p.images.length === 0))
    },
    {
      key: 'with-images',
      name: 'Товары с изображениями',
      icon: <Image />, 
      count: withImagesCount,
      filter: (products: Product[]) => products.filter((p: Product) => (p.mainImage && p.mainImage !== 'placeholder.jpg') || (p.images && p.images.length > 0))
    },
    {
      key: 'hidden',
      name: 'Товары, скрытые на сайте',
      icon: <EyeInvisibleOutlined />, 
      count: hiddenCount,
      filter: (products: Product[]) => products.filter((p: Product) => !p.isActive)
    },
    {
      key: 'visible',
      name: 'Товары, видимые на сайте',
      icon: <EyeOutlined />, 
      count: visibleCount,
      filter: (products: Product[]) => products.filter((p: Product) => p.isActive)
    },
    {
      key: 'duplicates',
      name: 'Повторяющиеся названия',
      icon: <CopyOutlined />, 
      count: 0, // Для дублей нужна отдельная серверная логика
      filter: (products: Product[]) => products // убрать локальную фильтрацию
    }
  ]

  // --- Состояния для specialSections ---
  const [promotionsCount, setPromotionsCount] = useState(0);
  const [mainPageCount, setMainPageCount] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [bestsellersCount, setBestsellersCount] = useState(0);
  const [databaseCount, setDatabaseCount] = useState(0);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/products?promotions=1&limit=1&admin=true`)
      .then(res => res.json())
      .then(data => setPromotionsCount(data.totalCount || 0));
    fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/products?isMainPage=1&limit=1&admin=true`)
      .then(res => res.json())
      .then(data => setMainPageCount(data.totalCount || 0));
    fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/products?new=1&limit=1&admin=true`)
      .then(res => res.json())
      .then(data => setNewCount(data.totalCount || 0));
    fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/products?bestsellers=1&limit=1&admin=true`)
      .then(res => res.json())
      .then(data => setBestsellersCount(data.totalCount || 0));
    fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/products?isFromDatabase=1&limit=1&admin=true`)
      .then(res => res.json())
      .then(data => setDatabaseCount(data.totalCount || 0));
  }, []);

  const specialSections: SpecialSection[] = [
    {
      key: 'database',
      name: 'База',
      icon: <InboxOutlined />, 
      count: databaseCount,
      filter: (products: Product[]) => products
    },
    {
      key: 'promotions',
      name: 'Акции',
      icon: <PercentageOutlined />, 
      count: promotionsCount,
      filter: (products: Product[]) => products
    },
    {
      key: 'main-page',
      name: 'Товары на главной',
      icon: <HomeOutlined />, 
      count: mainPageCount,
      filter: (products: Product[]) => products
    },
    {
      key: 'new',
      name: 'Новинки',
      icon: <StarOutlined />, 
      count: newCount,
      filter: (products: Product[]) => products
    },
    {
      key: 'bestsellers',
      name: 'Хиты продаж',
      icon: <TrophyOutlined />, 
      count: bestsellersCount,
      filter: (products: Product[]) => products
    }
  ];

  // --- Обработка клика по specialSection ---
  const handleSpecialSectionClick = (sectionKey: string) => {
    setSelectedFilter(sectionKey);
    let params: any = {};
    if (sectionKey === 'database') params = { isFromDatabase: 1 };
    else if (sectionKey === 'promotions') params = { promotions: 1 };
    else if (sectionKey === 'main-page') params = { isMainPage: 1 };
    else if (sectionKey === 'new') params = { new: 1 };
    else if (sectionKey === 'bestsellers') params = { bestsellers: 1 };
    setFilterParams(params);
    setPage(1);
  };

  // --- Категории CRUD ---
  const createCategory = async (name: string, parentId?: string) => {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
      body: JSON.stringify({ name, parentId })
    })
    if (!response.ok) throw new Error('Failed to create category')
    await refetchCategories()
    message.success('Категория добавлена')
  }
  const updateCategory = async (id: string, name: string) => {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
      body: JSON.stringify({ name })
    })
    if (!response.ok) throw new Error('Failed to update category')
    await refetchCategories()
    message.success('Категория переименована')
  }

  const updateCategoryParent = async (id: string, parentId?: string) => {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
      body: JSON.stringify({ parentId })
    })
    if (!response.ok) throw new Error('Failed to update category parent')
  }
  const deleteCategory = async (id: string) => {
    Modal.confirm({
      title: 'Удалить категорию?',
      content: 'Все товары останутся, но категория будет удалена.',
      okText: 'Удалить',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: async () => {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/categories/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        })
        if (!response.ok) throw new Error('Failed to delete category')
        await refetchCategories()
        message.success('Категория удалена')
      }
    })
  }

  const moveCategory = async (categoryId: string, newParentId?: string) => {
    try {
      console.log('Moving category:', categoryId, 'to parent:', newParentId)
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/categories/${categoryId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}` 
        },
        body: JSON.stringify({ parentId: newParentId })
      })
      if (!response.ok) throw new Error('Failed to move category')
      
      message.success('Категория перемещена')
      refetchCategories()
    } catch (error) {
      console.error('Error moving category:', error)
      message.error('Ошибка при перемещении категории')
    }
  }

  // --- Контекстное меню категорий ---
  const handleCategoryRightClick = (info: any) => {
    info.event.preventDefault()
    info.event.stopPropagation()
    
    // Находим полную информацию о категории по ID
    const categoryId = info.node.key
    const fullCategory = findCategoryById(categoryTree, categoryId)
    
    // Показываем контекстное меню для этой категории
    setCategoryContext({
      visible: true,
      x: 0,
      y: 0,
      category: fullCategory
    })
  }

  // --- Drag & Drop для категорий ---
  const handleCategoryDrop = async (info: any) => {
    const dropKey = info.node.key
    const dragKey = info.dragNode.key
    const dropPos = info.node.pos
    const dropToGap = info.dropToGap

    // Находим категории
    const dragCategory = findCategoryById(categoryTree, dragKey)
    const dropCategory = findCategoryById(categoryTree, dropKey)

    if (!dragCategory || !dropCategory) return

    // Проверяем, что не пытаемся переместить категорию в саму себя
    if (dragCategory._id === dropCategory._id) {
      message.warning('Нельзя переместить категорию в саму себя')
      return
    }

    // Проверяем, что не пытаемся переместить родителя в его дочерний элемент
    if (isDescendant(dragCategory, dropCategory)) {
      message.warning('Нельзя переместить родительскую категорию в дочернюю')
      return
    }

    // Определяем новую позицию
    let newParentId: string | undefined

    if (dropToGap) {
      // Бросаем между элементами (на том же уровне)
      const dropPosArray = dropPos.split('-')
      const dropLevel = dropPosArray.length - 1
      
      if (dropLevel === 0) {
        // Бросаем на корневой уровень
        newParentId = undefined
      } else {
        // Бросаем на тот же уровень, что и dropCategory
        newParentId = dropCategory.parentId
      }
    } else {
      // Бросаем внутрь элемента (делаем дочерней)
      newParentId = dropCategory._id
    }

    try {
      // Обновляем категорию на сервере
      await updateCategoryParent(dragCategory._id, newParentId)
      
      // Обновляем локальное состояние
      await refetchCategories()
      
      message.success('Категория успешно перемещена')
    } catch (error) {
      console.error('Ошибка при перемещении категории:', error)
      message.error('Ошибка при перемещении категории')
    }
  }

  // Функция для проверки, является ли одна категория потомком другой
  const isDescendant = (parent: Category, child: Category): boolean => {
    if (!parent.children) return false
    
    for (const childCategory of parent.children) {
      if (childCategory._id === child._id) return true
      if (isDescendant(childCategory, child)) return true
    }
    
    return false
  }

  // Функция для поиска узла по позиции
  const findNodeByPos = (categories: Category[], pos: string): Category | null => {
    const posArray = pos.split('-').map(Number)
    let current = categories
    
    for (let i = 0; i < posArray.length; i++) {
      const index = posArray[i]
      if (index >= 0 && index < current.length) {
        if (i === posArray.length - 1) {
          return current[index]
        }
        current = current[index].children || []
      }
    }
    return null
  }

  // Функция для поиска категории по ID
  const findCategoryById = (categories: Category[], id: string): Category | null => {
    for (const category of categories) {
      if (category._id === id) {
        return category
      }
      if (category.children) {
        const found = findCategoryById(category.children, id)
        if (found) return found
      }
    }
    return null
  }

  // Функция для построения иерархического дерева категорий
  const buildCategoryTree = (categories: Category[]): Category[] => {
    console.log('Building tree from categories:', categories)
    
    // Проверяем, если данные уже в виде дерева
    if (categories.length > 0 && categories[0].children !== undefined) {
      console.log('Categories already have tree structure')
      return categories
    }
    
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
        }
      } else {
        rootCategories.push(categoryWithChildren)
      }
    })

    console.log('Built tree with root categories:', rootCategories.length)
    console.log('Root categories:', rootCategories.map(cat => ({ id: cat._id, name: cat.name, childrenCount: cat.children?.length || 0 })))
    return rootCategories
  }

  // Функция для рекурсивного рендеринга опций категорий
  const renderCategoryOptions = (categories: Category[], level: number = 0): React.ReactNode[] => {
    console.log('Rendering category options at level', level, 'categories count:', categories.length)
    const options = categories.map(category => [
      <Select.Option key={category._id} value={category._id}>
        {'　'.repeat(level)}{category.name}
        {category.children && category.children.length > 0 && (
          <span style={{ color: '#999', fontSize: '12px' }}>
            {' '}({category.children.length})
          </span>
        )}
      </Select.Option>,
      ...(category.children ? renderCategoryOptions(category.children, level + 1) : [])
    ]).flat()
    console.log('Generated options at level', level, 'count:', options.length)
    return options
  }

  // Функция для преобразования категорий в формат TreeSelect
  const convertToTreeSelectData = (categories: Category[]): any[] => {
    console.log('Converting categories to TreeSelect data:', categories.length, 'categories')
    const result = categories.map(category => ({
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
      children: category.children && category.children.length > 0 ? convertToTreeSelectData(category.children) : undefined
    }))
    console.log('Converted TreeSelect data:', result.length, 'items')
    return result
  }


  // Закрытие контекстного меню при клике вне его
  useEffect(() => {
    const handleClickOutside = () => {
      if (categoryContext.visible) {
        setCategoryContext({ ...categoryContext, visible: false })
      }
    }
    
    if (categoryContext.visible) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [categoryContext.visible])

  // Переместить useEffect автоопределения columnMapping ниже объявления importData и columnMapping
  const [importData, setImportData] = useState<any[][]>([]);
  const [columnMapping, setColumnMapping] = useState<{ [col: string]: string }>({});

  useEffect(() => {
    if (!characteristics.length || !importData.length) return;
    setColumnMapping(prev => {
      const updated = { ...prev };
      Object.keys(prev).forEach((col) => {
        const isValueCol = /^значение\s*\d+$/i.test(col.trim());
        if (isValueCol && !prev[col]) {
          const allCols = Object.keys(prev);
          const n = col.match(/\d+/)?.[0];
          const normalize = (str: string) => str.toLowerCase().replace(/[^a-zа-я0-9]/gi, '');
          const charColIdx = allCols.findIndex(c => normalize(c) === `характеристика${n}`);
          let charName = '';
          if (charColIdx !== -1 && importData.length > 0) {
            for (let i = 0; i < importData.length; i++) {
              const val = (importData[i][charColIdx] || '').trim();
              if (val) { charName = val; break; }
            }
          }
          if (charName) {
            // Сравниваем с characteristics
            const foundChar = characteristics.find(c => normalize(c.name) === normalize(charName));
            if (foundChar) {
              updated[col] = `char_${foundChar._id}`;
            } else {
              updated[col] = 'auto';
            }
          }
        }
      });
      return updated;
    });
  }, [characteristics, importData]);


  // --- Рендер дерева категорий ---
  const renderTreeNodes = (data: Category[]): any[] =>
    data.map(item => ({
      title: (
        <span style={{ fontSize: 13, fontWeight: selectedCategory === item._id ? 700 : 400 }}>
          <FolderOutlined style={{ marginRight: 6 }} />
          {item.name}
        </span>
      ),
      key: item._id,
      children: item.children ? renderTreeNodes(item.children) : undefined
    }))

  // --- Категория модалка ---
  const handleCategoryEditOk = async () => {
    if (categoryEditModal.mode === 'edit' && categoryEditModal.category) {
      await updateCategory(categoryEditModal.category._id, categoryName)
    } else if (categoryEditModal.mode === 'add' && categoryEditModal.category) {
      await createCategory(categoryName, categoryEditModal.category._id)
    }
    setCategoryEditModal({ visible: false, category: null, mode: null })
    setCategoryName('')
  }

  // --- Инлайн-редактирование товаров ---
  const handleEditStart = (productId: string, field: string, value: any) => {
    setEditingProduct(productId)
    setEditingValues({ [field]: value })
  }

  const handleEditSave = async (productId: string, field: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/products/${productId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}` 
        },
        body: JSON.stringify({ [field]: editingValues[field] })
      })
      if (!response.ok) throw new Error('Failed to update product')
      
      message.success('Товар обновлен')
      queryClient.invalidateQueries('products')
      setEditingProduct(null)
      setEditingValues({})
    } catch (error) {
      message.error('Ошибка при обновлении товара')
    }
  }

  const handleEditCancel = () => {
    setEditingProduct(null)
    setEditingValues({})
  }

  // --- Таблица товаров ---
  const columns = [
    {
      title: 'Изображение',
      dataIndex: 'images',
      key: 'images',
      width: 60,
      render: (_: any, record: Product) => {
        const imageUrl = record.images?.[0] || record.mainImage;
        const fullImageUrl = imageUrl ? 
          (imageUrl.startsWith('http') ? imageUrl : `${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt'}${imageUrl}`) 
          : undefined;
        return (
          <Image 
            width={40} 
            height={40}
            src={fullImageUrl} 
            preview={false} 
            style={{ borderRadius: 4, objectFit: 'cover' }}
            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN"
          />
        );
      },
      sorter: (a: Product, b: Product) => {
        const aHas = (a.images && a.images.length > 0) || a.mainImage;
        const bHas = (b.images && b.images.length > 0) || b.mainImage;
        return (aHas ? 1 : 0) - (bHas ? 1 : 0);
      },
    },
    {
      title: 'Артикул',
      dataIndex: 'sku',
      key: 'sku',
      width: 80,
      render: (sku: string) => <span style={{ fontSize: 12 }}>{sku || '-'}</span>
    },
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string, record: Product) => (
        <span 
          style={{ 
            fontSize: 12, 
            fontWeight: 500, 
            cursor: 'pointer',
            color: '#1890ff',
            textDecoration: 'underline',
            padding: '2px 4px',
            borderRadius: 2
          }}
          onClick={() => {
            // Переход в полноценный редактор товара
            window.open(`/admin/products/${record._id}/edit`, '_blank')
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#40a9ff'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#1890ff'}
        >
          {text}
        </span>
      )
    },
    {
      title: 'Остаток',
      dataIndex: 'stockQuantity',
      key: 'stockQuantity',
      width: 80,
      render: (quantity: number, record: Product) => {
        const isEditing = editingProduct === record._id && editingValues.hasOwnProperty('stockQuantity')
        return isEditing ? (
          <InputNumber
            size="small"
            value={editingValues.stockQuantity}
            onChange={(value) => setEditingValues({ ...editingValues, stockQuantity: value })}
            onPressEnter={() => handleEditSave(record._id, 'stockQuantity')}
            onBlur={() => handleEditSave(record._id, 'stockQuantity')}
            autoFocus
            style={{ width: 60 }}
          />
        ) : (
          <span 
            style={{ cursor: 'pointer', padding: '2px 4px', borderRadius: 2 }}
            onClick={() => handleEditStart(record._id, 'stockQuantity', quantity)}
          >
            {quantity}
          </span>
        )
      },
      sorter: (a: Product, b: Product) => (a.stockQuantity || 0) - (b.stockQuantity || 0),
    },
    {
      title: 'Розница, рублей',
      dataIndex: 'price',
      key: 'price',
      width: 120,
      render: (price: number, record: Product) => {
        const isEditing = editingProduct === record._id && editingValues.hasOwnProperty('price')
        return isEditing ? (
          <InputNumber
            size="small"
            value={editingValues.price}
            onChange={(value) => setEditingValues({ ...editingValues, price: value })}
            onPressEnter={() => handleEditSave(record._id, 'price')}
            onBlur={() => handleEditSave(record._id, 'price')}
            autoFocus
            style={{ width: 80 }}
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
          />
        ) : (
          <span 
            style={{ cursor: 'pointer', padding: '2px 4px', borderRadius: 2 }}
            onClick={() => handleEditStart(record._id, 'price', price)}
          >
            {price.toLocaleString()}
          </span>
        )
      },
      sorter: (a: Product, b: Product) => (a.price || 0) - (b.price || 0),
    },
    {
      title: 'Старая цена, рублей',
      dataIndex: 'comparePrice',
      key: 'comparePrice',
      width: 120,
      render: (comparePrice: number, record: Product) => {
        const isEditing = editingProduct === record._id && editingValues.hasOwnProperty('comparePrice')
        return isEditing ? (
          <InputNumber
            size="small"
            value={editingValues.comparePrice}
            onChange={(value) => setEditingValues({ ...editingValues, comparePrice: value })}
            onPressEnter={() => handleEditSave(record._id, 'comparePrice')}
            onBlur={() => handleEditSave(record._id, 'comparePrice')}
            autoFocus
            style={{ width: 80 }}
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
          />
        ) : (
          <span 
            style={{ cursor: 'pointer', padding: '2px 4px', borderRadius: 2 }}
            onClick={() => handleEditStart(record._id, 'comparePrice', comparePrice)}
          >
            {comparePrice ? comparePrice.toLocaleString() : '-'}
          </span>
        )
      },
      sorter: (a: Product, b: Product) => (a.comparePrice || 0) - (b.comparePrice || 0),
    },
    {
      title: 'Закупочная, рублей',
      dataIndex: 'costPrice',
      key: 'costPrice',
      width: 120,
      render: (costPrice: number, record: Product) => {
        const isEditing = editingProduct === record._id && editingValues.hasOwnProperty('costPrice')
        return isEditing ? (
          <InputNumber
            size="small"
            value={editingValues.costPrice}
            onChange={(value) => setEditingValues({ ...editingValues, costPrice: value })}
            onPressEnter={() => handleEditSave(record._id, 'costPrice')}
            onBlur={() => handleEditSave(record._id, 'costPrice')}
            autoFocus
            style={{ width: 80 }}
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
          />
        ) : (
          <span 
            style={{ cursor: 'pointer', padding: '2px 4px', borderRadius: 2 }}
            onClick={() => handleEditStart(record._id, 'costPrice', costPrice)}
          >
            {costPrice ? costPrice.toLocaleString() : '-'}
          </span>
        )
      },
      sorter: (a: Product, b: Product) => (a.costPrice || 0) - (b.costPrice || 0),
    }
  ]

  const allCharacteristicsList = products.flatMap((p: Product) => p.characteristics || []).map((c: { characteristicId: string; value: string }) => ({ _id: c.characteristicId, name: c.value }));
  const exportProducts = (format: 'xlsx' | 'csv') => {
    // 1. Определяем максимальное количество характеристик среди всех товаров
    const maxCharCount = Math.max(
      ...filteredProducts.map((product: Product) => (product.characteristics?.length || 0)),
      0
    );
    // 2. Формируем заголовки
    const headers = [
      'Категория',
      'Подкатегория 1',
      'Подкатегория 2',
      'Подкатегория 3',
      'Подкатегория 4',
      'Подкатегория 5',
      'Название товара',
      'Описание товара',
      'Активен',
      'Артикул',
      'Цена продажи',
      'Старая цена',
      'Закупка',
      'Остаток',
      'Изображение товара',
      ...Array.from({ length: maxCharCount }, (_, i) => [`Характеристика ${i + 1}`, `Значение ${i + 1}`]).flat()
    ];
    // 3. Формируем строки
    const charIdToName: Record<string, string> = {};
    characteristics.forEach((c) => {
      charIdToName[c._id] = c.name;
    });
    const data = (filteredProducts as Product[]).map((product: Product) => {
      const charPairs: string[][] = (product.characteristics || []).map((c) => [
        charIdToName[c.characteristicId] || c.characteristicId,
        c.value || ''
      ]);
      while (charPairs.length < maxCharCount) {
        charPairs.push(['', '']);
      }
      // Категории
      const catPath = getCategoryPath(product.categoryId?._id || '');
      const catCols = [catPath[0] || '', catPath[1] || '', catPath[2] || '', catPath[3] || '', catPath[4] || '', catPath[5] || ''];
      return [
        ...catCols,
        product.name,
        product.description,
        product.isActive ? 1 : 0,
        product.sku,
        product.price,
        product.comparePrice,
        product.costPrice,
        product.stockQuantity,
        (product.images && product.images[0]) || product.mainImage || '',
        ...charPairs.flat()
      ];
    });
    // Генерируем файл
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Товары');
    if (format === 'xlsx') {
      XLSX.writeFile(wb, 'products_export.xlsx');
    } else {
      XLSX.writeFile(wb, 'products_export.csv', { bookType: 'csv', FS: ';' } as any);
    }
  };

  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [importMapping, setImportMapping] = useState<{ [col: string]: string }>({});
  const [importStep, setImportStep] = useState<'upload' | 'mapping' | 'identify' | 'update' | 'finalize' | 'result'>('upload');
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const productFields = [
    { value: 'name', label: 'Название товара' },
    { value: 'description', label: 'Описание товара' },
    { value: 'sku', label: 'Артикул' },
    { value: 'price', label: 'Цена продажи' },
    { value: 'comparePrice', label: 'Старая цена' },
    { value: 'costPrice', label: 'Закупка' },
    { value: 'stockQuantity', label: 'Остаток' },
    { value: 'mainImage', label: 'Изображение товара' },
    { value: 'isActive', label: 'Активен' },
    // ... можно добавить другие стандартные поля
  ];

  // Для характеристик
  const characteristicOptions = characteristics.map(c => ({ value: `char_${c._id}`, label: `Характеристика: ${c.name}` }));
  const categoryFields = [
    { value: 'category', label: 'Категория' },
    { value: 'subcategory1', label: 'Подкатегория 1' },
    { value: 'subcategory2', label: 'Подкатегория 2' },
    { value: 'subcategory3', label: 'Подкатегория 3' },
    { value: 'subcategory4', label: 'Подкатегория 4' },
    { value: 'subcategory5', label: 'Подкатегория 5' },
  ];
  const allFieldOptions = [
    ...categoryFields,
    ...productFields,
    ...characteristicOptions,
    { value: 'manual', label: 'Создать новую характеристику вручную' },
  ];

  const autoMapColumn = (header: string): string => {
    const h = header.toLowerCase();
    // Убираем спецсимволы и пробелы для сравнения
    const clean = (str: string) => str.toLowerCase().replace(/[^a-zа-я0-9]/gi, '');
    const hClean = clean(header);
    // Категории и подкатегории
    if (h.includes('категор') && !h.includes('под')) return 'category';
    if (h.includes('подкатегор') && h.includes('1')) return 'subcategory1';
    if (h.includes('подкатегор') && h.includes('2')) return 'subcategory2';
    if (h.includes('подкатегор') && h.includes('3')) return 'subcategory3';
    if (h.includes('подкатегор') && h.includes('4')) return 'subcategory4';
    if (h.includes('подкатегор') && h.includes('5')) return 'subcategory5';
    // Улучшено: название товара
    if (h.includes('назв') && h.includes('товар')) return 'name';
    if (h.includes('опис')) return 'description';
    if (h.includes('артикул') || h.includes('sku')) return 'sku';
    if (h.includes('цена') && h.includes('стара')) return 'comparePrice';
    // Улучшено: закупка
    if (h.includes('закуп') || h.includes('себестоим') || h.includes('cost') || h.includes('purchase')) return 'costPrice';
    if (h.includes('цена')) return 'price';
    if (h.includes('остат')) return 'stockQuantity';
    if (h.includes('изображ')) return 'mainImage';
    if (h.includes('актив')) return 'isActive';
    // Улучшено: характеристики — ищем частичное совпадение без спецсимволов и пробелов
    for (const c of characteristics) {
      const cName = clean(c.name);
      if (hClean.includes(cName) || cName.includes(hClean)) {
        return `char_${c._id}`;
      }
    }
    return '';
  };

  const parseImportFile = (file: File, onComplete: (data: any[][], headers: string[]) => void) => {
    if (file.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const rows = text.split(/\r?\n/).map(row => row.split(';'));
        const headers = rows[0] || [];
        onComplete(rows.slice(1), headers);
      };
      reader.readAsText(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const headers = rows[0] || [];
        onComplete(rows.slice(1), headers);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleImportFile = (file: File) => {
    setImportFile(file);
    setImportProgress(0);
    setImportStep('upload');
    setImportModalVisible(true);
    // Читаем файл с прогрессом
    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        setImportProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    reader.onload = (e) => {
      setImportProgress(100);
      // Парсим файл (XLSX/CSV)
      parseImportFile(file, (data, headers) => {
        setImportData(data);
        // Инициализируем маппинг: по умолчанию пусто
        const mapping: { [col: string]: string } = {};
        headers.forEach((h: string) => { mapping[h] = autoMapColumn(h); });
        setColumnMapping(mapping);
        setTimeout(() => {
          setImportStep('mapping');
        }, 300);
      });
    };
    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
    return false;
  };

  const handleMappingNext = () => {
    setImportMapping(columnMapping);
    setImportStep('identify');
  };

  const [manualInputValue, setManualInputValue] = useState<{ [col: string]: string }>({});
  const manualInputRef = useRef<{ [col: string]: any }>({});

  const [importIdentifyBy, setImportIdentifyBy] = useState('sku');
  const [importUpdateFields, setImportUpdateFields] = useState(['price', 'comparePrice', 'costPrice', 'stockQuantity', 'mainImage', 'isActive']);
  const [importUpdateStrategy, setImportUpdateStrategy] = useState('merge');

  // История импортов
  const IMPORT_HISTORY_KEY = 'import_products_history';
  const [importHistory, setImportHistory] = useState<any[]>([]);

  // Загрузка истории из localStorage при монтировании
  useEffect(() => {
    const raw = localStorage.getItem(IMPORT_HISTORY_KEY);
    if (raw) {
      try {
        setImportHistory(JSON.parse(raw));
      } catch {}
    }
  }, []);

  // Сохранение истории в localStorage
  const saveImportHistory = (history: any[]) => {
    setImportHistory(history);
    localStorage.setItem(IMPORT_HISTORY_KEY, JSON.stringify(history));
  };

  // Сохраняем настройки после успешного импорта
  const saveImportSettings = (fileName: string) => {
    const newEntry = {
      fileName,
      date: new Date().toISOString(),
      identifyBy: importIdentifyBy,
      updateFields: importUpdateFields,
      updateStrategy: importUpdateStrategy
    };
    let history = [newEntry, ...importHistory.filter(h => h.fileName !== fileName)];
    if (history.length > 50) history = history.slice(0, 50);
    saveImportHistory(history);
  };

  // При выборе из истории подставлять настройки
  const handleSelectHistory = (fileName: string) => {
    const entry = importHistory.find(h => h.fileName === fileName);
    if (entry) {
      setImportIdentifyBy(entry.identifyBy);
      setImportUpdateFields(entry.updateFields);
      setImportUpdateStrategy(entry.updateStrategy);
    }
  };

  // Внутри exportProducts:
  // Получить путь категорий для товара
  function getCategoryPath(categoryId: string): string[] {
    const path: string[] = [];
    let current = findCategoryById(categoryTree, categoryId);
    while (current) {
      path.unshift(current.name);
      if (!current.parentId) break;
      current = findCategoryById(categoryTree, current.parentId);
    }
    return path;
  }

  // --- МАССОВЫЕ ОПЕРАЦИИ ---
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [showTrash, setShowTrash] = useState(false);
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [bulkModalData, setBulkModalData] = useState<any>({});

  const handleBulkAction = (action: string) => {
    setBulkAction(action);
    if (["category", "price", "stockQuantity", "costPrice", "characteristic"].includes(action)) {
      setBulkModalVisible(true);
    } else if (action === "isActive") {
      handleBulkActionConfirm(action, { isActive: true });
    } else if (action === "isInactive") {
      handleBulkActionConfirm(action, { isActive: false });
    } else {
      handleBulkActionConfirm(action, {});
    }
  };

  const handleBulkActionConfirm = async (action: string, data: any) => {
    let url = "";
    let body: any = {};
    // --- Новый блок ---
    if (selectedRowKeys.length === totalProducts && totalProducts > 0) {
      // Выбраны все товары по фильтру — отправляем фильтр
      body = { all: true, filter: filterParams };
    } else {
      // Выбраны только отдельные товары — отправляем ids
      body = { ids: selectedRowKeys };
    }
    const baseUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5002/api'}`;
    if (action === "delete") url = `${baseUrl}/admin/products/bulk-delete`;
    if (action === "restore") url = `${baseUrl}/admin/products/bulk-restore`;
    if (action === "hard-delete") url = `${baseUrl}/admin/products/bulk-hard-delete`;
    if (["category", "price", "stockQuantity", "costPrice", "isActive", "characteristic"].includes(action)) {
      url = `${baseUrl}/admin/products/bulk-update`;
      body.update = data;
    }
    if (!url) return;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem('admin_token')}` },
      body: JSON.stringify(body)
    });
    if (resp.ok) {
      message.success("Операция выполнена");
      setSelectedRowKeys([]);
      setBulkModalVisible(false);
      setBulkAction(null);
      setBulkModalData({});
      queryClient.invalidateQueries('products');
    } else {
      message.error("Ошибка при выполнении операции");
    }
  };

  // --- КОРЗИНА ---
  const trashProducts = products.filter((p: any) => p.isDeleted);
  const activeProducts = products.filter((p: any) => !p.isDeleted);

  // --- UI ---
  const bulkMenuItems = [
    { key: 'delete', label: 'Удалить (в корзину)' },
    { key: 'restore', label: 'Восстановить из корзины' },
    { key: 'hard-delete', label: 'Удалить окончательно' },
    { type: 'divider' as const },
    { key: 'category', label: 'Изменить категорию' },
    { key: 'isActive', label: 'Сделать активными' },
    { key: 'isInactive', label: 'Сделать неактивными' },
    { key: 'price', label: 'Изменить цену' },
    { key: 'stockQuantity', label: 'Изменить остаток' },
    { key: 'costPrice', label: 'Изменить закупку' },
    { key: 'characteristic', label: 'Добавить характеристику' },
  ];
  const bulkMenu = (
    <Menu items={bulkMenuItems} onClick={({ key }) => handleBulkAction(key)} />
  );

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: any) => setSelectedRowKeys(keys),
  };

  // Корректное вычисление массива товаров для отображения
  const currentProducts = showTrash ? trashProducts : filteredProducts;
  const paginatedProducts = pageSize === 0
    ? currentProducts
    : currentProducts.slice((page-1)*pageSize, page*pageSize);

  // --- Кнопка "Выбрать все товары" ---
  const allIds = filteredProducts.map((p: any) => p._id);
  const isAllPageSelected = paginatedProducts.length > 0 && paginatedProducts.every((p: any) => selectedRowKeys.includes(p._id));
  const isAllSelected = selectedRowKeys.length === totalProducts && totalProducts > 0;

  // ... существующий код ...
  // Кнопка появляется только если выбраны все товары на странице, но не все из total
  {isAllPageSelected && !isAllSelected && (
    <div style={{ margin: '0 0 12px 0', textAlign: 'left' }}>
      <Button
        type="link"
        size="small"
        style={{ padding: 0 }}
        onClick={() => setSelectedRowKeys(allIds)}
      >
        Выбрать все {productsData?.totalCount || totalProducts} товаров
      </Button>
    </div>
  )}
  <Button type="primary" onClick={() => setProductEditModal({ visible: true, product: null })} style={{ marginBottom: 16 }}>
    Добавить новый товар
  </Button>
  // ... существующий код ...

  // ... существующий код ...
  // Функция для получения всех id товаров по фильтру
  async function fetchAllProductIds(filterParams: any) {
    let url = `${import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api'}/products?fields=_id&limit=1000000&admin=true`;
    Object.entries(filterParams).forEach(([key, value]) => {
      url += `&${key}=${value}`;
    });
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch all product ids');
    const data = await response.json();
    return (data.products || []).map((p: any) => p._id);
  }

  // ... существующий код ...
  // В обработчике массового выбора:
  const handleSelectAll = async () => {
    try {
      setIsSelectingAll(true);
      const allIds = await fetchAllProductIds(filterParams);
      setSelectedRowKeys(allIds);
      setIsSelectingAll(false);
    } catch (e) {
      setIsSelectingAll(false);
      message.error('Ошибка при массовом выборе товаров');
    }
  };
  // ... существующий код ...
  // В UI: передать handleSelectAll в компонент массового выбора (например, в кнопку 'Выбрать все товары')

  const [isSelectingAll, setIsSelectingAll] = useState(false);

  // ... существующий код ...
  // --- Внутри компонента Products ---
  const [selectedBulkCategory, setSelectedBulkCategory] = useState<string | null>(null);
  // ... существующий код ...

  <Modal
    open={bulkModalVisible && bulkAction === 'category'}
    title="Изменить категорию для выбранных товаров"
    onOk={() => {
      if (!selectedBulkCategory) {
        message.warning('Пожалуйста, выберите категорию');
        return;
      }
      handleBulkActionConfirm('category', { categoryId: selectedBulkCategory });
      setSelectedBulkCategory(null);
    }}
    onCancel={() => {
      setBulkModalVisible(false);
      setBulkAction(null);
      setSelectedBulkCategory(null);
    }}
    okText="Изменить"
    cancelText="Отмена"
    width={500}
    centered
  >
    <div style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: 8, fontWeight: 500 }}>
        Выберите новую категорию:
      </div>
      <TreeSelect
        placeholder="Выберите категорию"
        value={selectedBulkCategory}
        onChange={setSelectedBulkCategory}
        style={{ width: '100%' }}
        allowClear
        treeData={convertToTreeSelectData(categoryTree)}
        treeDefaultExpandAll={true}
        showSearch
        filterTreeNode={(inputValue, treeNode) => {
          return treeNode.title?.toString().toLowerCase().includes(inputValue.toLowerCase()) || false;
        }}
      />
    </div>
  </Modal>

  // ... существующий код ...
  // 1. Вынести всю логику импорта в отдельную функцию handleImportProducts
  const handleImportProducts = async () => {
    setImportLoading(true);
    setImportResult(null);
    const allCols = Object.keys(columnMapping);
    const normalize = (str: string) => str.toLowerCase().replace(/[^a-zа-я0-9]/gi, '');
    const productsToImport = importData.map((row, rowIdx) => {
      const product: any = {};
      allCols.forEach((col, idx) => {
        const field = columnMapping[col];
        const value = row[idx];
        if (!field || !value) return;
        if (field === 'category' || field.startsWith('subcategory')) {
          if (!product.categories) product.categories = [];
          product.categories.push(value);
        } else if (field.startsWith('char_')) {
          if (!product.characteristics) product.characteristics = [];
          product.characteristics.push({ characteristicId: field.replace('char_', ''), value });
        } else if (field.startsWith('manual:')) {
          if (!product.characteristics) product.characteristics = [];
          product.characteristics.push({ name: field.replace('manual:', ''), value });
        } else if (field === 'auto') {
          const n = col.match(/\d+/)?.[0];
          const charColIdx = allCols.findIndex(c => normalize(c) === `характеристика${n}`);
          let charName = '';
          if (charColIdx !== -1) {
            for (let i = 0; i < importData.length; i++) {
              const val = (importData[i][charColIdx] || '').trim();
              if (val) { charName = val; break; }
            }
          }
          if (charName) {
            if (!product.characteristics) product.characteristics = [];
            product.characteristics.push({ name: charName, value });
          }
        } else {
          product[field] = value;
        }
      });
      return product;
    });
    try {
      const resp = await fetch('/api/admin/import-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        body: JSON.stringify({
          products: productsToImport,
          identifyBy: importIdentifyBy,
          updateFields: importUpdateFields,
          updateStrategy: importUpdateStrategy
        })
      });
      const data = await resp.json();
      setImportLoading(false);
      setImportResult(data);
      if (importFile) saveImportSettings(importFile.name);
      setImportStep('result');
    } catch (e: any) {
      setImportLoading(false);
      setImportResult({ success: false, error: e?.message || String(e) });
      setImportStep('result');
    }
  };
  // ... существующий код ...
  // 2. В кнопке 'Импортировать' (шаг identify) используем только onClick={handleImportProducts}
  // <Button type="primary" onClick={handleImportProducts}>Импортировать</Button>
  // ... существующий код ...
  // 3. В модальном окне отображаем прогресс и итоговую статистику (успешно/ошибки) как раньше
  // ... существующий код ...

  return (
    <div style={{ position: 'relative', padding: 0, height: '100vh', display: 'flex' }}>
      {/* Левая панель: фильтры и категории */}
      <div style={{ width: 280, background: '#fafbfc', borderRight: '1px solid #eee', display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <div style={{ padding: 8, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Фильтры</span>
          <Button size="small" icon={<PlusOutlined />} onClick={() => setCategoryEditModal({ visible: true, category: null, mode: 'add' })} />
        </div>
        
        <div style={{ padding: 8, flex: 1 }}>
          {/* Быстрый поиск товаров */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#666' }}>Быстрый поиск товаров</div>
            {quickFilters.map(filter => (
              <div
                key={filter.key}
                style={{
                  padding: '6px 8px',
                  cursor: 'pointer',
                  borderRadius: 4,
                  marginBottom: 2,
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: selectedFilter === filter.key ? '#e6f7ff' : 'transparent',
                  color: selectedFilter === filter.key ? '#1890ff' : '#333'
                }}
                onClick={() => handleFilterClick(filter.key)}
              >
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: 6, color: selectedFilter === filter.key ? '#1890ff' : '#666' }}>
                    {filter.icon}
                  </span>
                  {filter.name}
                </span>
                <span style={{ color: '#52c41a', fontSize: 11, fontWeight: 500 }}>{filter.count}</span>
              </div>
            ))}
          </div>

          <Divider style={{ margin: '12px 0' }} />

          {/* Особые разделы */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#666' }}>Особые разделы</div>
            {specialSections.map(section => (
              <div
                key={section.key}
                style={{
                  padding: '6px 8px',
                  cursor: 'pointer',
                  borderRadius: 4,
                  marginBottom: 2,
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: selectedFilter === section.key ? '#e6f7ff' : 'transparent',
                  color: selectedFilter === section.key ? '#1890ff' : '#333'
                }}
                onClick={() => handleSpecialSectionClick(section.key)}
              >
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: 6, color: selectedFilter === section.key ? '#1890ff' : '#666' }}>
                    {section.icon}
                  </span>
                  {section.name}
                </span>
                <span style={{ color: '#52c41a', fontSize: 11, fontWeight: 500 }}>{section.count}</span>
              </div>
            ))}
          </div>

          <Divider style={{ margin: '12px 0' }} />

                      {/* Категории */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#666' }}>Каталог товаров на сайте</div>
              <Spin spinning={isLoadingTree} size="small">
                <div style={{ position: 'relative' }}>
                  <Tree
                    showLine
                    treeData={renderTreeNodes(categoryTree)}
                    selectedKeys={selectedCategory ? [selectedCategory] : []}
                    onSelect={keys => {
                      setSelectedCategory(keys[0] as string)
                    }}
                    onRightClick={handleCategoryRightClick}
                    draggable
                    onDrop={handleCategoryDrop}
                    style={{ fontSize: 12, userSelect: 'none' }}
                  />
                  {/* Контекстное меню встроено в Tree */}
                  {categoryContext.visible && (
                    <div style={{ 
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 9999,
                      backgroundColor: 'white',
                      border: '1px solid #d9d9d9',
                      borderRadius: '6px',
                      boxShadow: '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
                      minWidth: 150,
                      padding: '4px 0'
                    }}>
                      <div 
                        style={{ 
                          padding: '8px 12px', 
                          cursor: 'pointer', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          fontSize: '14px'
                        }}
                        onClick={() => {
                          if (categoryContext.category) {
                            setCategoryEditModal({ visible: true, category: categoryContext.category, mode: 'edit' })
                            setCategoryName(categoryContext.category.name || '')
                            setCategoryContext({ ...categoryContext, visible: false })
                          }
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <EditOutlined /> Переименовать
                      </div>
                      <div 
                        style={{ 
                          padding: '8px 12px', 
                          cursor: 'pointer', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          fontSize: '14px'
                        }}
                        onClick={() => {
                          setCategoryEditModal({ visible: true, category: categoryContext.category, mode: 'add' })
                          setCategoryName('')
                          setCategoryContext({ ...categoryContext, visible: false })
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <FolderAddOutlined /> Добавить подкатегорию
                      </div>
                      <div 
                        style={{ 
                          padding: '8px 12px', 
                          cursor: 'pointer', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          fontSize: '14px'
                        }}
                        onClick={() => {
                          if (categoryContext.category) {
                            setMoveCategoryModal({ visible: true, category: categoryContext.category })
                            setSelectedTargetCategory('')
                            setCategoryContext({ ...categoryContext, visible: false })
                          }
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <FolderOutlined /> Переместить в категорию
                      </div>
                      <div 
                        style={{ 
                          padding: '8px 12px', 
                          cursor: 'pointer', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          fontSize: '14px',
                          color: '#ff4d4f'
                        }}
                        onClick={() => {
                          if (categoryContext.category) {
                            deleteCategory(categoryContext.category._id)
                          }
                          setCategoryContext({ ...categoryContext, visible: false })
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fff2f0'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <DeleteOutlined /> Удалить
                      </div>
                    </div>
                  )}
                </div>
              </Spin>
            </div>

          
        </div>
      </div>

      {/* Правая панель: таблица товаров */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #eee', background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button type="primary" icon={<PlusOutlined />} size="small">Добавить новый товар</Button>
            {selectedCategory && (
              <span style={{ fontSize: 12, color: '#666' }}>
                Категория: {categoryTree.find(c => c._id === selectedCategory)?.name || 'Неизвестная категория'}
              </span>
            )}
          </div>
          <Input
            placeholder="Поиск по товарам"
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: 200 }}
            size="small"
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Tooltip title="Скачать товары в формате Excel (XLSX)">
              <Button
                icon={<FileExcelOutlined />}
                size="small"
                onClick={() => exportProducts('xlsx')}
              />
            </Tooltip>
            <Tooltip title="Скачать товары в формате CSV">
              <Button
                icon={<FileTextOutlined />}
                size="small"
                onClick={() => exportProducts('csv')}
              />
            </Tooltip>
            <Upload
              accept=".xlsx,.xls"
              showUploadList={false}
              beforeUpload={handleImportFile}
            >
              <Tooltip title="Импортировать товары из Excel (XLSX)">
                <Button icon={<UploadOutlined />} size="small">Импорт XLSX</Button>
              </Tooltip>
            </Upload>
            <Upload
              accept=".csv"
              showUploadList={false}
              beforeUpload={handleImportFile}
            >
              <Tooltip title="Импортировать товары из CSV">
                <Button icon={<UploadOutlined />} size="small">Импорт CSV</Button>
              </Tooltip>
            </Upload>
          </div>
          <Dropdown menu={{ items: bulkMenuItems, onClick: ({ key }) => handleBulkAction(key) }} disabled={selectedRowKeys.length === 0} placement="bottomLeft">
            <Button type="default" icon={<EditOutlined />} disabled={selectedRowKeys.length === 0} style={{ marginLeft: 8 }}>
              Действия с выбранными
            </Button>
          </Dropdown>
        </div>
        <div style={{ flex: 1 }}>
          <Table
            columns={columns}
            dataSource={paginatedProducts}
            rowKey="_id"
            loading={isLoading}
            size="small"
            pagination={false}
            bordered={false}
            rowSelection={{
              ...rowSelection,
              columnTitle: (
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Checkbox
                    checked={isAllPageSelected}
                    indeterminate={selectedRowKeys.length > 0 && !isAllPageSelected}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedRowKeys(paginatedProducts.map((p: any) => p._id));
                      } else {
                        setSelectedRowKeys([]);
                      }
                    }}
                  />
                  {isAllPageSelected && !isAllSelected && (
                    <Button
                      type="link"
                      size="small"
                      style={{ padding: 0, marginTop: 2, marginLeft: 0 }}
                      onClick={() => setSelectedRowKeys(allIds)}
                    >
                      Выбрать все {productsData?.totalCount || totalProducts} товаров
                    </Button>
                  )}
                </div>
              ),
            }}
            rowClassName={(record) => editingProduct === record._id ? 'editing-row' : ''}
          />
          {isAllPageSelected && !isAllSelected && (
            <div style={{ margin: '16px 0', textAlign: 'right' }}>
              <Button type="link" onClick={() => setSelectedRowKeys(allIds)}>
                Выбрать все {productsData?.totalCount || totalProducts} товаров
              </Button>
            </div>
          )}
          {/* Панель лимита и страниц сразу после таблицы */}
          <div style={{
            margin: '32px 0 48px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            justifyContent: 'flex-end'
          }}>
            <span style={{ color: '#666' }}>Показывать по:</span>
            <Select
              value={pageSize}
              onChange={val => { setPageSize(val); setPage(1); }}
              style={{ width: 90 }}
              options={LIMIT_OPTIONS.map(v => ({ value: v, label: v === 0 ? 'Все' : v }))}
            />
            <span style={{ color: '#666' }}>Страница:</span>
            <Select
              value={page}
              onChange={val => setPage(val)}
              style={{ width: 90 }}
              options={Array.from({ length: totalPages }, (_, i) => ({ value: i+1, label: i+1 }))}
              disabled={pageSize === 0}
            />
            <span style={{ color: '#888', fontSize: 12 }}>Всего: {totalProducts}</span>
          </div>
        </div>
      </div>

      {/* Модалка для добавления/редактирования категории */}
      <Modal
        open={categoryEditModal.visible}
        title={categoryEditModal.mode === 'edit' ? 'Переименовать категорию' : 'Добавить категорию'}
        onOk={handleCategoryEditOk}
        onCancel={() => setCategoryEditModal({ visible: false, category: null, mode: null })}
        okText={categoryEditModal.mode === 'edit' ? 'Сохранить' : 'Добавить'}
        cancelText="Отмена"
      >
        <Input
          value={categoryName}
          onChange={e => setCategoryName(e.target.value)}
          placeholder="Название категории"
          autoFocus
        />
      </Modal>

      {/* Модалка для перемещения категории */}
      <Modal
        open={moveCategoryModal.visible}
        title="Переместить категорию"
        onOk={() => {
          if (moveCategoryModal.category) {
            // Проверяем, что не пытаемся переместить категорию в саму себя
            if (selectedTargetCategory === moveCategoryModal.category._id) {
              message.warning('Нельзя переместить категорию в саму себя')
              return
            }
            
            // Проверяем, что не пытаемся переместить родителя в его дочерний элемент
            const targetCategory = findCategoryById(categoryTree, selectedTargetCategory)
            if (selectedTargetCategory && targetCategory && isDescendant(moveCategoryModal.category, targetCategory)) {
              message.warning('Нельзя переместить родительскую категорию в дочернюю')
              return
            }
            
            moveCategory(moveCategoryModal.category._id, selectedTargetCategory || undefined)
            setMoveCategoryModal({ visible: false, category: null })
            setSelectedTargetCategory('')
          }
        }}
        onCancel={() => {
          setMoveCategoryModal({ visible: false, category: null })
          setSelectedTargetCategory('')
        }}
        okText="Переместить"
        cancelText="Отмена"
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>
            Переместить категорию "{moveCategoryModal.category?.name}" в:
          </div>
          <TreeSelect
            placeholder="Выберите целевую категорию"
            value={selectedTargetCategory}
            onChange={setSelectedTargetCategory}
            style={{ width: '100%' }}
            allowClear
            treeData={[
              {
                title: 'Корневой уровень',
                value: '',
                key: 'root',
                children: categories ? convertToTreeSelectData(buildCategoryTree(categories)) : []
              }
            ]}
            onDropdownVisibleChange={(open) => {
              if (open) {
                console.log('TreeSelect dropdown opened, categories:', categories)
                console.log('TreeSelect data:', categories ? convertToTreeSelectData(buildCategoryTree(categories)) : [])
              }
            }}
            treeDefaultExpandAll={true}
            showSearch
            filterTreeNode={(inputValue, treeNode) => {
              return treeNode.title?.toString().toLowerCase().includes(inputValue.toLowerCase()) || false
            }}
          />
        </div>
      </Modal>

      {/* Модальное окно импорта */}
      <Modal
        open={importModalVisible}
        title="Импорт товаров"
        onCancel={() => setImportModalVisible(false)}
        footer={null}
        width={700}
      >
        {importStep === 'upload' && (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ marginBottom: 16 }}>Загрузка файла...</div>
            <Progress percent={importProgress} status={importProgress < 100 ? 'active' : 'success'} style={{ width: 300, margin: '0 auto' }} />
          </div>
        )}
        {importStep === 'mapping' && (
          <div>
            <div style={{
              background: '#f6faff',
              border: '1px solid #dbeafe',
              borderRadius: 8,
              padding: 16,
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 16
            }}>
              <span style={{ fontWeight: 500, fontSize: 15, color: '#2563eb', minWidth: 180 }}>
                История импортов:
              </span>
              <Select
                style={{ width: 400 }}
                placeholder="Выберите ранее загруженный файл и настройки импорта"
                onChange={handleSelectHistory}
                options={importHistory.map(h => ({ value: h.fileName, label: `${h.fileName} (${new Date(h.date).toLocaleString()})` }))}
                disabled={importHistory.length === 0}
                allowClear
              />
            </div>
            <div style={{ marginBottom: 16 }}>Сопоставьте колонки файла с полями товара или характеристиками:</div>
            {importData.length === 0 ? (
              <div style={{ color: '#888' }}>Нет данных для предпросмотра</div>
            ) : (
              <div style={{ overflowX: 'auto', marginBottom: 16, maxHeight: 400, overflowY: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', minWidth: 600 }}>
                  <thead>
                    <tr>
                      {Object.keys(columnMapping).map((col, idx) => {
                        const isValueCol = /^значение\s*\d+$/i.test(col.trim());
                        let charCol = '';
                        let autoCharName = '';
                        let autoCharId = '';
                        let debugInfo = '';
                        if (isValueCol) {
                          const n = col.match(/\d+/)?.[0];
                          charCol = Object.keys(columnMapping).find(c => new RegExp(`^характеристика\s*${n}$`, 'i').test(c.trim())) || '';
                          if (charCol && importData.length > 0) {
                            autoCharName = (importData[0][Object.keys(columnMapping).indexOf(charCol)] || '').trim();
                            const foundChar = characteristics.find(c => c.name.trim().toLowerCase() === autoCharName.toLowerCase());
                            if (foundChar) {
                              autoCharId = `char_${foundChar._id}`;
                              debugInfo = `Значение из '${charCol}': '${autoCharName}'. Найдена характеристика в базе: '${foundChar.name}' (id: ${foundChar._id}). Подставляется: char_${foundChar._id}`;
                            } else {
                              debugInfo = `Значение из '${charCol}': '${autoCharName}'. Характеристика не найдена в базе. Подставляется: '${autoCharName}'`;
                            }
                          }
                        }
                        return (
                          <th key={col} style={{ border: '1px solid #eee', padding: 6, background: '#fafafa' }}>
                            {isValueCol && charCol ? (
                              <div>
                                <Select
                                  style={{ width: 180 }}
                                  value={columnMapping[col] || autoCharId || autoCharName || 'auto'}
                                  onChange={val => {
                                    if (val === 'manual') {
                                      // Если это поле 'Значение N', подставляем значение из 'Характеристика N'
                                      const allCols = Object.keys(columnMapping);
                                      const n = col.match(/\d+/)?.[0];
                                      const normalize = (str: string) => str.toLowerCase().replace(/[^a-zа-я0-9]/gi, '');
                                      const charColIdx = allCols.findIndex(c => normalize(c) === `характеристика${n}`);
                                      let autoCharName = '';
                                      if (charColIdx !== -1 && importData.length > 0) {
                                        for (let i = 0; i < importData.length; i++) {
                                          const val = (importData[i][charColIdx] || '').trim();
                                          if (val) { autoCharName = val; break; }
                                        }
                                      }
                                      setManualInputValue(prev => ({ ...prev, [col]: autoCharName }));
                                      setTimeout(() => {
                                        if (manualInputRef.current[col]) manualInputRef.current[col].focus();
                                      }, 100);
                                    }
                                    setColumnMapping(prev => ({ ...prev, [col]: val }));
                                  }}
                                  options={[
                                    ...(manualCharacteristicNames[col] && manualCharacteristicNames[col].trim() ? [{ value: `manual:${manualCharacteristicNames[col].trim()}`, label: `Создать: ${manualCharacteristicNames[col].trim()}` }] : []),
                                    ...(autoCharId ? [{ value: autoCharId, label: `Характеристика: ${autoCharName}` }] : (autoCharName ? [{ value: autoCharName, label: `Характеристика: ${autoCharName}` }] : [])),
                                    ...characteristics.map(c => ({ value: `char_${c._id}`, label: `Характеристика: ${c.name}` })),
                                    { value: 'auto', label: 'Автоматически по значениям' },
                                    { value: 'manual', label: 'Создать новую характеристику вручную' },
                                  ]}
                                  popupRender={menu => (
                                    <>
                                      {menu}
                                      {columnMapping[col] === 'manual' && (
                                        <div style={{ padding: 8, borderTop: '1px solid #eee', background: '#fff' }}>
                                          <Input
                                            ref={el => manualInputRef.current[col] = el}
                                            style={{ width: 160, marginRight: 8, borderColor: (manualInputValue[col] || '').trim() ? undefined : '#ff4d4f' }}
                                            placeholder="Название характеристики"
                                            value={manualInputValue[col] || ''}
                                            onChange={e => setManualInputValue(prev => ({ ...prev, [col]: e.target.value }))}
                                            onPressEnter={() => {
                                              if ((manualInputValue[col] || '').trim()) {
                                                setManualCharacteristicNames(prev => ({ ...prev, [col]: manualInputValue[col].trim() }));
                                                setColumnMapping(prev => ({ ...prev, [col]: `manual:${manualInputValue[col].trim()}` }));
                                              }
                                            }}
                                          />
                                          <Button
                                            type="primary"
                                            size="small"
                                            disabled={!(manualInputValue[col] || '').trim()}
                                            onClick={() => {
                                              setManualCharacteristicNames(prev => ({ ...prev, [col]: manualInputValue[col].trim() }));
                                              setColumnMapping(prev => ({ ...prev, [col]: `manual:${manualInputValue[col].trim()}` }));
                                            }}
                                          >Добавить</Button>
                                        </div>
                                      )}
                                    </>
                                  )}
                                />
                                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{col}</div>
                                <div style={{ fontSize: 11, color: '#b00', marginTop: 2 }}>{debugInfo}</div>
                              </div>
                            ) : (
                              <div>
                                <Select
                                  style={{ width: 180 }}
                                  placeholder="Выберите поле"
                                  value={columnMapping[col] || undefined}
                                  onChange={val => setColumnMapping(prev => ({ ...prev, [col]: val }))}
                                  options={allFieldOptions}
                                  allowClear
                                  showSearch
                                />
                                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{col}</div>
                              </div>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {importData
                      .filter(row => row.some(val => typeof val === 'string' ? val.trim() !== '' : val !== null && val !== undefined))
                      .map((row, i) => (
                        <tr key={i} style={{ height: 38 }}>
                          {Object.keys(columnMapping).map((col, idx) => (
                            <td
                              key={col}
                              style={{ border: '1px solid #eee', padding: 6, fontSize: 13, width: 180, minWidth: 120, maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                              title={row[idx]}
                            >
                              {row[idx]}
                            </td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Button onClick={() => setImportStep('upload')}>Назад</Button>
              <Button type="primary" disabled={Object.values(columnMapping).every(v => !v)} onClick={handleMappingNext}>
                Далее
              </Button>
            </div>
            {/* Дебаг-блок под кнопкой */}
            <div style={{ marginTop: 16, background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 4, padding: 12, fontSize: 13, color: '#b00' }}>
              <b>Дебаг автоопределения характеристик:</b>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {Object.keys(columnMapping).filter(col => /^значение\s*\d+$/i.test(col.trim())).map(col => {
                  let charCol = '';
                  let autoCharName = '';
                  let autoCharId = '';
                  let debugInfo = '';
                  const allCols = Object.keys(columnMapping);
                  const n = col.match(/\d+/)?.[0];
                  const normalize = (str: string) => str.toLowerCase().replace(/[^a-zа-я0-9]/gi, '');
                  const charColIdx = allCols.findIndex(c => normalize(c) === `характеристика${n}`);
                  charCol = charColIdx !== -1 ? allCols[charColIdx] : '';
                  let hasRows = importData.length > 0;
                  if (charCol && hasRows) {
                    // Ищем первое непустое значение в колонке 'Характеристика N'
                    autoCharName = '';
                    for (let i = 0; i < importData.length; i++) {
                      const val = (importData[i][charColIdx] || '').trim();
                      if (val) { autoCharName = val; break; }
                    }
                    const foundChar = characteristics.find(c => c.name.trim().toLowerCase() === autoCharName.toLowerCase());
                    debugInfo = `\n  - Индекс колонки 'Характеристика ${n}': ${charColIdx}` +
                                `\n  - Заголовок: '${charCol}'` +
                                `\n  - Первое непустое значение: '${autoCharName || '[пусто]'}'`;
                    if (foundChar) {
                      autoCharId = `char_${foundChar._id}`;
                      debugInfo += `\n  - Найдена характеристика: ${foundChar.name} (id: ${foundChar._id})\n  - Подставляется: char_${foundChar._id}`;
                    } else {
                      debugInfo += `\n  - Характеристика не найдена в базе. Подставляется: '${autoCharName}'`;
                    }
                  } else {
                    debugInfo = `\n  - Не найдена колонка 'Характеристика ${n}' среди заголовков: [${allCols.join(', ')}]`;
                  }
                  // Формируем options для Select
                  const selectOptions = [
                    ...(manualCharacteristicNames[col] && manualCharacteristicNames[col].trim() ? [{ value: `manual:${manualCharacteristicNames[col].trim()}`, label: `Создать: ${manualCharacteristicNames[col].trim()}` }] : []),
                    ...(autoCharId ? [{ value: autoCharId, label: `Характеристика: ${autoCharName}` }] : (autoCharName ? [{ value: autoCharName, label: `Характеристика: ${autoCharName}` }] : [])),
                    ...characteristics.map(c => ({ value: `char_${c._id}`, label: `Характеристика: ${c.name}` })),
                    { value: 'auto', label: 'Автоматически по значениям' },
                    { value: 'manual', label: 'Создать новую характеристику вручную' },
                  ];
                  debugInfo += `\n  - Текущее значение columnMapping[col]: ${columnMapping[col]}`;
                  debugInfo += `\n  - Варианты options для Select: [${selectOptions.map(o => o.value + ' (' + o.label + ')').join(', ')}]`;
                  return <li key={col} style={{ whiteSpace: 'pre-line' }}>{col}:{debugInfo}</li>;
                })}
              </ul>
            </div>
          </div>
        )}
        {importStep === 'identify' && (
          <div>
            <div style={{ marginBottom: 16, fontWeight: 500 }}>Выберите, как импортированные данные будут идентифицировать существующие товары:</div>
            <Select
              style={{ width: 320, marginBottom: 20 }}
              value={importIdentifyBy || 'sku'}
              onChange={setImportIdentifyBy}
            >
              <Select.Option value="sku">По артикулу (SKU)</Select.Option>
              <Select.Option value="name">По названию товара</Select.Option>
              <Select.Option value="sku_name">По артикулу и названию вместе</Select.Option>
            </Select>

            <div style={{ marginBottom: 16, fontWeight: 500 }}>Выберите, какие поля товаров будут обновлены:</div>
            <Checkbox.Group
              style={{ display: 'flex', flexDirection: 'column', marginBottom: 20 }}
              value={importUpdateFields}
              onChange={setImportUpdateFields}
            >
              <Checkbox value="name">Название товара</Checkbox>
              <Checkbox value="price">Цена продажи</Checkbox>
              <Checkbox value="comparePrice">Старая цена</Checkbox>
              <Checkbox value="costPrice">Закупка</Checkbox>
              <Checkbox value="stockQuantity">Остаток</Checkbox>
              <Checkbox value="mainImage">Изображение товара</Checkbox>
              <Checkbox value="isActive">Активен</Checkbox>
              <Checkbox value="description">Описание товара</Checkbox>
              <Checkbox value="characteristics">Характеристики</Checkbox>
            </Checkbox.Group>

            <div style={{ marginBottom: 16, fontWeight: 500 }}>Выберите, как обновлять существующие товары:</div>
            <Select
              style={{ width: 320, marginBottom: 20 }}
              value={importUpdateStrategy || 'merge'}
              onChange={setImportUpdateStrategy}
            >
              <Select.Option value="merge">Обновлять только выбранные поля</Select.Option>
              <Select.Option value="replace">Заменять полностью</Select.Option>
            </Select>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Button onClick={() => setImportStep('mapping')}>Назад</Button>
              <Button type="primary" onClick={handleImportProducts}>Импортировать</Button>
            </div>
          </div>
        )}
        {importStep === 'update' && (
          <div>
            <div style={{ marginBottom: 16 }}>Выберите, какие поля товаров будут обновлены:</div>
            {/* Здесь будет список полей для обновления */}
            {/* Например, если выбрано 'sku', то поле 'sku' будет обновлено */}
            {/* Если выбрано 'name', то поле 'name' будет обновлено */}
            {/* Для текущей реализации просто сохраняем выбор */}
            <Select
              style={{ width: '100%' }}
              placeholder="Выберите поле для обновления"
              value={importStep === 'update' ? 'name' : ''} // Пока просто выбор, в реальном приложении будет сложнее
              onChange={(value) => {
                // Здесь будет логика определения поля для обновления
                // Например, если выбрано 'name', то поле 'name' будет обновлено
                // Если выбрано 'price', то поле 'price' будет обновлено
                // Для текущей реализации просто сохраняем выбор
                // setImportStep('finalize'); // Переход к следующему шагу
              }}
            >
              <Select.Option value="name">Наименование товара</Select.Option>
              <Select.Option value="price">Цена продажи</Select.Option>
              <Select.Option value="comparePrice">Старая цена</Select.Option>
              <Select.Option value="costPrice">Закупка</Select.Option>
              <Select.Option value="stockQuantity">Остаток</Select.Option>
              <Select.Option value="mainImage">Изображение товара</Select.Option>
              <Select.Option value="isActive">Активен</Select.Option>
            </Select>
            <Button type="primary" style={{ marginTop: 12 }} onClick={() => setImportStep('finalize')}>
              Далее
            </Button>
          </div>
        )}
        {importStep === 'finalize' && (
          <div>
            <div style={{ marginBottom: 16 }}>Выберите, как обновлять существующие товары:</div>
            <Select
              style={{ width: '100%' }}
              placeholder="Выберите способ обновления"
              value={importStep === 'finalize' ? 'replace' : ''} // Пока просто выбор, в реальном приложении будет сложнее
              onChange={(value) => {
                // Здесь будет логика определения способа обновления
                // Например, если выбрано 'replace', то новые данные полностью заменят существующие
                // Если выбрано 'merge', то новые данные обновляют существующие
                // Для текущей реализации просто сохраняем выбор
                // setImportStep('complete'); // Переход к завершению
              }}
            >
              <Select.Option value="replace">Заменить существующие товары полностью</Select.Option>
              <Select.Option value="merge">Обновить существующие товары</Select.Option>
            </Select>
            <Button type="primary" style={{ marginTop: 12 }} onClick={() => {
              // Здесь будет логика выполнения импорта
              // Например, отправка данных на сервер для обновления/создания
              message.success('Импорт завершен!');
              setImportModalVisible(false);
              setImportStep('upload'); // Возвращаемся к началу для следующего импорта
            }}>
              Завершить импорт
            </Button>
          </div>
        )}
        {importStep === 'result' && (
          <div style={{ textAlign: 'center', padding: 32 }}>
            {importLoading ? (
              <div>
                <div style={{ marginBottom: 16 }}>Импорт товаров...</div>
                <Progress percent={99} status="active" style={{ width: 300, margin: '0 auto' }} />
              </div>
            ) : importResult && importResult.results ? (
              <div>
                <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 16 }}>Импорт завершён!</div>
                <div style={{ marginBottom: 12 }}>
                  <span style={{ color: '#52c41a', fontWeight: 500 }}>Успешно загружено: {importResult.results.filter((r: any) => r.status === 'created' || r.status === 'updated').length}</span><br/>
                  <span style={{ color: '#ff4d4f', fontWeight: 500 }}>С ошибками: {importResult.results.filter((r: any) => r.status === 'error').length}</span>
                </div>
                {importResult.results.filter((r: any) => r.status === 'error').length > 0 && (
                  <div style={{ marginTop: 16, textAlign: 'left', maxWidth: 400, margin: '0 auto' }}>
                    <div style={{ color: '#ff4d4f', fontWeight: 600, marginBottom: 8 }}>Ошибки:</div>
                    {importResult.results.map((r: any, idx: number) =>
                      r.status === 'error' ? (
                        <div key={idx} style={{ marginBottom: 8 }}>
                          <div style={{ fontWeight: 500 }}>Строка {idx + 1}:</div>
                          <ul style={{ marginLeft: 16 }}>
                            {r.error.split(',').map((err: string, i: number) => (
                              <li key={i} style={{ color: '#ff4d4f' }}>{err.trim()}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null
                    )}
                  </div>
                )}
              </div>
            ) : importResult && importResult.error ? (
              <div style={{ color: '#ff4d4f', fontWeight: 500, fontSize: 16 }}>{importResult.error}</div>
            ) : null}
          </div>
        )}
      </Modal>

      <style>{`
          .editing-row {
            background-color: #f0f8ff !important;
          }
        `}</style>
      {/* Кнопка корзины (fixed, слева внизу) */}
      <div style={{ position: 'fixed', left: 24, bottom: 24, zIndex: 100 }}>
        <Button type={showTrash ? 'primary' : 'default'} icon={<DeleteOutlined />} onClick={() => setShowTrash(!showTrash)}>
          Корзина {trashProducts.length > 0 ? `(${trashProducts.length})` : ''}
        </Button>
      </div>
    </div>
  )
}

export default Products;