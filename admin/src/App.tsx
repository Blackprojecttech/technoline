import React, { useCallback } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import ProductEdit from './pages/ProductEdit'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import Categories from './pages/Categories'
import Characteristics from './pages/Characteristics'
import Users from './pages/Users';
import UserDetail from './pages/UserDetail';
import DeliveryMethods from './pages/DeliveryMethods';
import PaymentMethods from './pages/PaymentMethods';
import ChangeHistory from './pages/change-history';
import Reviews from './pages/Reviews';
import Base from './pages/Base';
import Inventory from './pages/Inventory';
import Referrals from './pages/Referrals';

console.log('RENDER: App');
console.log('Routes:', [
  '/login',
  '/admin/dashboard', 
  '/admin/products',
  '/admin/products/:id/edit',
  '/admin/orders',
  '/admin/orders/:id',
  '/admin/base',
  '/admin/categories',
  '/admin/delivery',
  '/admin/payment-methods',
  '/admin/users',
  '/admin/users/:id',
  '/admin/change-history'
]);

const PrivateRoute: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return <div>Загрузка...</div>
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />
})

const App: React.FC = React.memo(() => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/admin"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="products/:id/edit" element={<ProductEdit />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="base" element={<Base />} />
        <Route path="categories" element={<Categories />} />
        <Route path="characteristics" element={<Characteristics />} />
        <Route path="delivery" element={<DeliveryMethods />} />
        <Route path="payment-methods" element={<PaymentMethods />} />
        <Route path="users" element={<Users />} />
        <Route path="users/:id" element={<UserDetail />} />
        <Route path="change-history" element={<ChangeHistory />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="referrals" element={<Referrals />} />
      </Route>
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  )
})

export default App 