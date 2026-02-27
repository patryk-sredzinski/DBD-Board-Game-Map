import { forwardRef, useEffect, useState, useRef, useCallback } from 'react';
import {
  RoomData, PathConnection, GAME_BOARD_WIDTH, GAME_BOARD_HEIGHT,
  ROOM_WIDTH, ROOM_HEIGHT_SMALL, ROOM_HEIGHT_LARGE,
} from '../types';
import { useI18n } from '../i18n';
import { RoomTile } from './LocationTile';
import { PathOverlay } from './PathOverlay';

interface GameBoardViewProps {
  backgroundImage: string | null;
  rooms: RoomData[];
  paths: PathConnection[];
  connectingFrom: string | null;
  editingNameId: string | null;
  draggingId: string | null;
  verificationMode: boolean;
  verificationDistances: Record<string, number>;
  verificationSourceRoom: string | null;
  onGameBoardContextMenu: (screenX: number, screenY: number, boardX: number, boardY: number) => void;
  onGameBoardClick: (screenX: number, screenY: number, boardX: number, boardY: number) => void;
  onRoomContextMenu: (screenX: number, screenY: number, roomId: string) => void;
  onPathContextMenu: (screenX: number, screenY: number, pathId: string) => void;
  onRoomMouseDown: (e: React.MouseEvent, roomId: string) => void;
  onIconMouseDown: (e: React.MouseEvent, pathId: string) => void;
  onPortMouseDown: (e: React.MouseEvent, pathId: string, portType: 'exit' | 'entry') => void;
  onNameClick: (roomId: string) => void;
  onNameChange: (roomId: string, name: string) => void;
  onNameBlur: () => void;
  onRoomClick: (roomId: string, e: React.MouseEvent) => void;
  scaleRef: React.MutableRefObject<number>;
  getGameBoardRect: React.MutableRefObject<(() => DOMRect | null) | null>;
}

export const GameBoardView = forwardRef<HTMLDivElement, GameBoardViewProps>(
  (
    {
      backgroundImage,
      rooms,
      paths,
      connectingFrom,
      editingNameId,
      draggingId,
      verificationMode,
      verificationDistances,
      verificationSourceRoom,
      onGameBoardContextMenu,
      onGameBoardClick,
      onRoomContextMenu,
      onPathContextMenu,
      onRoomMouseDown,
      onIconMouseDown,
      onPortMouseDown,
      onNameClick,
      onNameChange,
      onNameBlur,
      onRoomClick,
      scaleRef,
      getGameBoardRect,
    },
    ref
  ) => {
    const { t } = useI18n();
    const viewportRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0);
    const [scaleReady, setScaleReady] = useState(false);

    const updateScale = useCallback(() => {
      if (viewportRef.current) {
        const rect = viewportRef.current.getBoundingClientRect();
        const scaleX = rect.width / GAME_BOARD_WIDTH;
        const scaleY = rect.height / GAME_BOARD_HEIGHT;
        const s = Math.min(scaleX, scaleY) * 0.95;
        setScale(s);
        scaleRef.current = s;
        setScaleReady(true);
      }
    }, [scaleRef]);

    useEffect(() => {
      updateScale();
      window.addEventListener('resize', updateScale);
      return () => window.removeEventListener('resize', updateScale);
    }, [updateScale]);

    // Expose game board rect getter to parent
    useEffect(() => {
      getGameBoardRect.current = () => innerRef.current?.getBoundingClientRect() ?? null;
    }, [getGameBoardRect]);

    const handleContextMenu = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        // Convert to game board coordinates
        if (innerRef.current) {
          const rect = innerRef.current.getBoundingClientRect();
          const boardX = (e.clientX - rect.left) / scale;
          const boardY = (e.clientY - rect.top) / scale;
          onGameBoardContextMenu(e.clientX, e.clientY, boardX, boardY);
        }
      },
      [scale, onGameBoardContextMenu]
    );

    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        // Convert to game board coordinates
        if (innerRef.current) {
          const rect = innerRef.current.getBoundingClientRect();
          const boardX = (e.clientX - rect.left) / scale;
          const boardY = (e.clientY - rect.top) / scale;
          onGameBoardClick(e.clientX, e.clientY, boardX, boardY);
        }
      },
      [scale, onGameBoardClick]
    );

    return (
      <div className="game-board-viewport" ref={viewportRef}>
        <div
          style={{
            width: GAME_BOARD_WIDTH * scale,
            height: GAME_BOARD_HEIGHT * scale,
            overflow: 'hidden',
            borderRadius: 8,
            boxShadow: '0 4px 30px rgba(0,0,0,0.6)',
            visibility: scaleReady ? 'visible' : 'hidden',
          }}
        >
          <div
            className={`game-board-container${connectingFrom ? ' connecting' : ''}${verificationMode ? ' verification-active' : ''}`}
            ref={(node) => {
              // Merge refs
              (innerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
              if (typeof ref === 'function') ref(node);
              else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
            }}
            style={{
              width: GAME_BOARD_WIDTH,
              height: GAME_BOARD_HEIGHT,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
            onContextMenu={handleContextMenu}
            onClick={handleClick}
          >
            {backgroundImage && (
              <img
                src={backgroundImage}
                className="game-board-background"
                alt="Game board background"
                draggable={false}
              />
            )}
            {!backgroundImage && (
              <div className="game-board-no-bg">
                <span>{t.gameBoardPlaceholder}</span>
              </div>
            )}
            <PathOverlay
              paths={paths}
              rooms={rooms}
              onPathContextMenu={(e, pathId) => {
                onPathContextMenu(e.clientX, e.clientY, pathId);
              }}
              onIconMouseDown={(e, pathId) => {
                onIconMouseDown(e, pathId);
              }}
              onPortMouseDown={(e, pathId, portType) => {
                onPortMouseDown(e, pathId, portType);
              }}
            />
            {rooms.map((room) => (
              <RoomTile
                key={room.id}
                room={room}
                isDragging={draggingId === room.id}
                isEditing={editingNameId === room.id}
                onMouseDown={(e) => onRoomMouseDown(e, room.id)}
                onContextMenu={(e) => {
                  onRoomContextMenu(e.clientX, e.clientY, room.id);
                }}
                onNameClick={() => onNameClick(room.id)}
                onNameChange={(name) => onNameChange(room.id, name)}
                onNameBlur={onNameBlur}
                onRoomClick={
                  (connectingFrom || verificationMode)
                    ? (e) => onRoomClick(room.id, e)
                    : undefined
                }
              />
            ))}
            {/* Verification distance overlays */}
            {verificationMode && verificationSourceRoom && rooms.map((room) => {
              const isSource = room.id === verificationSourceRoom;
              const dist = verificationDistances[room.id];
              const unreachable = dist === undefined && !isSource;
              const roomHeight = room.size === 'large' ? ROOM_HEIGHT_LARGE : ROOM_HEIGHT_SMALL;
              return (
                <div
                  key={`vdist-${room.id}`}
                  className={`verification-overlay${isSource ? ' verification-source' : ''}${unreachable ? ' verification-unreachable' : ''}`}
                  style={{
                    left: room.x,
                    top: room.y,
                    width: ROOM_WIDTH,
                    height: roomHeight,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRoomClick(room.id, e);
                  }}
                >
                  <span className="verification-distance">
                    {isSource ? '0' : unreachable ? '✕' : dist}
                  </span>
                </div>
              );
            })}
            {/* Author credits */}
            <div className="game-board-credits">
              Patryk Średziński
            </div>
          </div>
        </div>
      </div>
    );
  }
);

GameBoardView.displayName = 'GameBoardView';
