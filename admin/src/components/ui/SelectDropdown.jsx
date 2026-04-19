import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export function SelectDropdown({ value, onChange, options, label, placeholder = 'Select...' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get selected option label
  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption?.label || placeholder;

  return (
    <div className="w-full relative" ref={dropdownRef}>
      {label && (
        <label className="text-sm font-semibold text-[var(--text-muted)] mb-2 block">
          {label}
        </label>
      )}

      {/* Dropdown Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full input flex items-center justify-between py-2 px-3 text-sm h-fit relative z-10"
      >
        <span className="text-[var(--text)]">{displayLabel}</span>
        <ChevronDown
          className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 border border-[var(--border)] rounded-lg bg-[var(--bg)] shadow-lg z-50 overflow-hidden">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm transition-all first:rounded-t-lg last:rounded-b-lg ${
                value === option.value
                  ? 'bg-blue-500 text-white font-semibold'
                  : 'hover:bg-[var(--bg-hover)] text-[var(--text)]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
