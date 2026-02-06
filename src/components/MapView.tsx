import { forwardRef, useEffect, useState, useRef, useCallback } from 'react';
import { LocationData, PathConnection, MAP_WIDTH, MAP_HEIGHT } from '../types';
import { useI18n } from '../i18n';
import { LocationTile } from './LocationTile';
import { PathOverlay } from './PathOverlay';

interface MapViewProps {
  backgroundImage: string | null;
  locations: LocationData[];
  paths: PathConnection[];
  connectingFrom: string | null;
  editingNameId: string | null;
  draggingId: string | null;
  onMapContextMenu: (screenX: number, screenY: number, mapX: number, mapY: number) => void;
  onLocationContextMenu: (screenX: number, screenY: number, locationId: string) => void;
  onPathContextMenu: (screenX: number, screenY: number, pathId: string) => void;
  onLocationMouseDown: (e: React.MouseEvent, locationId: string) => void;
  onPathMidMouseDown: (e: React.MouseEvent, pathId: string, midX: number, midY: number) => void;
  onNameClick: (locationId: string) => void;
  onNameChange: (locationId: string, name: string) => void;
  onNameBlur: () => void;
  onTileClick: (locationId: string, e: React.MouseEvent) => void;
  /** Expose the scale so parent can convert coordinates */
  scaleRef: React.MutableRefObject<number>;
  /** Expose the map container rect getter */
  getMapRect: React.MutableRefObject<(() => DOMRect | null) | null>;
}

export const MapView = forwardRef<HTMLDivElement, MapViewProps>(
  (
    {
      backgroundImage,
      locations,
      paths,
      connectingFrom,
      editingNameId,
      draggingId,
      onMapContextMenu,
      onLocationContextMenu,
      onPathContextMenu,
      onLocationMouseDown,
      onPathMidMouseDown,
      onNameClick,
      onNameChange,
      onNameBlur,
      onTileClick,
      scaleRef,
      getMapRect,
    },
    ref
  ) => {
    const { t } = useI18n();
    const viewportRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.5);

    const updateScale = useCallback(() => {
      if (viewportRef.current) {
        const rect = viewportRef.current.getBoundingClientRect();
        const scaleX = rect.width / MAP_WIDTH;
        const scaleY = rect.height / MAP_HEIGHT;
        const s = Math.min(scaleX, scaleY) * 0.95;
        setScale(s);
        scaleRef.current = s;
      }
    }, [scaleRef]);

    useEffect(() => {
      updateScale();
      window.addEventListener('resize', updateScale);
      return () => window.removeEventListener('resize', updateScale);
    }, [updateScale]);

    // Expose map rect getter to parent
    useEffect(() => {
      getMapRect.current = () => innerRef.current?.getBoundingClientRect() ?? null;
    }, [getMapRect]);

    const handleContextMenu = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        // Convert to map coordinates
        if (innerRef.current) {
          const rect = innerRef.current.getBoundingClientRect();
          const mapX = (e.clientX - rect.left) / scale;
          const mapY = (e.clientY - rect.top) / scale;
          onMapContextMenu(e.clientX, e.clientY, mapX, mapY);
        }
      },
      [scale, onMapContextMenu]
    );

    return (
      <div className="map-viewport" ref={viewportRef}>
        <div
          style={{
            width: MAP_WIDTH * scale,
            height: MAP_HEIGHT * scale,
            overflow: 'hidden',
            borderRadius: 8,
            boxShadow: '0 4px 30px rgba(0,0,0,0.6)',
          }}
        >
          <div
            className={`map-container${connectingFrom ? ' connecting' : ''}`}
            ref={(node) => {
              // Merge refs
              (innerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
              if (typeof ref === 'function') ref(node);
              else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
            }}
            style={{
              width: MAP_WIDTH,
              height: MAP_HEIGHT,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
            onContextMenu={handleContextMenu}
          >
            {backgroundImage && (
              <img
                src={backgroundImage}
                className="map-background"
                alt="Map background"
                draggable={false}
              />
            )}
            {!backgroundImage && (
              <div className="map-no-bg">
                <span>{t.mapPlaceholder}</span>
              </div>
            )}
            <PathOverlay
              paths={paths}
              locations={locations}
              onPathContextMenu={(e, pathId) => {
                onPathContextMenu(e.clientX, e.clientY, pathId);
              }}
              onPathMidMouseDown={(e, pathId, midX, midY) => {
                onPathMidMouseDown(e, pathId, midX, midY);
              }}
            />
            {locations.map((loc) => (
              <LocationTile
                key={loc.id}
                location={loc}
                isDragging={draggingId === loc.id}
                isEditing={editingNameId === loc.id}
                onMouseDown={(e) => onLocationMouseDown(e, loc.id)}
                onContextMenu={(e) => {
                  onLocationContextMenu(e.clientX, e.clientY, loc.id);
                }}
                onNameClick={() => onNameClick(loc.id)}
                onNameChange={(name) => onNameChange(loc.id, name)}
                onNameBlur={onNameBlur}
                onTileClick={
                  connectingFrom
                    ? (e) => onTileClick(loc.id, e)
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      </div>
    );
  }
);

MapView.displayName = 'MapView';
