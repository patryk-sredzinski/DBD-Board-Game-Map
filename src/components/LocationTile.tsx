import { useRef, useEffect } from 'react';
import {
  LocationData,
  MARKER_COLORS,
  MarkerType,
  TILE_WIDTH,
  TILE_HEIGHT,
  MARKER_TYPES,
  SpawnValue,
  TILE_COLORS,
} from '../types';

import objectiveIcon from '../assets/score/objective.webp';
import boldnessIcon from '../assets/score/boldness.webp';
import survivalIcon from '../assets/score/survival.webp';
import altruismIcon from '../assets/score/altruism.webp';

import spawn0 from '../assets/spawn/spawn0.png';
import spawn1 from '../assets/spawn/spawn1.png';
import spawn2 from '../assets/spawn/spawn2.png';
import spawn3 from '../assets/spawn/spawn3.png';
import spawn4 from '../assets/spawn/spawn4.png';
import spawn5 from '../assets/spawn/spawn5.png';
import spawnOff from '../assets/spawn/spawnoff.png';
import tileTexture from '../assets/background/tile_texture.jpg';

const MARKER_ICONS: Record<MarkerType, string> = {
  objective: objectiveIcon,
  boldness: boldnessIcon,
  survival: survivalIcon,
  altruism: altruismIcon,
};

const SPAWN_ICONS: Record<number, string> = {
  0: spawn0,
  1: spawn1,
  2: spawn2,
  3: spawn3,
  4: spawn4,
  5: spawn5,
};

function getSpawnIcon(spawn: SpawnValue): string {
  if (spawn === null) return spawnOff;
  return SPAWN_ICONS[spawn] || spawnOff;
}

interface LocationTileProps {
  location: LocationData;
  isDragging: boolean;
  isEditing: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onNameClick: () => void;
  onNameChange: (name: string) => void;
  onNameBlur: () => void;
  onTileClick?: (e: React.MouseEvent) => void;
}

export function LocationTile({
  location,
  isDragging,
  isEditing,
  onMouseDown,
  onContextMenu,
  onNameClick,
  onNameChange,
  onNameBlur,
  onTileClick,
}: LocationTileProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const tileColors = TILE_COLORS[location.color];

  return (
    <div
      className={`location-tile${isDragging ? ' dragging' : ''}`}
      style={{
        left: location.x,
        top: location.y,
        width: TILE_WIDTH,
        height: TILE_HEIGHT,
        borderColor: tileColors.border,
      }}
      onMouseDown={(e) => {
        if (e.button === 0) onMouseDown(e);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu(e);
      }}
      onClick={(e) => {
        if (onTileClick) {
          e.stopPropagation();
          onTileClick(e);
        }
      }}
    >
      <div
        className="tile-header"
        style={{
          '--tile-header-color': tileColors.header,
          '--tile-texture': `url(${tileTexture})`,
        } as React.CSSProperties}
      >
        <img
          src={getSpawnIcon(location.spawn)}
          alt={location.spawn !== null ? `Spawn ${location.spawn}` : 'No spawn'}
          className="spawn-icon"
          draggable={false}
        />
        <div className="tile-header-content">
          {isEditing ? (
            <input
              ref={inputRef}
              className="tile-name-input"
              defaultValue={location.name}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onNameChange((e.target as HTMLInputElement).value);
                  onNameBlur();
                } else if (e.key === 'Escape') {
                  onNameBlur();
                }
              }}
              onBlur={(e) => {
                onNameChange(e.target.value);
                onNameBlur();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div
              className="tile-name"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onNameClick();
              }}
            >
              {location.name}
            </div>
          )}
          <div className="tile-markers">
            {MARKER_TYPES.map((type: MarkerType) => {
              const count = location.markers[type];
              if (count === 0) return null;
              return (
                <div key={type} className="marker-group">
                  {Array.from({ length: count }).map((_, i) => (
                    <div
                      key={i}
                      className="marker-icon"
                      title={type}
                      style={{
                        WebkitMaskImage: `url(${MARKER_ICONS[type]})`,
                        maskImage: `url(${MARKER_ICONS[type]})`,
                        WebkitMaskSize: 'contain',
                        maskSize: 'contain',
                        WebkitMaskRepeat: 'no-repeat',
                        maskRepeat: 'no-repeat',
                        WebkitMaskPosition: 'center',
                        maskPosition: 'center',
                        backgroundColor: MARKER_COLORS[type],
                      }}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="tile-image-container">
        {location.image ? (
          <img
            src={location.image}
            alt={location.name}
            className="tile-image"
            draggable={false}
          />
        ) : (
          <div className="tile-image-placeholder">
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#555"
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
