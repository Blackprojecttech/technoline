import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface CartItem {
  _id: string
  name: string
  price: number
  quantity: number
  image: string
  sku: string
}

interface CartState {
  items: CartItem[]
  total: number
  itemCount: number
}

// Функция для сохранения корзины в localStorage
const saveCartToStorage = (cart: CartState) => {
  // Проверяем, что мы на клиенте
  if (typeof window === 'undefined') {
    return
  }
  
  const cartData = {
    ...cart,
    timestamp: Date.now()
  }
  localStorage.setItem('cart', JSON.stringify(cartData))
}

// Функция для загрузки корзины из localStorage
const loadCartFromStorage = (): CartState => {
  // Проверяем, что мы на клиенте
  if (typeof window === 'undefined') {
    return { items: [], total: 0, itemCount: 0 }
  }
  
  try {
    const cartData = localStorage.getItem('cart')
    if (!cartData) return { items: [], total: 0, itemCount: 0 }
    
    const parsed = JSON.parse(cartData)
    const now = Date.now()
    const threeHours = 3 * 60 * 60 * 1000 // 3 часа в миллисекундах
    
    // Проверяем, не истекло ли время жизни корзины (3 часа)
    if (parsed.timestamp && (now - parsed.timestamp) > threeHours) {
      localStorage.removeItem('cart')
      return { items: [], total: 0, itemCount: 0 }
    }
    
    return {
      items: parsed.items || [],
      total: parsed.total || 0,
      itemCount: parsed.itemCount || 0
    }
  } catch (error) {
    console.error('Ошибка при загрузке корзины из localStorage:', error)
    return { items: [], total: 0, itemCount: 0 }
  }
}

const initialState: CartState = loadCartFromStorage()

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<CartItem>) => {
      const existingItem = state.items.find(item => item._id === action.payload._id)
      if (existingItem) {
        existingItem.quantity += action.payload.quantity
      } else {
        state.items.push(action.payload)
      }
      state.itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0)
      state.total = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      saveCartToStorage(state)
    },
    removeItem: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(item => item._id !== action.payload)
      state.itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0)
      state.total = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      saveCartToStorage(state)
    },
    updateQuantity: (state, action: PayloadAction<{ id: string; quantity: number }>) => {
      const item = state.items.find(item => item._id === action.payload.id)
      if (item) {
        item.quantity = action.payload.quantity
        state.itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0)
        state.total = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        saveCartToStorage(state)
      }
    },
    clearCart: (state) => {
      state.items = []
      state.total = 0
      state.itemCount = 0
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cart')
      }
    },
  },
})

export const { addItem, removeItem, updateQuantity, clearCart } = cartSlice.actions
export default cartSlice.reducer 