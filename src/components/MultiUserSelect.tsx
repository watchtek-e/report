import React, { useState, useRef, useEffect } from 'react';
import { User } from '../store/userStore';
import './MultiUserSelect.css';

interface MultiUserSelectProps {
  users: User[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  label?: string;
}

export const MultiUserSelect = React.forwardRef<HTMLDivElement, MultiUserSelectProps>(
  ({ users, selectedIds, onChange, label }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Filter users based on search term
    const filteredUsers = users.filter((user) =>
      !selectedIds.includes(user.id) && 
      (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       user.id.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const selectedUsers = users.filter((user) => selectedIds.includes(user.id));

    const handleSelect = (userId: string) => {
      onChange([...selectedIds, userId]);
      setSearchTerm('');
      setIsOpen(true);
      inputRef.current?.focus();
    };

    const handleRemove = (userId: string) => {
      onChange(selectedIds.filter((id) => id !== userId));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
      setIsOpen(true);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      } else if (e.key === 'Enter' && filteredUsers.length > 0) {
        handleSelect(filteredUsers[0].id);
      }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
      <div ref={ref || containerRef} className="multi-user-select-wrapper">
        {label && <label className="ui-input-label">{label}</label>}
        <div className="multi-user-select-container">
          <div className="multi-user-select-input">
            {selectedUsers.map((user) => (
              <div key={user.id} className="user-tag">
                <span>{user.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(user.id)}
                  className="user-tag-remove"
                >
                  ×
                </button>
              </div>
            ))}
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsOpen(true)}
              placeholder={selectedIds.length === 0 ? '담당자 입력 또는 선택...' : ''}
              className="multi-user-select-search"
            />
          </div>

          {isOpen && (filteredUsers.length > 0 || searchTerm) && (
            <div className="multi-user-select-dropdown">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelect(user.id)}
                    className="multi-user-select-option"
                  >
                    <span className="option-name">{user.name}</span>
                    <span className="option-id">({user.id})</span>
                  </button>
                ))
              ) : (
                <div className="multi-user-select-no-result">
                  일치하는 담당자가 없습니다
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);

MultiUserSelect.displayName = 'MultiUserSelect';
