import { X, Bell, CheckCircle2 } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface Notification {
  _id: string;
  type: 'review_request' | 'review_published' | 'review_moderated' | 'custom';
  text: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
  product?: {
    name: string;
    _id: string;
    slug?: string;
  };
}

interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function NotificationDrawer({ open, onClose }: NotificationDrawerProps) {
  const { notifications, loading, markAsRead, fetchNotifications } = useNotifications();
  const [expanded, setExpanded] = useState<{ [id: string]: boolean }>({});

  // Отметить все как прочитанные
  const markAllAsRead = async () => {
    await Promise.all(
      notifications.filter(n => !n.isRead).map(n => markAsRead(n._id))
    );
    fetchNotifications();
  };

  const isLong = (text: string) => text.length > 120 || text.split('\n').length > 2;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-6 right-6 z-[101] w-full max-w-sm bg-white shadow-2xl rounded-2xl border border-gray-200 flex flex-col"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white rounded-t-2xl shadow-md relative">
            <div className="flex items-center gap-3">
              <Bell size={24} className="text-white drop-shadow" />
              <span className="text-lg font-bold tracking-wide">Уведомления</span>
              {notifications.some(n => !n.isRead) && (
                <span className="ml-2 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-white" />
              )}
            </div>
            <div className="flex items-center gap-2">
              {notifications.some(n => !n.isRead) && (
                <button
                  onClick={markAllAsRead}
                  className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 border border-white/30"
                >
                  <CheckCircle2 size={15} /> Всё прочитано
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Закрыть"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-br from-white via-blue-50 to-purple-50 custom-scrollbar max-h-[60vh] min-h-[120px]">
            {loading ? (
              <div className="text-center py-12 text-gray-500 animate-pulse">Загрузка уведомлений...</div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12 text-gray-400">У вас пока нет уведомлений</div>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => {
                  const long = isLong(n.text);
                  const isOpen = expanded[n._id];
                  let renderedText = n.text;

                  if (n.link && n.type === 'review_request' && typeof n.text === 'string') {
                    // Ищем текст в кавычках
                    const match = n.text.match(/"([^"]+)"/);
                    if (match) {
                      const [fullMatch, textInQuotes] = match;
                      renderedText = n.text.replace(
                        fullMatch,
                        `"<a href="${n.link}" class="text-purple-700 hover:underline font-semibold" target="_blank" rel="noopener noreferrer">${textInQuotes}</a>"`
                      );
                    }
                  }

                  return (
                    <motion.div
                      key={n._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      transition={{ duration: 0.2 }}
                      className={`relative flex items-start gap-3 p-3 rounded-xl shadow border transition-all duration-200 group ${n.isRead ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-300'} hover:shadow-lg`}
                    >
                      <div className="flex-shrink-0 mt-1">
                        <Bell size={20} className={n.isRead ? 'text-gray-300' : 'text-blue-500 animate-bounce'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium text-gray-900 mb-1 ${long && !isOpen ? 'line-clamp-2' : ''}`}
                          dangerouslySetInnerHTML={{ __html: renderedText }}
                        />
                        {long && (
                          <button
                            className="text-xs text-blue-600 hover:underline mt-1"
                            onClick={() => setExpanded(e => ({ ...e, [n._id]: !isOpen }))}
                          >
                            {isOpen ? 'Скрыть' : 'Открыть полностью'}
                          </button>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(n.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      {!n.isRead && (
                        <button
                          onClick={() => markAsRead(n._id)}
                          className="ml-2 px-2 py-1 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 transition-colors font-semibold shadow group-hover:scale-105"
                        >
                          Прочитано
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// .custom-scrollbar::-webkit-scrollbar { width: 8px; background: transparent; }
// .custom-scrollbar::-webkit-scrollbar-thumb { background: #c7d2fe; border-radius: 8px; } 