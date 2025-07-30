import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Modal, Form, Select, Tag, Space, message, Spin, Alert, Switch, notification } from 'antd';
import { EditOutlined, DeleteOutlined, MessageOutlined, CheckOutlined, PictureOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import Layout from '../components/layout/Layout';

const statusColors = {
  new: 'blue',
  answered: 'green',
  hidden: 'red',
};

const ReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingReview, setEditingReview] = useState<any>(null);
  const [answeringReview, setAnsweringReview] = useState<any>(null);
  const [answerText, setAnswerText] = useState('');
  const [isAnswerModalOpen, setIsAnswerModalOpen] = useState(false);
  const [moderationEnabled, setModerationEnabled] = useState(() => {
    const saved = localStorage.getItem('reviews_moderation_enabled');
    return saved ? JSON.parse(saved) : true;
  });
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [imageModal, setImageModal] = useState<{visible: boolean, images: string[], index: number}>({visible: false, images: [], index: 0});
  const [form] = Form.useForm();

  useEffect(() => {
    localStorage.setItem('reviews_moderation_enabled', JSON.stringify(moderationEnabled));
  }, [moderationEnabled]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch('/api/reviews')
      .then(res => {
        if (!res.ok) throw new Error('Ошибка загрузки отзывов');
        return res.json();
      })
      .then(data => setReviews(data))
      .catch(err => setError(err.message || 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (editingReview) {
      form.setFieldsValue({
        ...editingReview,
        createdAt: editingReview.createdAt
          ? (typeof editingReview.createdAt === 'string'
              ? editingReview.createdAt.slice(0, 10)
              : '')
          : '',
      });
    }
  }, [editingReview]);

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Удалить отзыв?',
      content: 'Вы уверены, что хотите удалить этот отзыв?',
      okText: 'Удалить',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
          const res = await fetch(`/api/reviews/${id}`, {
            method: 'DELETE',
            headers: {
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
          });
          if (!res.ok) throw new Error('Ошибка удаления');
          setReviews(reviews.filter(r => r._id !== id));
          message.success('Отзыв удалён');
        } catch {
          message.error('Ошибка удаления');
        }
      },
    });
  };

  const handleBatchDelete = () => {
    Modal.confirm({
      title: `Удалить выбранные отзывы?`,
      content: `Вы уверены, что хотите удалить ${selectedRowKeys.length} отзыв(ов)?`,
      okText: 'Удалить',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
          await Promise.all(selectedRowKeys.map(async (id) => {
            await fetch(`/api/reviews/${id}`, {
              method: 'DELETE',
              headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              }
            });
          }));
          setReviews(reviews.filter(r => !selectedRowKeys.includes(r._id)));
          setSelectedRowKeys([]);
          message.success('Выбранные отзывы удалены');
        } catch {
          message.error('Ошибка при удалении отзывов');
        }
      },
    });
  };

  const handleEdit = (review: any) => {
    setEditingReview(review);
  };

  const handleEditSave = async (values: any) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      let createdAt = values.createdAt ?? editingReview.createdAt;
      if (createdAt instanceof Date) {
        createdAt = createdAt.toISOString().slice(0, 10);
      } else if (typeof createdAt === 'string' && createdAt.length > 10) {
        createdAt = createdAt.slice(0, 10);
      }
      const res = await fetch(`/api/reviews/${editingReview._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          text: values.text ?? editingReview.text,
          rating: values.rating ?? editingReview.rating,
          authorName: values.authorName ?? editingReview.authorName,
          createdAt,
          answer: values.answer ?? editingReview.answer,
          product: editingReview.product?._id || editingReview.product,
          user: editingReview.user?._id || editingReview.user
        })
      });
      if (!res.ok) throw new Error('Ошибка обновления');
      const updated = await res.json();
      // Если сервер не вернул product или user, подставляем из старого объекта
      const merged = {
        ...updated,
        product: updated.product || editingReview.product,
        user: updated.user || editingReview.user,
      };
      setReviews(reviews.map(r => r._id === editingReview._id ? merged : r));
      setEditingReview(null);
      message.success('Отзыв обновлён');
    } catch {
      message.error('Ошибка обновления');
    }
  };

  const handleAnswer = (review: any) => {
    setAnsweringReview(review);
    setAnswerText(review.answer || '');
    setIsAnswerModalOpen(true);
  };

  const handleAnswerSave = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const res = await fetch(`/api/reviews/${answeringReview._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          text: answeringReview.text,
          rating: answeringReview.rating,
          authorName: answeringReview.authorName,
          createdAt: answeringReview.createdAt,
          answer: answerText,
          product: answeringReview.product?._id || answeringReview.product,
          user: answeringReview.user?._id || answeringReview.user,
          status: 'answered'
        })
      });
      if (!res.ok) throw new Error('Ошибка при отправке ответа');
      const updated = await res.json();
      setReviews(reviews.map(r => r._id === answeringReview._id ? updated : r));
      setIsAnswerModalOpen(false);
      setAnsweringReview(null);
      setAnswerText('');
      // Для отладки:
      console.log('updated.product', updated.product);
      // Показываем всплывающее уведомление с ссылкой на товар
      let productSlug = (updated.product && updated.product.slug)
        ? updated.product.slug
        : (updated.product && updated.product.name
            ? updated.product.name
                .toLowerCase()
                .replace(/[а-яё]/g, function(char: string) {
                  const map: { [key: string]: string } = { 'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'c','ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'};
                  return map[char] || char;
                })
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-+|-+$/g, '')
            : 'unknown');
      const link = `/product/${productSlug}`;
      message.success({
        content: <span>Отзыв опубликован! <a href={link} target="_blank" rel="noopener noreferrer">Перейти к товару</a></span>,
        duration: 5
      });
    } catch {
      message.error('Ошибка при отправке ответа');
    }
  };

  const handleApprove = async (id: string, checked: boolean) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      const res = await fetch(`/api/reviews/${id}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ isApproved: checked })
      });
      if (!res.ok) throw new Error('Ошибка модерации');
      setReviews(reviews => reviews.map(r => r._id === id ? { ...r, isApproved: checked } : r));
      message.success(checked ? 'Отзыв одобрен' : 'Отзыв скрыт');
    } catch (e) {
      message.error('Ошибка модерации');
    }
  };

  const columns = [
    {
      title: 'Автор',
      dataIndex: ['user', 'firstName'],
      key: 'author',
      width: 140,
      render: (_: any, record: any) => record.user ? `${record.user.firstName || ''} ${record.user.lastName || ''}`.trim() || record.authorName : record.authorName,
    },
    {
      title: 'Товар',
      dataIndex: ['product', 'name'],
      key: 'product',
      width: 180,
      render: (_: any, record: any) => record.product ? (
        <a href={`/product/${record.product.slug}`} target="_blank" rel="noopener noreferrer">{record.product.name}</a>
      ) : '—',
    },
    {
      title: 'Оценка',
      dataIndex: 'rating',
      key: 'rating',
      width: 90,
      render: (rating: number) => (
        <span>{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</span>
      ),
    },
    {
      title: 'Текст',
      dataIndex: 'text',
      key: 'text',
      width: 300,
      render: (text: string) => <span style={{ whiteSpace: 'pre-line' }}>{text}</span>,
    },
    {
      title: 'Дата',
      dataIndex: 'createdAt',
      key: 'date',
      width: 120,
      render: (date: string) => {
        if (!date) return '';
        // Если строка формата YYYY-MM-DD, форматируем красиво
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          const [y, m, d] = date.split('-');
          return `${d}.${m}.${y}`;
        }
        // Если вдруг Date или другая строка, пробуем преобразовать
        const d = new Date(date);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('ru-RU');
        }
        return date;
      },
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: string) => <Tag color={statusColors[status as keyof typeof statusColors] || 'default'}>{status === 'new' ? 'Новый' : status === 'answered' ? 'Отвечен' : 'Скрыт'}</Tag>,
    },
    {
      title: 'Ответ',
      dataIndex: 'answer',
      key: 'answer',
      width: 200,
      render: (answer: string) => answer ? <span style={{ color: '#389e0d' }}>{answer}</span> : <span style={{ color: '#aaa' }}>—</span>,
    },
    {
      title: 'Фото',
      dataIndex: 'images',
      key: 'images',
      width: 80,
      align: "center" as const,
      render: (images: string[] | undefined) => (
        Array.isArray(images) && images.length > 0 ? (
          <Button
            icon={<PictureOutlined />}
            size="small"
            onClick={e => { e.stopPropagation(); setImageModal({visible: true, images, index: 0}); }}
          />
        ) : null
      ),
    },
    {
      title: 'Модерация',
      dataIndex: 'isApproved',
      key: 'isApproved',
      width: 120,
      render: (isApproved: boolean, record: any) => (
        <Switch
          checked={!!isApproved}
          onChange={checked => handleApprove(record._id, checked)}
          checkedChildren="Одобрен"
          unCheckedChildren="Скрыт"
        />
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 180,
      render: (_: any, record: any) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} size="small">Редактировать</Button>
          <Button icon={<DeleteOutlined />} onClick={() => handleDelete(record._id)} size="small" danger>Удалить</Button>
          <Button icon={<MessageOutlined />} onClick={() => handleAnswer(record)} size="small">Ответить</Button>
        </Space>
      ),
    },
  ];

  // Безопасное преобразование даты для input type='date' (московское время)
  function toDateInputValue(date: any) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    // Преобразуем к московскому времени
    const moscow = new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
    return moscow.toISOString().slice(0, 10);
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Отзывы о товарах</h1>
        <div>
          <Switch
            checked={moderationEnabled}
            onChange={setModerationEnabled}
            checkedChildren="Модерация включена"
            unCheckedChildren="Модерация выключена"
          />
        </div>
      </div>
      {selectedRowKeys.length > 0 && (
        <div className="mb-4">
          <Button danger onClick={handleBatchDelete} size="small" className="!text-xs sm:!text-base">Удалить выбранные ({selectedRowKeys.length})</Button>
        </div>
      )}
      {error && <Alert type="error" message={error} className="mb-4" />}
      {loading ? (
        <div className="flex justify-center items-center py-12"><Spin size="large" /></div>
      ) : (
        <div className="overflow-x-auto">
          <Table
            dataSource={reviews}
            columns={columns}
            rowKey="_id"
            pagination={{ pageSize: 10 }}
            bordered
            locale={{ emptyText: 'Нет отзывов' }}
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
            style={{ minWidth: 800 }}
          />
        </div>
      )}

      {/* Модалка редактирования */}
      <Modal
        open={!!editingReview}
        title={<span className="text-base sm:text-lg">Редактировать отзыв</span>}
        onCancel={() => setEditingReview(null)}
        footer={null}
        width={window.innerWidth < 600 ? '95vw' : 480}
        style={{ maxWidth: '95vw' }}
        styles={{ body: { padding: window.innerWidth < 600 ? 8 : 24 } }}
      >
        {editingReview && (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleEditSave}
          >
            <Form.Item name="authorName" label="Имя клиента" rules={[{ required: true, message: 'Введите имя' }]}> 
              <Input maxLength={100} />
            </Form.Item>
            <Form.Item name="createdAt" label="Дата" rules={[{ required: true, message: 'Укажите дату' }]}> 
              <Input type="date" />
            </Form.Item>
            <Form.Item name="text" label="Текст отзыва" rules={[{ required: true, message: 'Введите текст' }]}> 
              <Input.TextArea rows={4} maxLength={1000} />
            </Form.Item>
            <Form.Item name="answer" label="Ответ магазина"> 
              <Input.TextArea rows={2} maxLength={1000} placeholder="Ответ будет виден покупателям под отзывом" />
            </Form.Item>
            <Form.Item name="rating" label="Оценка" rules={[{ required: true, message: 'Укажите оценку' }]}> 
              <Select>
                {[1,2,3,4,5].map(i => <Select.Option key={i} value={i}>{i}</Select.Option>)}
              </Select>
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" icon={<CheckOutlined />}>Сохранить</Button>
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* Модалка ответа */}
      <Modal
        open={isAnswerModalOpen}
        title={<span className="text-base sm:text-lg">Ответить на отзыв</span>}
        onCancel={() => setIsAnswerModalOpen(false)}
        onOk={handleAnswerSave}
        okText="Ответить"
        cancelText="Отмена"
        width={window.innerWidth < 600 ? '95vw' : 480}
        style={{ maxWidth: '95vw' }}
        styles={{ body: { padding: window.innerWidth < 600 ? 8 : 24 } }}
      >
        <Input.TextArea
          rows={4}
          value={answerText}
          onChange={e => setAnswerText(e.target.value)}
          maxLength={1000}
          placeholder="Ответ магазина..."
        />
      </Modal>

      {/* Модальное окно для просмотра фото */}
      <Modal
        open={imageModal.visible}
        onCancel={() => setImageModal({visible: false, images: [], index: 0})}
        footer={null}
        width={window.innerWidth < 600 ? '95vw' : 480}
        centered
        style={{ maxWidth: '95vw' }}
        styles={{ body: { textAlign: 'center', padding: window.innerWidth < 600 ? 8 : 0 } }}
      >
        {imageModal.images.length > 0 && (
          <div style={{ position: 'relative', minHeight: 320 }}>
            <img
              src={imageModal.images[imageModal.index]}
              alt="Фото отзыва"
              style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 12, margin: '0 auto', display: 'block' }}
            />
            {imageModal.images.length > 1 && (
              <>
                <Button
                  icon={<LeftOutlined />}
                  style={{ position: 'absolute', top: '50%', left: 8, transform: 'translateY(-50%)' }}
                  disabled={imageModal.index === 0}
                  onClick={() => setImageModal(im => ({...im, index: Math.max(0, im.index - 1)}))}
                />
                <Button
                  icon={<RightOutlined />}
                  style={{ position: 'absolute', top: '50%', right: 8, transform: 'translateY(-50%)' }}
                  disabled={imageModal.index === imageModal.images.length - 1}
                  onClick={() => setImageModal(im => ({...im, index: Math.min(im.images.length - 1, im.index + 1)}))}
                />
              </>
            )}
            <div style={{ marginTop: 8, color: '#888', fontSize: 12 }}>
              {imageModal.index + 1} / {imageModal.images.length}
            </div>
          </div>
        )}
      </Modal>
      <style>{`
        @media (max-width: 600px) {
          .ant-table-thead > tr > th, .ant-table-tbody > tr > td {
            padding: 6px !important;
            font-size: 12px !important;
          }
          .ant-btn {
            font-size: 12px !important;
            padding: 0 8px !important;
          }
          .ant-modal-title {
            font-size: 15px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ReviewsPage; 