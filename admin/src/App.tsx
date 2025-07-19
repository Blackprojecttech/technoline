import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import Categories from './pages/Categories'
import Users from './pages/Users';
import UserDetail from './pages/UserDetail';
import DeliveryMethods from './pages/DeliveryMethods';
import PaymentMethods from './pages/PaymentMethods';
import ChangeHistory from './pages/change-history';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return <div>Загрузка...</div>
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />
}

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="categories" element={<Categories />} />
        <Route path="delivery" element={<DeliveryMethods />} />
        <Route path="payment-methods" element={<PaymentMethods />} />
        <Route path="users" element={<Users />} />
        <Route path="users/:id" element={<UserDetail />} />
        <Route path="change-history" element={<ChangeHistory />} />
      </Route>
    </Routes>
  )
}

export default App 