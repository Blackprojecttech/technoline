import React, { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { BaseApi } from '../../utils/baseApi';

interface LoginFormData {
  email: string;
  password: string;
}

const authApi = new BaseApi('auth');

const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: LoginFormData) => {
    setLoading(true);
    try {
      console.log('🔐 Attempting login...');
      const response = await authApi.authenticate(values);
      console.log('✅ Login successful:', response);
      
      if (response.token) {
        localStorage.setItem('admin_token', response.token);
        message.success('Успешный вход');
        navigate('/admin/dashboard');
      } else {
        throw new Error('Token not received');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      message.error(error instanceof Error ? error.message : 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      name="login"
      initialValues={{ remember: true }}
      onFinish={onFinish}
      style={{ maxWidth: 400, margin: '0 auto', padding: '20px' }}
    >
      <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>Вход в админ-панель</h2>
      
      <Form.Item
        name="email"
        rules={[{ required: true, message: 'Введите email' }]}
      >
        <Input
          type="email"
          placeholder="Email"
          autoComplete="username"
          size="large"
        />
      </Form.Item>

      <Form.Item
        name="password"
        rules={[{ required: true, message: 'Введите пароль' }]}
      >
        <Input.Password
          placeholder="Пароль"
          autoComplete="current-password"
          size="large"
        />
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          style={{ width: '100%' }}
          size="large"
          loading={loading}
        >
          {loading ? 'Вход...' : 'Войти'}
        </Button>
      </Form.Item>
    </Form>
  );
};

export default LoginForm; 