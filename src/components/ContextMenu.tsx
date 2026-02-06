import { useEffect, useRef } from 'react';
import { useI18n, LANGUAGES } from '../i18n';

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
  const { lang, setLang } = useI18n();

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

  const style: React.CSSProperties = {
    position: 'fixed',
    left: x,
    top: y,
    zIndex: 9999,
  };

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        menuRef.current.style.left = `${x - rect.width}px`;
      }
      if (rect.bottom > window.innerHeight) {
        menuRef.current.style.top = `${y - rect.height}px`;
      }
    }
  }, [x, y]);

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

      {/* Language flags — always shown at the bottom */}
      <div className="ctx-sep" />
      <div className="ctx-flags">
        {LANGUAGES.map((l) => (
          <button
            key={l.id}
            className={`ctx-flag-btn${lang === l.id ? ' ctx-flag-active' : ''}`}
            title={l.label}
            onMouseDown={(e) => {
              e.stopPropagation();
              setLang(l.id);
            }}
          >
            {l.flag}
          </button>
        ))}
      </div>
    </div>
  );
}
