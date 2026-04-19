import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '../../utils/cn'

export default function SelectMenu({
  value,
  onChange,
  options = [],
  placeholder = 'Select option',
  className,
  buttonClassName,
  menuClassName,
  disabled = false,
  searchable = false,
}) {
  const [open, setOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const searchInputRef = useRef(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 })

  const selected = useMemo(() => options.find((item) => item.value === value), [options, value])

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchText.trim()) return options
    return options.filter((item) =>
      item.label.toLowerCase().includes(searchText.toLowerCase())
    )
  }, [options, searchText, searchable])

  useEffect(() => {
    const updatePosition = () => {
      if (!buttonRef.current) return
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
      })
    }

    const onDocClick = (event) => {
      const insideButton = rootRef.current?.contains(event.target)
      const insideMenu = menuRef.current?.contains(event.target)

      if (!insideButton && !insideMenu) {
        setOpen(false)
      }
    }

    const onEsc = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)

    if (open) {
      updatePosition()
      window.addEventListener('resize', updatePosition)
      window.addEventListener('scroll', updatePosition, true)
      if (searchable && searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 0)
      }
    }

    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  return (
    <div className={cn('relative', className)} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={cn('input inline-flex h-10 items-center justify-between gap-2 text-left', buttonClassName)}
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
      >
        <span className="truncate">{selected?.label || placeholder}</span>
        <ChevronDown size={15} className={cn('shrink-0 text-[var(--text-muted)] transition', open && 'rotate-180')} />
      </button>

      {open
        ? createPortal(
            <div
              ref={menuRef}
              className={cn('fixed z-[120] max-h-64 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-soft', menuClassName)}
              style={{
                top: menuPosition.top,
                left: menuPosition.left,
                width: menuPosition.width,
              }}
            >
              {searchable && (
                <div className="sticky top-0 border-b border-[var(--border)] bg-[var(--bg-card)] p-2">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--text-muted)] outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-0"
                  />
                </div>
              )}
              <div className="p-1">
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-4 text-center text-sm text-[var(--text-muted)]">
                    No options found
                  </div>
                ) : (
                  filteredOptions.map((item) => {
                    const active = item.value === value
                    return (
                      <button
                        key={item.value}
                        type="button"
                        className={cn('flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--bg-soft)]', active && 'bg-primary-500/10 text-primary-500')}
                        onClick={() => {
                          onChange?.(item.value)
                          setOpen(false)
                          setSearchText('')
                        }}
                      >
                        <span className="truncate">{item.label}</span>
                        {active ? <Check size={14} /> : null}
                      </button>
                    )
                  })
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
