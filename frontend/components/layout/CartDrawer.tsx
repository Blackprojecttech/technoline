'use client'

import { useSelector, useDispatch } from 'react-redux'
import { X, Trash2, ShoppingCart } from 'lucide-react'
import { RootState } from '@/store/store'
import { removeItem, updateQuantity } from '@/store/slices/cartSlice'
import Link from 'next/link'

interface CartDrawerProps {
  open: boolean
  onClose: () => void
}

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const dispatch = useDispatch()
  const { items, total, itemCount } = useSelector((state: RootState) => state.cart)

  const handleRemoveItem = (id: string) => {
    dispatch(removeItem(id))
  }

  const handleUpdateQuantity = (id: string, quantity: number) => {
    if (quantity > 0) {
      dispatch(updateQuantity({ id, quantity }))
    }
  }

  return (
    <>
      {/* Overlay */}
      {open && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}
      
      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <ShoppingCart size={24} className="text-primary-600" />
              <h2 className="text-lg font-semibold">Корзина ({itemCount})</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {items.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart size={48} className="text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Ваша корзина пуста</p>
                <p className="text-sm text-gray-400 mt-2">
                  Добавьте товары из каталога
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item._id} className="flex space-x-4 p-4 border border-gray-200 rounded-lg">
                    <img
                      src={item.image || '/placeholder-product.jpg'}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{item.name}</h3>
                      <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleUpdateQuantity(item._id, item.quantity - 1)}
                            className="w-6 h-6 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-100"
                          >
                            -
                          </button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <button
                            onClick={() => handleUpdateQuantity(item._id, item.quantity + 1)}
                            className="w-6 h-6 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-100"
                          >
                            +
                          </button>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {(item.price * item.quantity).toLocaleString()} ₽
                          </p>
                          <button
                            onClick={() => handleRemoveItem(item._id)}
                            className="text-red-500 hover:text-red-700 text-sm flex items-center space-x-1"
                          >
                            <Trash2 size={14} />
                            <span>Удалить</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t border-gray-200 p-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold">Итого:</span>
                <span className="text-xl font-bold text-primary-600">
                  {total.toLocaleString()} ₽
                </span>
              </div>
              <div className="space-y-2">
                <Link
                  href="/checkout"
                  onClick={onClose}
                  className="w-full btn-primary text-center"
                >
                  Оформить заказ
                </Link>
                <button
                  onClick={onClose}
                  className="w-full btn-secondary"
                >
                  Продолжить покупки
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
} 