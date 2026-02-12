import { useEffect, useRef, useState, useLayoutEffect } from 'react';

export interface MenuItemDef {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
  /** Custom render instead of a simple label row */
  render?: () => React.ReactNode;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItemDef[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number; maxHeight?: number } | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    const timer = setTimeout(() => {
      window.addEventListener('mousedown', handleClick);
    }, 50);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('mousedown', handleClick);
      clearTimeout(timer);
    };
  }, [onClose]);

  // Calculate position after render, before paint
  useLayoutEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const padding = 8;
      
      // Horizontal positioning
      let newLeft = x;
      if (x + rect.width > window.innerWidth - padding) {
        newLeft = x - rect.width;
      }
      if (newLeft < padding) {
        newLeft = padding;
      }
      
      // Vertical positioning
      let newTop = y;
      let maxHeight: number | undefined;
      
      if (y + rect.height > window.innerHeight - padding) {
        // Try positioning above the click point
        newTop = y - rect.height;
      }
      
      // If still doesn't fit (goes above screen), clamp to top
      if (newTop < padding) {
        newTop = padding;
      }
      
      // If menu is taller than available space, add max height
      const availableHeight = window.innerHeight - padding * 2;
      if (rect.height > availableHeight) {
        maxHeight = availableHeight;
      }
      
      setPosition({ left: newLeft, top: newTop, maxHeight });
    }
  }, [x, y, items]);

  const style: React.CSSProperties = {
    position: 'fixed',
    left: position?.left ?? x,
    top: position?.top ?? y,
    zIndex: 9999,
    visibility: position ? 'visible' : 'hidden', // Hide until positioned
    maxHeight: position?.maxHeight,
    overflowY: position?.maxHeight ? 'auto' : undefined,
  };

  return (
    <div className="ctx-menu" ref={menuRef} style={style}>
      {items.map((item, i) => {
        if (item.separator) {
          return <div key={i} className="ctx-sep" />;
        }
        if (item.render) {
          return (
            <div key={i} className="ctx-custom">
              {item.render()}
            </div>
          );
        }
        return (
          <div
            key={i}
            className={`ctx-item${item.disabled ? ' ctx-disabled' : ''}${item.danger ? ' ctx-danger' : ''}`}
            onMouseDown={(e) => {
              e.stopPropagation();
              if (!item.disabled && item.onClick) {
                item.onClick();
              }
            }}
          >
            {item.label}
          </div>
        );
      })}
    </div>
  );
}
