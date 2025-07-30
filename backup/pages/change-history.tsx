// Переименовать этот файл в change-history.tsx (с маленькой буквы и через дефис) для корректной работы роутинга.
// Для работы анимаций установите framer-motion: npm install framer-motion
import React, { useEffect, useState, ReactNode } from 'react';
import { Card, Typography, Button, Modal, message, Popconfirm } from 'antd';
// Удаляю импорт Layout
// import Layout from '../components/layout/Layout';
import { AnimatePresence, motion } from 'framer-motion';
import { CopyOutlined } from '@ant-design/icons';

interface ChangeLogEntry {
  timestamp: string;
  action: string;
  file?: string;
  lines?: string;
  old?: string;
  new?: string;
  description?: string;
  // Новые поля для изменений доставки и заказов
  type?: string;
  delivery_action?: string;
  order_action?: string;
  details?: any;
}

const fetchChangelog = async (): Promise<ChangeLogEntry[]> => {
  try {
    const baseUrl = import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api';
    const res = await fetch(`${baseUrl}/admin/changelog`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
};

const rollbackToStep = async (step: number) => {
  const baseUrl = import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api';
  const res = await fetch(`${baseUrl}/admin/changelog/rollback`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ step })
  });
  if (!res.ok) throw new Error('Ошибка отката');
  return await res.json();
};

// --- DIFF UTILS ---
function getLineDiffs(oldStr: string, newStr: string) {
  const oldLines = oldStr ? oldStr.split('\n') : [];
  const newLines = newStr ? newStr.split('\n') : [];
  const maxLen = Math.max(oldLines.length, newLines.length);
  const diffs: { oldLine: string | null, newLine: string | null, type: 'same' | 'removed' | 'added' | 'changed' }[] = [];
  for (let i = 0; i < maxLen; i++) {
    const o = oldLines[i] ?? null;
    const n = newLines[i] ?? null;
    if (o === n) {
      diffs.push({ oldLine: o, newLine: n, type: 'same' });
    } else if (o && !n) {
      diffs.push({ oldLine: o, newLine: null, type: 'removed' });
    } else if (!o && n) {
      diffs.push({ oldLine: null, newLine: n, type: 'added' });
    } else {
      diffs.push({ oldLine: o, newLine: n, type: 'changed' });
    }
  }
  return diffs;
}

// Подсветка отличий внутри строки (посимвольно, красным)
function charDiff(a: string, b: string) {
  // LCS (Longest Common Subsequence) для посимвольного diff
  const m = a.length, n = b.length;
  const dp: number[][] = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++)
    if (a[i] === b[j]) dp[i + 1][j + 1] = dp[i][j] + 1;
    else dp[i + 1][j + 1] = Math.max(dp[i][j + 1], dp[i + 1][j]);
  // Восстановление diff
  let i = m, j = n;
  const resA: (string | JSX.Element)[] = [];
  const resB: (string | JSX.Element)[] = [];
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      resA.unshift(a[i - 1]);
      resB.unshift(b[j - 1]);
      i--; j--;
    } else if (dp[i][j - 1] >= dp[i - 1][j]) {
      resB.unshift(<span style={{ background: '#ffccc7', color: '#a8071a' }}>{b[j - 1]}</span>);
      j--;
    } else {
      resA.unshift(<span style={{ background: '#ffccc7', color: '#a8071a' }}>{a[i - 1]}</span>);
      i--;
    }
  }
  while (i > 0) {
    resA.unshift(<span style={{ background: '#ffccc7', color: '#a8071a' }}>{a[i - 1]}</span>);
    i--;
  }
  while (j > 0) {
    resB.unshift(<span style={{ background: '#ffccc7', color: '#a8071a' }}>{b[j - 1]}</span>);
    j--;
  }
  return { old: <>{resA}</>, new: <>{resB}</> };
}

const ChangeHistoryPage: React.FC = () => {
  const [changelog, setChangelog] = useState<ChangeLogEntry[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [rollbackModal, setRollbackModal] = useState<{open: boolean, step: number|null}>({open: false, step: null});
  const [rollbackLoading, setRollbackLoading] = useState(false);
  const [rollbackError, setRollbackError] = useState<string|null>(null);
  const [rollbackSuccess, setRollbackSuccess] = useState(false);
  const [viewModal, setViewModal] = useState<{open: boolean, entry: ChangeLogEntry | null}>({open: false, entry: null});

  // Автоматическая прокрутка вверх при загрузке страницы
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    fetchChangelog().then(data => {
      // Фильтруем записи, связанные с rollback
      const filtered = data.filter(entry => {
        if (entry.action === 'rollback') return false;
        if (entry.description && entry.description.toLowerCase().includes('rollback')) return false;
        return true;
      });
      console.log('📊 Загружено записей:', data.length);
      console.log('📊 Отфильтровано записей:', filtered.length);
      setChangelog(filtered.reverse());
      setLoading(false);
    });
  }, []);

  const handleRollback = async () => {
    if (rollbackModal.step === null) return;
    console.log('🔄 Попытка восстановления к шагу:', rollbackModal.step);
    setRollbackLoading(true);
    setRollbackError(null);
    try {
      await rollbackToStep(rollbackModal.step);
      setRollbackSuccess(true);
      setTimeout(() => {
        setRollbackModal({open: false, step: null});
        setRollbackSuccess(false);
        window.location.reload();
      }, 1500);
    } catch (e: any) {
      console.error('❌ Ошибка восстановления:', e);
      setRollbackError(e.message || 'Ошибка отката');
    } finally {
      setRollbackLoading(false);
    }
  };

  const handleDeleteHistory = async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'https://technoline-api.loca.lt/api';
      const res = await fetch(`${baseUrl}/admin/changelog/clear`, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Ошибка удаления истории');
      }
      
      // Очищаем состояние
      setChangelog([]);
      
      // Показываем успешное сообщение
      message.success(data.message || 'История изменений полностью очищена');
      
      console.log('✅ История изменений очищена:', data);
    } catch (e: any) {
      console.error('❌ Ошибка при очистке истории:', e);
      message.error(e.message || 'Ошибка удаления истории');
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <Typography.Title level={2} style={{ margin: 0, textAlign: 'center' }}>
          История изменений
        </Typography.Title>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <Popconfirm
            title="Удалить всю историю изменений?"
            onConfirm={handleDeleteHistory}
            okText="Да, удалить"
            cancelText="Отмена"
          >
            <Button danger type="primary" style={{ fontWeight: 500 }}>
              Удалить всю историю
            </Button>
          </Popconfirm>
        </div>
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        ) : changelog.length === 0 ? (
          <div className="text-center text-gray-500">История изменений пуста</div>
        ) : (
          <AnimatePresence>
            <div className="flex flex-col gap-8 max-w-2xl mx-auto">
              {changelog.slice(0, 50).map((entry, idx) => (
                <motion.div
                  key={entry.timestamp + entry.file + idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.4 }}
                  style={{ background: '#fafcff', borderRadius: 12, boxShadow: '0 2px 8px #f0f1f2', padding: 24, border: '1px solid #f0f0f0', marginBottom: 0 }}
                >
                  {/* Отображение информации о записи */}
                  <div style={{ color: '#222', fontSize: 15, marginBottom: 8, wordBreak: 'break-all' }}>
                    {entry.file || entry.description || 'Изменение'}
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>{new Date(entry.timestamp).toLocaleString('ru-RU')}</div>
                  <div style={{ fontSize: 13, color: '#555', marginBottom: 8 }}>
                    {entry.action === 'add' && 'Добавление файла'}
                    {entry.action === 'change' && 'Изменение файла'}
                    {entry.action === 'unlink' && 'Удаление файла'}
                    {entry.action === 'delivery_change' && `Изменение доставки: ${entry.delivery_action}`}
                    {entry.action === 'order_change' && `Изменение заказа: ${entry.order_action}`}
                  </div>
                  {/* Отображение деталей для изменений доставки и заказов */}
                  {entry.details && (
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 8, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
                      <strong>Детали:</strong> {JSON.stringify(entry.details, null, 2)}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 12 }}>
                    <Button
                      type="primary"
                      danger
                      size="large"
                      style={{ minWidth: 180, fontWeight: 500, fontSize: 16, borderRadius: 8, boxShadow: '0 2px 8px #f0f1f2' }}
                      onClick={() => setRollbackModal({open: true, step: idx})}
                      loading={rollbackLoading}
                    >
                      Восстановить
                    </Button>
                    <Button
                      type="default"
                      size="large"
                      style={{ minWidth: 120, fontWeight: 500, fontSize: 16, borderRadius: 8 }}
                      onClick={() => setViewModal({open: true, entry})}
                    >
                      Просмотр
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
        {/* Модальное окно подтверждения отката */}
        <AnimatePresence>
          {rollbackModal.open && (
            <Modal
              open={rollbackModal.open}
              onCancel={() => setRollbackModal({open: false, step: null})}
              onOk={handleRollback}
              okText={rollbackLoading ? 'Восстановление...' : 'Восстановить'}
              cancelText="Отмена"
              confirmLoading={rollbackLoading}
              centered
              title={<Typography.Title level={4} style={{ margin: 0 }}>Подтвердите восстановление</Typography.Title>}
            >
              <div style={{ marginBottom: 12 }}>Вы действительно хотите восстановить проект к этому шагу? Все изменения после него будут отменены.</div>
              {rollbackError && <div style={{ color: '#d4380d', marginBottom: 8 }}>{rollbackError}</div>}
              {rollbackSuccess && <div style={{ color: '#389e0d', marginBottom: 8 }}>Восстановление выполнено успешно!</div>}
            </Modal>
          )}
        </AnimatePresence>
      {/* Модальное окно просмотра изменений */}
      <Modal
        open={viewModal.open}
        onCancel={() => setViewModal({open: false, entry: null})}
        footer={null}
        centered
        title={<Typography.Title level={4} style={{ margin: 0 }}>Изменения в файле</Typography.Title>}
        width={900}
      >
        {viewModal.entry && (
          <div>
            <div style={{ color: '#222', fontSize: 15, marginBottom: 8, wordBreak: 'break-all' }}>{viewModal.entry.file}</div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>{new Date(viewModal.entry.timestamp).toLocaleString('ru-RU')}</div>
            {(viewModal.entry.old !== undefined || viewModal.entry.new !== undefined) ? (
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontWeight: 500, color: '#d4380d', flex: 1 }}>Было</div>
                    <Button
                      icon={<CopyOutlined />}
                      size="small"
                      onClick={() => {
                        if (viewModal.entry && viewModal.entry.old !== undefined) {
                          navigator.clipboard.writeText(viewModal.entry.old).then(() => message.success('Скопировано!'));
                        }
                      }}
                    >
                      Скопировать
                    </Button>
                  </div>
                  <div style={{ background: '#fff1f0', borderRadius: 6, padding: 8, fontSize: 13, maxHeight: 400, overflowY: 'auto', overflowX: 'hidden' }}>
                    {getLineDiffs(viewModal.entry.old || '', viewModal.entry.new || '').map((diff, idx) => (
                      <div key={idx} style={{
                        background: diff.type === 'removed' ? '#ffeaea' : diff.type === 'changed' ? '#fffbe6' : undefined,
                        color: diff.type === 'removed' ? '#d4380d' : diff.type === 'changed' ? '#a8071a' : '#222',
                        textDecoration: diff.type === 'removed' ? 'line-through' : undefined,
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'monospace',
                        fontSize: 13,
                        padding: '0 2px',
                      }}>
                        {diff.type === 'changed' ? charDiff(diff.oldLine || '', diff.newLine || '').old : diff.oldLine}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontWeight: 500, color: '#389e0d', flex: 1 }}>Стало</div>
                    <Button
                      icon={<CopyOutlined />}
                      size="small"
                      onClick={() => {
                        if (viewModal.entry && viewModal.entry.new !== undefined) {
                          navigator.clipboard.writeText(viewModal.entry.new).then(() => message.success('Скопировано!'));
                        }
                      }}
                    >
                      Скопировать
                    </Button>
                  </div>
                  <div style={{ background: '#f6ffed', borderRadius: 6, padding: 8, fontSize: 13, maxHeight: 400, overflowY: 'auto', overflowX: 'hidden' }}>
                    {getLineDiffs(viewModal.entry.old || '', viewModal.entry.new || '').map((diff, idx) => (
                      <div key={idx} style={{
                        background: diff.type === 'added' ? '#eaffea' : diff.type === 'changed' ? '#fffbe6' : undefined,
                        color: diff.type === 'added' ? '#389e0d' : diff.type === 'changed' ? '#a8071a' : '#222',
                        fontWeight: diff.type === 'added' ? 500 : undefined,
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'monospace',
                        fontSize: 13,
                        padding: '0 2px',
                      }}>
                        {diff.type === 'changed' ? charDiff(diff.oldLine || '', diff.newLine || '').new : diff.newLine}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: '#888', fontSize: 14 }}>Нет diff для отображения</div>
            )}
          </div>
        )}
      </Modal>
      </Card>
    </div>
  );
};

export default ChangeHistoryPage; 