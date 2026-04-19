import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

export const CustomDatePicker = ({ value, onChange, label, min, max, disabled = false }) => {
  // Helper function to format date as YYYY-MM-DD
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to parse YYYY-MM-DD string to Date (avoiding timezone issues)
  const parseDate = (dateString) => {
    const [year, month, day] = dateString.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  };

  const [isOpen, setIsOpen] = useState(false);
  const [monthYearOpen, setMonthYearOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(
    value ? parseDate(value) : new Date()
  );
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update currentMonth when value prop changes
  useEffect(() => {
    if (value) {
      setCurrentMonth(parseDate(value));
    }
  }, [value]);

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleMonthChange = (monthIdx) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), monthIdx));
    setMonthYearOpen(false);
  };

  const handleYearChange = (year) => {
    setCurrentMonth(new Date(year, currentMonth.getMonth()));
    setMonthYearOpen(false);
  };

  const handleDayClick = (day) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateString = formatDate(newDate);
    onChange(dateString);
    setIsOpen(false);
  };

  const isDateDisabled = (day) => {
    const testDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const testString = formatDate(testDate);
    if (min && testString < min) return true;
    if (max && testString > max) return true;
    return false;
  };

  const isDateSelected = (day) => {
    if (!value) return false;
    const testDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const testString = formatDate(testDate);
    return testString === value;
  };

  const isToday = (day) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const displayDate = value 
    ? parseDate(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Select date';

  const monthYear = currentMonth.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentYear = currentMonth.getFullYear();
  const years = Array.from({ length: 1104 }, (_, i) => 1947 + i); // 1947 to 3050
  
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  
  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-0.5 sm:mb-1">
          {label}
        </label>
      )}
      
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full h-fit py-1.5 sm:py-2 px-2 sm:px-3 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)] hover:border-primary-500/50 transition-all focus:outline-none focus:border-primary-500 flex items-center justify-between gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="text-xs sm:text-sm truncate">{displayDate}</span>
        <Calendar className="w-4 h-4 flex-shrink-0 text-[var(--text-muted)]" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 z-50 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-xl p-3 w-full sm:w-72"
          >
            {/* Header with navigation */}
            <div className="flex items-center justify-between mb-3 gap-1 relative">
              <button
                onClick={previousMonth}
                className="p-1 hover:bg-[var(--border)] rounded transition-colors shrink-0"
                title="Previous month"
              >
                <ChevronLeft className="w-3 h-3 text-[var(--text-muted)]" />
              </button>

              <button
                onClick={() => setMonthYearOpen(!monthYearOpen)}
                className="flex-1 text-xs sm:text-sm font-semibold text-[var(--text)] hover:bg-[var(--border)] px-2 py-1 rounded transition-colors text-center truncate"
              >
                {monthYear}
              </button>

              <button
                onClick={nextMonth}
                className="p-1 hover:bg-[var(--border)] rounded transition-colors shrink-0"
                title="Next month"
              >
                <ChevronRight className="w-3 h-3 text-[var(--text-muted)]" />
              </button>

              {/* Month/Year Selector Dropdown */}
              <AnimatePresence>
                {monthYearOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-10 left-0 right-0 z-50 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg p-2 grid grid-cols-2 gap-1 max-h-40 overflow-y-auto"
                  >
                    {/* Months */}
                    <div className="space-y-0.5">
                      {months.map((month, idx) => (
                        <button
                          key={month}
                          onClick={() => handleMonthChange(idx)}
                          className={`w-full text-xs py-1 px-1.5 rounded transition-colors ${
                            currentMonth.getMonth() === idx
                              ? 'bg-primary-500 text-white font-semibold'
                              : 'hover:bg-[var(--border)] text-[var(--text)]'
                          }`}
                        >
                          {month}
                        </button>
                      ))}
                    </div>
                    
                    {/* Years */}
                    <div className="space-y-0.5">
                      {years.map((year) => (
                        <button
                          key={year}
                          onClick={() => handleYearChange(year)}
                          className={`w-full text-xs py-1 px-1.5 rounded transition-colors ${
                            currentYear === year
                              ? 'bg-primary-500 text-white font-semibold'
                              : 'hover:bg-[var(--border)] text-[var(--text)]'
                          }`}
                        >
                          {year}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                <div key={day} className="text-center text-[9px] sm:text-xs font-semibold text-[var(--text-muted)] py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="space-y-0.5">
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="grid grid-cols-7 gap-0.5">
                  {week.map((day, dayIdx) => (
                    <button
                      key={`${weekIdx}-${dayIdx}`}
                      onClick={() => day && handleDayClick(day)}
                      disabled={!day || isDateDisabled(day)}
                      className={`
                        h-7 sm:h-8 text-xs font-medium rounded transition-all flex items-center justify-center
                        ${!day ? 'invisible' : ''}
                        ${isDateSelected(day) 
                          ? 'bg-primary-500 text-white font-semibold' 
                          : isToday(day)
                          ? 'ring-1 ring-primary-500 text-[var(--text)]'
                          : 'text-[var(--text)] hover:bg-[var(--border)]'
                        }
                        ${isDateDisabled(day) ? 'text-[var(--text-muted)] opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* Footer buttons */}
            <div className="flex gap-2 mt-2 pt-2 border-t border-[var(--border)]">
              <button
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
                className="flex-1 px-2 py-1 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--border)] rounded transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  setCurrentMonth(today);
                  handleDayClick(today.getDate());
                }}
                className="flex-1 px-2 py-1 text-xs font-medium bg-primary-500 text-white hover:bg-primary-600 rounded transition-colors"
              >
                Today
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
