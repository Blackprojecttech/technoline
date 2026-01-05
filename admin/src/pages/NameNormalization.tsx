import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, Form, Input, InputNumber, Select, Space, Switch, Table, Tag, Tooltip, Modal, message } from 'antd';
import { PlayCircleOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

interface ReplacementPair { from: string; to: string }
interface RuleDto {
  _id: string;
  name?: string;
  includeKeywords: string[];
  excludeKeywords: string[];
  replacements: ReplacementPair[];
  appendText?: string; // Текст, который нужно добавить в конец
  intervalHours: number;
  intervalMinutes?: number;
  autoEnabled?: boolean;
  isActive: boolean;
  lastRun?: string;
  lastResult?: { matched: number; updated: number; error?: string };
}

const NameNormalization: React.FC = () => {
  const [rules, setRules] = useState<RuleDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [editOpen, setEditOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RuleDto | null>(null);
  const [globalAutoOpen, setGlobalAutoOpen] = useState(false);
  const [globalAutoForm] = Form.useForm();
  const [runAllLoading, setRunAllLoading] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);
  const [autoRule, setAutoRule] = useState<RuleDto | null>(null);
  const [autoForm] = Form.useForm();

  const apiBase = useMemo(() => (import.meta as any).env.VITE_API_URL || window.location.origin + '/api', []);
  const authHeaders = useMemo(() => ({ 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }), []);

  const loadData = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${apiBase}/admin/name-normalization-rules`, { headers: authHeaders });
      const json = await r.json();
      const norm = (x: any): RuleDto => ({
        ...x,
        includeKeywords: Array.isArray(x?.includeKeywords) ? x.includeKeywords : [],
        excludeKeywords: Array.isArray(x?.excludeKeywords) ? x.excludeKeywords : [],
        replacements: Array.isArray(x?.replacements) ? x.replacements : []
      });
      setRules(Array.isArray(json) ? json.map(norm) : []);
    } catch (e: any) {
      message.error(`Ошибка загрузки: ${e?.message || e}`);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const onCreate = async (vals: any) => {
    try {
      const payload = {
        name: vals.name || '',
        includeKeywords: vals.includeKeywords || [],
        excludeKeywords: vals.excludeKeywords || [],
        replacements: (vals.replacements || []).filter((p: any) => p && p.from),
        appendText: vals.appendText || undefined,
        isActive: vals.isActive !== false
      };
      const resp = await fetch(`${apiBase}/admin/name-normalization-rules`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders }, body: JSON.stringify(payload)
      });
      if (!resp.ok) throw new Error('Не удалось создать правило');
      message.success('Правило создано');
      form.resetFields();
      loadData();
    } catch (e: any) { message.error(e.message || String(e)); }
  };

  const onUpdate = async (id: string, patch: Partial<RuleDto>) => {
    try {
      const resp = await fetch(`${apiBase}/admin/name-normalization-rules/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders }, body: JSON.stringify(patch)
      });
      if (!resp.ok) throw new Error('Не удалось обновить правило');
      message.success('Сохранено');
      loadData();
    } catch (e: any) { message.error(e.message || String(e)); }
  };

  const onDelete = async (id: string) => {
    try {
      const resp = await fetch(`${apiBase}/admin/name-normalization-rules/${id}`, { method: 'DELETE', headers: authHeaders });
      if (!resp.ok) throw new Error('Не удалось удалить правило');
      message.success('Удалено');
      loadData();
    } catch (e: any) { message.error(e.message || String(e)); }
  };

  const onRun = async (id: string) => {
    try {
      const resp = await fetch(`${apiBase}/admin/name-normalization-rules/${id}/run`, { method: 'POST', headers: authHeaders });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Ошибка запуска');
      message.success(`Нормализация выполнена: затронуто ${data.matched}, обновлено ${data.updated}`);
      loadData();
    } catch (e: any) { message.error(e.message || String(e)); }
  };

  const openEdit = (r: RuleDto) => {
    setEditingRule(r);
    editForm.setFieldsValue({
      name: r.name || '',
      includeKeywords: r.includeKeywords || [],
      excludeKeywords: r.excludeKeywords || [],
      replacements: (r.replacements || []).length ? r.replacements : [{ from: '', to: '' }],
      appendText: r.appendText || '',
      isActive: r.isActive
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    try {
      if (!editingRule) return;
      const vals = await editForm.validateFields();
      const patch: any = {
        name: vals.name || '',
        includeKeywords: vals.includeKeywords || [],
        excludeKeywords: vals.excludeKeywords || [],
        replacements: (vals.replacements || []).filter((p: any) => p && p.from),
        appendText: vals.appendText || undefined,
        isActive: !!vals.isActive
      };
      await onUpdate(editingRule._id, patch);
      setEditOpen(false);
      setEditingRule(null);
    } catch {}
  };

  const openGlobalAutoSettings = () => {
    // Попробуем предзаполнить по первому правилу
    const r = rules[0];
    globalAutoForm.setFieldsValue({
      autoEnabled: r ? (r.autoEnabled !== false) : true,
      intervalUnit: r && r.intervalMinutes && r.intervalMinutes % 60 !== 0 ? 'minutes' : 'hours',
      intervalValue: r ? (r.intervalMinutes && r.intervalMinutes % 60 !== 0 ? r.intervalMinutes : (r.intervalHours || 12)) : 12
    });
    setGlobalAutoOpen(true);
  };

  const saveGlobalAutoSettings = async () => {
    try {
      const vals = await globalAutoForm.validateFields();
      const unit = String(vals.intervalUnit || 'hours');
      const val = Number(vals.intervalValue);
      let minutes = Number(vals.intervalMinutes);
      if (!Number.isFinite(minutes) || minutes <= 0) {
        const factor = unit === 'minutes' ? 1 : (unit === 'days' ? 1440 : 60);
        if (Number.isFinite(val)) minutes = val * factor;
      }
      const patch: any = { autoEnabled: vals.autoEnabled !== false };
      if (Number.isFinite(minutes)) {
        const intervalMinutes = Math.min(Math.max(Math.round(minutes), 5), 43200);
        patch.intervalMinutes = intervalMinutes;
        patch.intervalHours = Math.min(Math.max(Math.round(intervalMinutes / 60), 1), 24);
      }
      const ids = rules.map(r => r._id);
      await Promise.all(ids.map(id => fetch(`${apiBase}/admin/name-normalization-rules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(patch)
      })));
      message.success('Сохранено для всех правил');
      setGlobalAutoOpen(false);
      loadData();
    } catch (e: any) {
      message.error(e?.message || 'Ошибка сохранения');
    }
  };

  const runAll = async () => {
    try {
      if (!rules.length) {
        message.info('Нет правил для запуска');
        return;
      }
      setRunAllLoading(true);
      let ok = 0; let fail = 0; let totalUpdated = 0;
      await Promise.all(rules.map(async (r) => {
        try {
          const resp = await fetch(`${apiBase}/admin/name-normalization-rules/${r._id}/run`, { method: 'POST', headers: authHeaders });
          const data = await resp.json().catch(() => ({}));
          if (resp.ok) {
            ok++;
            if (typeof data?.updated === 'number') totalUpdated += data.updated;
          } else {
            fail++;
          }
        } catch { fail++; }
      }));
      message.success(`Запуск завершен: ок=${ok}, ошибок=${fail}, обновлено=${totalUpdated}`);
      loadData();
    } catch (e: any) {
      message.error(e?.message || 'Ошибка запуска');
    } finally {
      setRunAllLoading(false);
    }
  };

  const openAutoSettings = (r: RuleDto) => {
    setAutoRule(r);
    autoForm.setFieldsValue({
      autoEnabled: r.autoEnabled !== false,
      intervalUnit: (r.intervalMinutes && r.intervalMinutes % 60 !== 0) ? 'minutes' : 'hours',
      intervalValue: (r.intervalMinutes && r.intervalMinutes % 60 !== 0) ? r.intervalMinutes : (r.intervalHours || 12)
    });
    setAutoOpen(true);
  };

  const saveAutoSettings = async () => {
    try {
      if (!autoRule) return;
      const vals = await autoForm.validateFields();
      const unit = String(vals.intervalUnit || 'hours');
      const val = Number(vals.intervalValue);
      let minutes = Number(vals.intervalMinutes);
      if (!Number.isFinite(minutes) || minutes <= 0) {
        const factor = unit === 'minutes' ? 1 : (unit === 'days' ? 1440 : 60);
        if (Number.isFinite(val)) minutes = val * factor;
      }
      const patch: any = { autoEnabled: vals.autoEnabled !== false };
      if (Number.isFinite(minutes)) {
        const intervalMinutes = Math.min(Math.max(Math.round(minutes), 5), 43200);
        patch.intervalMinutes = intervalMinutes;
        patch.intervalHours = Math.min(Math.max(Math.round(intervalMinutes / 60), 1), 24);
      }
      await onUpdate(autoRule._id, patch);
      setAutoOpen(false);
      setAutoRule(null);
    } catch {}
  };

  return (
    <div className="admin-page" style={{ padding: 16 }}>
      <Card title="Нормализация названий">
        <Form form={form} layout="inline" onFinish={onCreate} style={{ gap: 8, flexWrap: 'wrap' }} initialValues={{ includeKeywords: [], excludeKeywords: [], replacements: [{ from: '', to: '' }], isActive: true }}>
          <Form.Item name="name">
            <Input placeholder="Название правила (необязательно)" style={{ width: 220 }} />
          </Form.Item>
          <Form.Item name="includeKeywords" rules={[{ required: true, message: 'Укажите слова, которые должны быть в названии' }]}>
            <Select mode="tags" options={[]} placeholder="В названии должно быть" style={{ width: 320 }} />
          </Form.Item>
          <Form.Item name="excludeKeywords">
            <Select mode="tags" options={[]} placeholder="Исключаем слова" style={{ width: 300 }} />
          </Form.Item>
          <Form.Item name="appendText">
            <Input placeholder="Добавить в конец (необязательно)" style={{ width: 320 }} />
          </Form.Item>
          <Form.List name="replacements">
            {(fields, { add, remove }) => (
              <Space direction="vertical" size={4} style={{ width: '100%', maxWidth: 760 }}>
                {fields.map(field => (
                  <Space key={field.key} align="baseline">
                    <Form.Item {...field} name={[field.name, 'from']}>
                      <Input placeholder="Что заменить (например: X.Redmi)" style={{ width: 260 }} />
                    </Form.Item>
                    <span style={{ color: '#999' }}>→</span>
                    <Form.Item {...field} name={[field.name, 'to']}>
                      <Input placeholder="На что заменить (например: Xiaomi Redmi)" style={{ width: 280 }} />
                    </Form.Item>
                    <Button onClick={() => remove(field.name)}>Удалить</Button>
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add({ from: '', to: '' })}>Добавить замену</Button>
              </Space>
            )}
          </Form.List>
          {/* Интервал и автозапуск убраны из формы создания — настраиваются в модалке "Автообновление" */}
          <Form.Item name="isActive" valuePropName="checked">
            <Switch checkedChildren="Вкл" unCheckedChildren="Выкл" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">Добавить правило</Button>
          </Form.Item>
          <Form.Item>
            <Button onClick={openGlobalAutoSettings}>Автообновление</Button>
          </Form.Item>
          <Form.Item>
            <Button onClick={runAll} loading={runAllLoading} disabled={!rules.length}>Запустить все</Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="Правила" style={{ marginTop: 16 }}>
        <Table rowKey="_id" dataSource={rules} loading={loading} pagination={false}
          columns={[
            { title: 'Имя', dataIndex: 'name', key: 'name', render: (v: string) => v || '-' },
            { title: 'Должно быть', dataIndex: 'includeKeywords', key: 'includeKeywords', render: (arr: string[]) => (arr || []).map(k => <Tag key={k}>{k}</Tag>) },
            { title: 'Исключаем', dataIndex: 'excludeKeywords', key: 'excludeKeywords', render: (arr: string[]) => (arr || []).map(k => <Tag key={k} color="red">{k}</Tag>) },
            { title: 'Замены / Добавить', dataIndex: 'replacements', key: 'replacements', render: (_: any, r: RuleDto) => (
              <>
                {(r.replacements || []).map((p, idx) => <Tag key={idx}>{p.from} → {p.to}</Tag>)}
                {r.appendText && <Tag color="green">+ "{r.appendText}"</Tag>}
              </>
            )},
            { title: 'Интервал', dataIndex: 'intervalMinutes', key: 'intervalMinutes', render: (_: any, r: RuleDto) => {
              const mins = Number((r as any).intervalMinutes || (r.intervalHours || 12) * 60);
              if (mins % 1440 === 0) return `${Math.round(mins / 1440)} д`;
              if (mins % 60 === 0) return `${Math.round(mins / 60)} ч`;
              return `${mins} мин`;
            } },
            // Тумблер "Активно" убран по требованию — управляем через правки правила
            { title: 'Последний запуск', dataIndex: 'lastRun', key: 'lastRun', render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
            { title: 'Результат', dataIndex: 'lastResult', key: 'lastResult', render: (obj: any) => obj ? <span>найдено {obj.matched}, обновлено {obj.updated} {obj.error ? <Tag color="red">ошибка</Tag> : null}</span> : '-' },
            { title: 'Действия', key: 'actions', width: 140, render: (_: any, r: RuleDto) => (
              <Space size={8}>
                <Tooltip title="Обновить сейчас">
                  <Button size="small" type="text" icon={<PlayCircleOutlined />} onClick={() => onRun(r._id)} />
                </Tooltip>
                <Tooltip title="Редактировать">
                  <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(r)} />
                </Tooltip>
                <Tooltip title="Удалить">
                  <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => onDelete(r._id)} />
                </Tooltip>
              </Space>
            )}
          ]}
        />
      </Card>

      <Modal
        open={editOpen}
        title="Редактирование правила"
        onOk={saveEdit}
        onCancel={() => { setEditOpen(false); setEditingRule(null); }}
        okText="Сохранить"
        cancelText="Отмена"
      >
        <Form layout="vertical" form={editForm}>
          <Form.Item label="Название" name="name">
            <Input placeholder="Название правила" />
          </Form.Item>
          <Form.Item label="В названии должно быть" name="includeKeywords" rules={[{ required: true, message: 'Укажите слова' }] }>
            <Select mode="tags" options={[]} placeholder="Добавьте слова" />
          </Form.Item>
          <Form.Item label="Исключаем" name="excludeKeywords">
            <Select mode="tags" options={[]} placeholder="Добавьте исключения" />
          </Form.Item>
          <Form.Item label="Добавить в конец" name="appendText">
            <Input placeholder="Текст для добавления в конец (необязательно)" />
          </Form.Item>
          <Form.List name="replacements">
            {(fields, { add, remove }) => (
              <>
                {fields.map(field => (
                  <Space key={field.key} align="baseline" style={{ marginBottom: 8 }}>
                    <Form.Item {...field} name={[field.name, 'from']} label="Что">
                      <Input placeholder="X.Redmi" style={{ width: 220 }} />
                    </Form.Item>
                    <Form.Item {...field} name={[field.name, 'to']} label="Заменить на">
                      <Input placeholder="Xiaomi Redmi" style={{ width: 260 }} />
                    </Form.Item>
                    <Button onClick={() => remove(field.name)}>Удалить</Button>
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add({ from: '', to: '' })}>Добавить замену</Button>
              </>
            )}
          </Form.List>
          {/* Настройки автообновления перенесены в отдельную модалку */}
          <Form.Item label="Активно" name="isActive" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        open={autoOpen}
        title="Автообновление"
        onOk={saveAutoSettings}
        onCancel={() => { setAutoOpen(false); setAutoRule(null); }}
        okText="Сохранить"
        cancelText="Отмена"
      >
        <Form layout="vertical" form={autoForm} initialValues={{ autoEnabled: true, intervalUnit: 'hours', intervalValue: 12 }}>
          <Form.Item label="Автозапуск" name="autoEnabled" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Space align="baseline">
            <Form.Item label="Интервал" name="intervalValue" rules={[{ required: true, message: 'Укажите интервал' }]}>
              <InputNumber min={5} max={43200} />
            </Form.Item>
            <Form.Item label="Ед." name="intervalUnit">
              <Select style={{ width: 140 }}
                options={[
                  { label: 'минут', value: 'minutes' },
                  { label: 'часов', value: 'hours' },
                  { label: 'дней', value: 'days' }
                ]}
              />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
      <Modal
        open={globalAutoOpen}
        title="Автообновление (для всех правил)"
        onOk={saveGlobalAutoSettings}
        onCancel={() => setGlobalAutoOpen(false)}
        okText="Сохранить"
        cancelText="Отмена"
      >
        <Form layout="vertical" form={globalAutoForm} initialValues={{ autoEnabled: true, intervalUnit: 'hours', intervalValue: 12 }}>
          <Form.Item label="Автозапуск" name="autoEnabled" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Space align="baseline">
            <Form.Item label="Интервал" name="intervalValue" rules={[{ required: true, message: 'Укажите интервал' }]}>
              <InputNumber min={5} max={43200} />
            </Form.Item>
            <Form.Item label="Ед." name="intervalUnit">
              <Select style={{ width: 140 }}
                options={[
                  { label: 'минут', value: 'minutes' },
                  { label: 'часов', value: 'hours' },
                  { label: 'дней', value: 'days' }
                ]}
              />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
};

export default NameNormalization;


