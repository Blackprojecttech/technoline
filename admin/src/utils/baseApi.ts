// baseApi.ts
import { message } from 'antd';

export class BaseApi {
  private baseUrl: string;
  private endpoint: string;

  constructor(endpoint: string) {
    // Используем URL из переменной окружения или формируем из текущего протокола и хоста
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl) {
      this.baseUrl = apiUrl;
    } else {
      // Если нет переменной окружения, используем production API по умолчанию
      this.baseUrl = 'https://technohubstore.net/api';
    }
    
    console.log('🌐 API Base URL:', this.baseUrl);
    this.endpoint = endpoint;
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('admin_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async handleResponse(response: Response, url: string) {
    console.log(`📥 Response from ${url}:`, {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    let responseData;
    const contentType = response.headers.get('content-type');
    
    try {
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
        console.log('📦 Response data:', responseData);
      } else {
        responseData = await response.text();
        console.log('📝 Response text:', responseData);
      }
    } catch (e) {
      console.error('❌ Failed to parse response:', e);
      responseData = null;
    }

    if (!response.ok) {
      console.error('❌ Server error response:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      });
      
      // Создаем расширенный объект ошибки
      const error: any = new Error(
        responseData?.error || 
        responseData?.message || 
        `Failed to ${url.includes('login') ? 'authenticate' : `handle ${this.endpoint} request`}`
      );
      
      // Добавляем дополнительные данные к ошибке
      error.response = response;
      error.data = responseData;
      error.status = response.status;
      
      throw error;
    }

    return responseData;
  }

  private async fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
    const finalOptions: RequestInit = {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      credentials: 'include',
      mode: 'cors',
      cache: 'no-store' // Prevent caching to ensure fresh data
    };

    console.log(`📤 Sending request to ${url}:`, {
      method: options.method,
      headers: finalOptions.headers,
      body: options.body ? JSON.parse(options.body as string) : undefined
    });

    try {
      const response = await fetch(url, finalOptions);
      console.log(`📥 Response from ${url}:`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      return response;
    } catch (error) {
      console.error(`❌ Network error for ${url}:`, error);
      if (retries > 0) {
        console.log(`🔄 Retrying request to ${url}... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.fetchWithRetry(url, options, retries - 1);
      }
      throw error;
    }
  }

  async authenticate(credentials: { email: string; password: string }) {
    try {
      console.log('🔐 Attempting authentication...');
      const url = `${this.baseUrl}/auth/login`;
      console.log('🌐 Auth URL:', url);

      const response = await this.fetchWithRetry(url, {
        method: 'POST',
        body: JSON.stringify(credentials)
      });

      const data = await this.handleResponse(response, url);
      console.log('✅ Authentication successful:', data);
      return data;
    } catch (error) {
      console.error('❌ Authentication error:', error);
      throw error;
    }
  }

  async getAll(params?: Record<string, any>) {
    try {
      const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
      const url = `${this.baseUrl}/${this.endpoint}${queryString}`;
      console.log(`📤 Fetching all ${this.endpoint} from ${url}...`);
      const response = await this.fetchWithRetry(url, {
        method: 'GET'
      });
      return this.handleResponse(response, url);
    } catch (error) {
      console.error(`❌ Error fetching ${this.endpoint}:`, error);
      throw error;
    }
  }

  async getById(id: string) {
    try {
      const url = `${this.baseUrl}/${this.endpoint}/${id}`;
      console.log(`📤 Fetching ${this.endpoint}/${id} from ${url}...`);
      const response = await this.fetchWithRetry(url, {
        method: 'GET'
      });
      return this.handleResponse(response, url);
    } catch (error) {
      console.error(`❌ Error fetching ${this.endpoint}/${id}:`, error);
      throw error;
    }
  }

  async create(data: any) {
    try {
      const url = `${this.baseUrl}/${this.endpoint}`;
      console.log(`📤 Creating new ${this.endpoint} at ${url}:`, data);
      const response = await this.fetchWithRetry(url, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return this.handleResponse(response, url);
    } catch (error) {
      console.error(`❌ Error creating ${this.endpoint}:`, error);
      throw error;
    }
  }

  async update(id: string, data: any) {
    try {
      console.log(`📤 Updating ${this.endpoint} ${id}:`, data);
      
      // Если это платеж и мы его инкассируем, добавляем специальную обработку
      if (this.endpoint === 'payments' && data.status === 'incassated') {
        console.log('💰 Инкассация платежа:', { id, ...data });
      }
      
      const response = await this.fetchWithRetry(`${this.baseUrl}/${this.endpoint}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });

      return this.handleResponse(response, `${this.baseUrl}/${this.endpoint}/${id}`);
    } catch (error) {
      console.error(`❌ Error updating ${this.endpoint}:`, error);
      throw error;
    }
  }

  async pay(id: string, data: { amount: number }) {
    try {
      const url = `${this.baseUrl}/${this.endpoint}/${id}/pay`;
      console.log(`💰 Processing payment for ${this.endpoint} ${id}:`, data);
      const response = await this.fetchWithRetry(url, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
      return this.handleResponse(response, url);
    } catch (error) {
      console.error(`❌ Error processing payment for ${this.endpoint}:`, error);
      throw error;
    }
  }

  async delete(id: string) {
    try {
      const url = `${this.baseUrl}/${this.endpoint}/${id}`;
      console.log(`📤 Deleting ${this.endpoint}/${id} at ${url}...`);

      // Если удаляем приход, добавляем список покупок в тело запроса
      const options: RequestInit = {
        method: 'DELETE'
      };

      if (this.endpoint === 'arrivals') {
        const purchases = localStorage.getItem('admin_purchases') || '[]';
        options.body = JSON.stringify({ purchases: JSON.parse(purchases) });
        options.headers = {
          'Content-Type': 'application/json'
        };
      }

      const response = await this.fetchWithRetry(url, options);
      return this.handleResponse(response, url);
    } catch (error) {
      console.error(`❌ Error deleting ${this.endpoint}/${id}:`, error);
      throw error;
    }
  }

  async clearAll() {
    try {
      const url = `${this.baseUrl}/${this.endpoint}/clear-all`;
      console.log(`🗑️ Clearing all ${this.endpoint} at ${url}...`);
      const response = await this.fetchWithRetry(url, {
        method: 'DELETE'
      });
      return this.handleResponse(response, url);
    } catch (error) {
      console.error(`❌ Error clearing all ${this.endpoint}:`, error);
      throw error;
    }
  }

  async incassateReceipts(data: { receiptIds: string[] }) {
    try {
      const url = `${this.baseUrl}/receipts/incassate`;
      console.log(`📤 Incassating receipts at ${url}:`, data);
      const response = await this.fetchWithRetry(url, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
      return this.handleResponse(response, url);
    } catch (error) {
      console.error('❌ Error incassating receipts:', error);
      throw error;
    }
  }

  async patch(id: string, data: any) {
    console.log(`📤 Patching ${this.endpoint}/${id} with data:`, data);
    const response = await fetch(`${this.baseUrl}/${this.endpoint}/${id}`, {
      method: 'PATCH',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    console.log(`📥 Response from ${this.baseUrl}/${this.endpoint}/${id}:`, response);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ошибка при обновлении');
    }

    const responseData = await response.json();
    console.log(`📦 Response data:`, responseData);
    return responseData;
  }
}

// Экспортируем экземпляры API для разных эндпоинтов
export const authApi = new BaseApi('auth');
export const suppliersApi = new BaseApi('suppliers');
export const productsApi = new BaseApi('products');
export const categoriesApi = new BaseApi('categories');
export const characteristicsApi = new BaseApi('characteristics');
export const ordersApi = new BaseApi('orders');
export const arrivalsApi = new BaseApi('arrivals');
export const debtsApi = new BaseApi('debts');
export const simpleDebtsApi = new BaseApi('simple-debts');
export const receiptsApi = new BaseApi('receipts');
export const paymentsApi = new BaseApi('payments');
export const clientsApi = new BaseApi('clients');
export const clientRecordsApi = new BaseApi('client-records');
export const sberRecipientsApi = new BaseApi('sber-recipients');

// УДАЛЕНА НЕПРАВИЛЬНАЯ ФУНКЦИЯ ИНКАССАЦИИ
// Инкассация НЕ должна изменять существующие платежи!
// Инкассация должна только создавать запись о списании наличных из кассы
export const incassateReceipts = async (receiptIds: string[], incassationData?: {
  status: 'incassated';
  incassationDate: string;
  inCashRegister: boolean;
}) => {
  console.warn('⚠️ incassateReceipts: Эта функция отключена. Инкассация не должна изменять существующие платежи!');
  return { success: false, message: 'Функция отключена' };
};

 