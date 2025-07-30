import { useState, useEffect } from 'react';

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [validFavorites, setValidFavorites] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Отмечаем, что компонент гидратирован
    setIsHydrated(true);
    
    const fav = localStorage.getItem('favorites');
    const savedFavorites = fav ? JSON.parse(fav) : [];
    setFavorites(savedFavorites);
    
    // Проверяем существование товаров в базе данных
    const validateFavorites = async () => {
      if (savedFavorites.length === 0) {
        setValidFavorites([]);
        return;
      }
      
      try {
        const response = await fetch(`/api/products/validate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productIds: savedFavorites })
        });
        
        if (response.ok) {
          const { validIds } = await response.json();
          setValidFavorites(validIds);
          
          // Если есть невалидные ID, обновляем localStorage
          if (validIds.length !== savedFavorites.length) {
            localStorage.setItem('favorites', JSON.stringify(validIds));
          }
        } else {
          // Если API недоступен, используем сохраненные ID
          setValidFavorites(savedFavorites);
        }
      } catch (error) {
        console.error('Ошибка валидации избранных товаров:', error);
        // В случае ошибки используем сохраненные ID
        setValidFavorites(savedFavorites);
      }
    };
    
    validateFavorites();
  }, []);

  const addFavorite = (id: string) => {
    setFavorites(prev => {
      const updated = prev.includes(id) ? prev : [...prev, id];
      localStorage.setItem('favorites', JSON.stringify(updated));
      return updated;
    });
    setValidFavorites(prev => {
      const updated = prev.includes(id) ? prev : [...prev, id];
      return updated;
    });
  };

  const removeFavorite = (id: string) => {
    setFavorites(prev => {
      const updated = prev.filter(favId => favId !== id);
      localStorage.setItem('favorites', JSON.stringify(updated));
      return updated;
    });
    setValidFavorites(prev => {
      const updated = prev.filter(favId => favId !== id);
      return updated;
    });
  };

  const isFavorite = (id: string) => favorites.includes(id);

  return { 
    favorites: isHydrated ? validFavorites : [], // Возвращаем пустой массив до гидратации
    addFavorite, 
    removeFavorite, 
    isFavorite 
  };
} 