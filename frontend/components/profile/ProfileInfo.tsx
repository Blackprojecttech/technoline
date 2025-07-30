import React from 'react';
import { IMaskInput } from 'react-imask';

interface ProfileInfoProps {
  user: any;
  isEditing: boolean;
  editForm: { firstName: string; lastName: string; phone: string };
  setEditForm: React.Dispatch<React.SetStateAction<{ firstName: string; lastName: string; phone: string }>>;
  isSaving: boolean;
  handleEdit: () => void;
  handleSave: () => void;
  handleCancel: () => void;
  phoneTouched: boolean;
  setPhoneTouched: React.Dispatch<React.SetStateAction<boolean>>;
  isPhoneValid: boolean;
}

export default function ProfileInfo({ user, isEditing, editForm, setEditForm, isSaving, handleEdit, handleSave, handleCancel, phoneTouched, setPhoneTouched, isPhoneValid }: ProfileInfoProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Информация о профиле</h2>
      <div className="space-y-4">
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
          <div className="p-2 bg-blue-100 rounded-lg">
            {/* Mail icon */}
          </div>
          <span className="text-gray-700 font-medium">{user?.email}</span>
        </div>
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
          <div className="p-2 bg-green-100 rounded-lg">
            {/* Phone icon */}
          </div>
          {isEditing ? (
            <IMaskInput
              mask="+7 (000) 000-00-00"
              value={editForm.phone}
              onAccept={(value: string) => setEditForm((prev) => ({ ...prev, phone: value }))}
              onBlur={() => setPhoneTouched(true)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              placeholder="Введите номер телефона"
              required
            />
          ) : (
            <span className="text-gray-700 font-medium">{user?.phone || 'Не указан'}</span>
          )}
        </div>
        {phoneTouched && !isPhoneValid && isEditing && (
          <div className="flex items-center mt-1 text-red-600 text-sm animate-fade-in">
            <span className="mr-1">⚠️</span> Пожалуйста, введите полный номер телефона
          </div>
        )}
        {/* Кнопки редактирования/сохранения/отмены вынести сюда */}
      </div>
    </div>
  );
} 