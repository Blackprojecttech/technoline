'use client'

import { useState, useEffect } from 'react'
import { X, Search, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface SearchModalProps {
  open: boolean
  onClose: () => void
}

interface SearchResult {
  _id: string
  name: string
  price: number
  mainImage: string
  slug: string
}

export default function SearchModal({ open, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
    }
  }, [open])

  useEffect(() => {
    const searchProducts = async () => {
      if (query.length < 2) {
        setResults([])
        return
      }

      setLoading(true)
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/products?search=${encodeURIComponent(query)}&limit=8`
        )
        if (response.ok) {
          const data = await response.json()
          setResults(data.products || [])
        }
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setLoading(false)
      }
    }

    const timeoutId = setTimeout(searchProducts, 300)
    return () => clearTimeout(timeoutId)
  }, [query])

  const handleResultClick = () => {
    onClose()
  }

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed top-0 left-0 right-0 bg-white shadow-lg z-50">
        <div className="container-custom py-4">
          <div className="relative">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Поиск товаров..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  autoFocus
                />
                {loading && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 animate-spin" size={20} />
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Search Results */}
            {query.length >= 2 && (
              <div className="mt-4 max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                    <p className="text-gray-500">Поиск...</p>
                  </div>
                ) : results.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {results.map((product) => (
                      <Link
                        key={product._id}
                        href={`/product/${product.slug}`}
                        onClick={handleResultClick}
                        className="flex space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <img
                          src={product.mainImage || '/placeholder-product.jpg'}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">
                            {product.name}
                          </h3>
                          <p className="text-sm font-semibold text-primary-600">
                            {product.price.toLocaleString()} ₽
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Search className="text-gray-400 mx-auto mb-2" size={24} />
                    <p className="text-gray-500">Товары не найдены</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Попробуйте изменить запрос
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
} 