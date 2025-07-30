import React, { useState, useRef, memo } from 'react';
import { Input } from 'antd';
import debounce from 'lodash.debounce';

interface SearchInputProps {
  onSearch: (value: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

const SearchInput: React.FC<SearchInputProps> = memo(({ onSearch, placeholder, style }) => {
  const [value, setValue] = useState('');

  const debouncedSearch = useRef(
    debounce((searchValue: string) => {
      onSearch(searchValue);
    }, 2000)
  ).current;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue); // Мгновенное обновление UI
    debouncedSearch(newValue); // Отложенный поиск
  };

  return (
    <Input.Search
      placeholder={placeholder}
      allowClear
      enterButton
      value={value}
      onChange={handleChange}
      style={style}
    />
  );
});

SearchInput.displayName = 'SearchInput';

export default SearchInput; 