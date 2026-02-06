import { useRef, useEffect } from 'react';
import {
  RoomData,
  PropTileType,
  ROOM_WIDTH,
  ROOM_HEIGHT_SMALL,
  ROOM_HEIGHT_LARGE,
  PROP_TILE_TYPES,
  InitialPlacementValue,
  ROOM_COLORS,
} from '../types';

import objectiveIcon from '../assets/score/objective-tinted.png';
import boldnessIcon from '../assets/score/boldness-tinted.png';
import survivalIcon from '../assets/score/survival-tinted.png';
import altruismIcon from '../assets/score/altruism-tinted.png';

import initialPlacement0 from '../assets/spawn/spawn0.png';
import initialPlacement1 from '../assets/spawn/spawn1.png';
import initialPlacement2 from '../assets/spawn/spawn2.png';
import initialPlacement3 from '../assets/spawn/spawn3.png';
import initialPlacement4 from '../assets/spawn/spawn4.png';
import initialPlacement5 from '../assets/spawn/spawn5.png';
import initialPlacementOff from '../assets/spawn/spawnoff.png';
import roomTexture from '../assets/background/tile_texture.jpg';

const PROP_TILE_ICONS: Record<PropTileType, string> = {
  objective: objectiveIcon,
  boldness: boldnessIcon,
  survival: survivalIcon,
  altruism: altruismIcon,
};

const INITIAL_PLACEMENT_ICONS: Record<number, string> = {
  0: initialPlacement0,
  1: initialPlacement1,
  2: initialPlacement2,
  3: initialPlacement3,
  4: initialPlacement4,
  5: initialPlacement5,
};

function getInitialPlacementIcon(placement: InitialPlacementValue): string {
  if (placement === null) return initialPlacementOff;
  return INITIAL_PLACEMENT_ICONS[placement] || initialPlacementOff;
}

interface RoomTileProps {
  room: RoomData;
  isDragging: boolean;
  isEditing: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onNameClick: () => void;
  onNameChange: (name: string) => void;
  onNameBlur: () => void;
  onRoomClick?: (e: React.MouseEvent) => void;
}

export function RoomTile({
  room,
  isDragging,
  isEditing,
  onMouseDown,
  onContextMenu,
  onNameClick,
  onNameChange,
  onNameBlur,
  onRoomClick,
}: RoomTileProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const roomColors = ROOM_COLORS[room.color];
  const roomHeight = room.size === 'large' ? ROOM_HEIGHT_LARGE : ROOM_HEIGHT_SMALL;

  return (
    <div
      className={`room-tile${isDragging ? ' dragging' : ''}`}
      style={{
        left: room.x,
        top: room.y,
        width: ROOM_WIDTH,
        height: roomHeight,
        borderColor: roomColors.border,
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
        if (onRoomClick) {
          e.stopPropagation();
          onRoomClick(e);
        }
      }}
    >
      <div
        className="room-header"
        style={{
          '--room-header-color': roomColors.header,
          '--room-texture': `url(${roomTexture})`,
        } as React.CSSProperties}
      >
        <img
          src={getInitialPlacementIcon(room.initialPlacement)}
          alt={room.initialPlacement !== null ? `Placement ${room.initialPlacement}` : 'No placement'}
          className="initial-placement-icon"
          draggable={false}
        />
        <div className="room-header-content">
          {isEditing ? (
            <input
              ref={inputRef}
              className="room-name-input"
              defaultValue={room.name}
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
              className="room-name"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onNameClick();
              }}
            >
              {room.name}
            </div>
          )}
          <div className="room-prop-tiles">
            {PROP_TILE_TYPES.map((type: PropTileType) => {
              const count = room.propTiles[type];
              if (count === 0) return null;
              return (
                <div key={type} className="prop-tile-group">
                  {Array.from({ length: count }).map((_, i) => (
                    <img
                      key={i}
                      src={PROP_TILE_ICONS[type]}
                      alt={type}
                      title={type}
                      className="prop-tile-icon"
                      draggable={false}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="room-image-container">
        {room.image ? (
          <img
            src={room.image}
            alt={room.name}
            className="room-image"
            draggable={false}
          />
        ) : (
          <div className="room-image-placeholder">
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
