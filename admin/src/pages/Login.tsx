import React, { useState, useEffect } from 'react'
import { Form, Input, Button, Card, Typography, Alert } from 'antd'
import { UserOutlined, LockOutlined, ShoppingOutlined } from '@ant-design/icons'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

const { Title, Text } = Typography

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // Редирект если уже авторизован
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin/dashboard')
    }
  }, [isAuthenticated, navigate])

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true)
    setError('')

    try {
      const result = await login(values.email, values.password)
      if (result.success) {
        // Успешный вход - редирект произойдет автоматически через useEffect
        console.log('Успешный вход!')
      } else {
        setError(result.message || 'Ошибка входа')
      }
    } catch (error) {
      setError('Ошибка сети')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <Card style={{ width: 400, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          {/* Логотип удалён */}
          <Title level={2} style={{ margin: 0 }}>TechnoLine Admin</Title>
          <Text type="secondary">Войдите в панель управления</Text>
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            style={{ marginBottom: 16 }}
            showIcon
          />
        )}

        <Form
          name="login"
          onFinish={onFinish}
          layout="vertical"
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Введите email' },
              { type: 'email', message: 'Введите корректный email' }
            ]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="admin@technoline.store"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Пароль"
            rules={[
              { required: true, message: 'Введите пароль' },
              { min: 6, message: 'Пароль должен содержать минимум 6 символов' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Введите пароль"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
            >
              Войти
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Text type="secondary">
            Только для администраторов и модераторов
          </Text>
        </div>
      </Card>
    </div>
  )
}

export default Login 