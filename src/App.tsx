import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  RoomData,
  PathConnection,
  PropTileType,
  PathType,
  InitialPlacementValue,
  RoomColor,
  RoomSize,
  PortSide,
  PROP_TILE_LIMITS,
  PROP_TILE_COLORS,
  PROP_TILE_TYPES,
  GAME_BOARD_WIDTH,
  GAME_BOARD_HEIGHT,
  ROOM_WIDTH,
  ROOM_HEIGHT_SMALL,
  ROOM_HEIGHT_LARGE,
  PATH_COLORS,
  PATH_TYPE_OPTIONS,
  INITIAL_PLACEMENT_VALUES,
  ROOM_COLOR_OPTIONS,
  ROOM_COLORS,
  MAX_BREAKABLE_WALLS,
  BOARD_MARGIN,
  BOARD_EDGE_PADDING,
} from './types';
import { useI18n } from './i18n';
import { exportGameBoardAsImage, PdfFormat } from './utils/exportMap';
import { exportDbdMap, importDbdMap, downloadDbdMap } from './utils/dbdmapFormat';
import { GameBoardView } from './components/MapView';
import { ContextMenu, MenuItemDef } from './components/ContextMenu';
import { Sidebar } from './components/Sidebar';
import { StartScreen } from './components/StartScreen';
import { getClosestPointOnPerimeter } from './components/PathOverlay';
import './index.css';

/* ============ Default assets ============ */

import initialGameboardUrl from './assets/initial-gameboard.dbdmap?url';
import initialPlacement0 from './assets/spawn/spawn0.png';
import initialPlacement1 from './assets/spawn/spawn1.png';
import initialPlacement2 from './assets/spawn/spawn2.png';
import initialPlacement3 from './assets/spawn/spawn3.png';
import initialPlacement4 from './assets/spawn/spawn4.png';
import initialPlacement5 from './assets/spawn/spawn5.png';
import initialPlacementOff from './assets/spawn/spawnoff.png';

// Movement icons for path types
import sneakIcon from './assets/movement/walk.png';
import sprintIcon from './assets/movement/sprint.png';
import crouchIcon from './assets/movement/crouch.png';
import vaultIcon from './assets/movement/jump.png';

// Prop tile icons
import objectiveIcon from './assets/score/objective-tinted.png';
import boldnessIcon from './assets/score/boldness-tinted.png';
import survivalIcon from './assets/score/survival-tinted.png';
import altruismIcon from './assets/score/altruism-tinted.png';

const PROP_TILE_ICONS: Record<PropTileType, string> = {
  objective: objectiveIcon,
  boldness: boldnessIcon,
  survival: survivalIcon,
  altruism: altruismIcon,
};

const INITIAL_PLACEMENT_ICONS: Record<number | 'off', string> = {
  0: initialPlacement0,
  1: initialPlacement1,
  2: initialPlacement2,
  3: initialPlacement3,
  4: initialPlacement4,
  5: initialPlacement5,
  off: initialPlacementOff,
};

const PATH_TYPE_ICONS: Record<PathType, string> = {
  blue: sneakIcon,
  green: sprintIcon,
  red: crouchIcon,
  yellow: vaultIcon,
};


/* ============ Types ============ */

type CtxMenuState =
  | { type: 'gameBoard'; x: number; y: number; boardX: number; boardY: number }
  | { type: 'room'; x: number; y: number; roomId: string }
  | { type: 'path'; x: number; y: number; pathId: string };

interface DragState {
  type: 'room' | 'pathIcon' | 'pathPort';
  id: string;
  startMouseX: number;
  startMouseY: number;
  startObjX: number;
  startObjY: number;
  // For port dragging
  portType?: 'exit' | 'entry';
  // Track if mouse actually moved (to distinguish click from drag)
  didDrag?: boolean;
}

/* ============ App ============ */

export default function App() {
  const { t, propTileLabel, pathLabel } = useI18n();

  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [paths, setPaths] = useState<PathConnection[]>([]);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showStartScreen, setShowStartScreen] = useState(true);
  const [validationErrors, setValidationErrors] = useState<{ message: string; description: string }[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showFormatPicker, setShowFormatPicker] = useState(false);

  // Verification mode
  const [verificationMode, setVerificationMode] = useState(false);
  const [verificationSourceRoom, setVerificationSourceRoom] = useState<string | null>(null);
  
  // File input ref for .dbdmap import
  const importInputRef = useRef<HTMLInputElement>(null);

  // Context menu
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);

  // Connect mode - stores room ID and selected path type
  const [connectingFrom, setConnectingFrom] = useState<{ roomId: string; pathType: PathType } | null>(null);

  // Mouse position for connect mode tooltip
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Inline name editing
  const [editingNameId, setEditingNameId] = useState<string | null>(null);

  // Drag state
  const [dragging, setDragging] = useState<DragState | null>(null);
  const draggingRef = useRef<DragState | null>(null);

  // Refs
  const gameBoardRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(0.5);
  const getGameBoardRectRef = useRef<(() => DOMRect | null) | null>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const roomInputRef = useRef<HTMLInputElement>(null);
  const roomInputTargetRef = useRef<string | null>(null);
  // Flag to prevent board click from firing after a room/path click-open
  const skipNextBoardClickRef = useRef(false);

  /* ============ Verification mode: BFS distances ============ */

  const verificationDistances = useMemo<Record<string, number>>(() => {
    if (!verificationMode || !verificationSourceRoom) return {};
    const sourceExists = rooms.some((r) => r.id === verificationSourceRoom);
    if (!sourceExists) return {};

    // Build adjacency list: non-yellow paths are bidirectional, yellow are from→to only.
    // Paths with breakable walls are impassable.
    const adj = new Map<string, Set<string>>();
    for (const room of rooms) adj.set(room.id, new Set());

    for (const path of paths) {
      if (path.hasBreakableWall) continue;
      adj.get(path.from)?.add(path.to);
      if (path.color !== 'yellow') {
        adj.get(path.to)?.add(path.from);
      }
    }

    const dist: Record<string, number> = {};
    const queue: string[] = [verificationSourceRoom];
    dist[verificationSourceRoom] = 0;

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = adj.get(current);
      if (!neighbors) continue;
      for (const neighbor of neighbors) {
        if (dist[neighbor] === undefined) {
          dist[neighbor] = dist[current] + 1;
          queue.push(neighbor);
        }
      }
    }

    return dist;
  }, [verificationMode, verificationSourceRoom, rooms, paths]);

  /* ============ Close menu ============ */

  const closeMenu = useCallback(() => setCtxMenu(null), []);

  /* ============ Start screen actions ============ */

  const handleLoadExample = useCallback(async () => {
    try {
      const response = await fetch(initialGameboardUrl);
      const blob = await response.blob();
      const file = new File([blob], 'initial-gameboard.dbdmap');
      const data = await importDbdMap(file);
      if (data) {
        setRooms(data.rooms);
        setPaths(data.paths);
        if (data.backgroundImage) {
          setBackgroundImage(data.backgroundImage);
        }
      }
    } catch (err) {
      console.error('Failed to load example gameboard:', err);
    }
    setShowStartScreen(false);
  }, []);

  const handleStartFresh = useCallback(() => {
    setRooms([]);
    setPaths([]);
    setBackgroundImage(null);
    setShowStartScreen(false);
  }, []);

  const handleStartImport = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  /* ============ Background image ============ */

  const handleBgFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => setBackgroundImage(reader.result as string);
        reader.readAsDataURL(file);
      }
      e.target.value = '';
    },
    []
  );

  /* ============ Room image ============ */

  const handleRoomFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      const targetId = roomInputTargetRef.current;
      if (file && targetId) {
        const reader = new FileReader();
        reader.onload = () => {
          setRooms((prev) =>
            prev.map((r) =>
              r.id === targetId ? { ...r, image: reader.result as string } : r
            )
          );
        };
        reader.readAsDataURL(file);
      }
      e.target.value = '';
      roomInputTargetRef.current = null;
    },
    []
  );

  /* ============ Validation ============ */

  const validateGameBoard = useCallback((): { message: string; description: string }[] => {
    const errors: { message: string; description: string }[] = [];

    // Check initial placements (0-5 must all be assigned)
    const assignedPlacements = new Set(
      rooms.map((r) => r.initialPlacement).filter((p) => p !== null)
    );
    const missingPlacements = INITIAL_PLACEMENT_VALUES.filter((p) => !assignedPlacements.has(p));
    if (missingPlacements.length > 0) {
      errors.push({
        message: `${t.validationMissingInitialPlacements} ${missingPlacements.join(', ')}`,
        description: t.validationMissingInitialPlacementsDesc || '',
      });
    }

    // Check prop tiles (all must be used, none can exceed limit)
    const missingPropTiles: string[] = [];
    const excessPropTiles: string[] = [];
    for (const type of PROP_TILE_TYPES) {
      const totalUsed = rooms.reduce((s, r) => s + r.propTiles[type], 0);
      const diff = PROP_TILE_LIMITS[type] - totalUsed;
      if (diff > 0) {
        missingPropTiles.push(`${propTileLabel(type)} (${diff})`);
      } else if (diff < 0) {
        excessPropTiles.push(`${propTileLabel(type)} (${totalUsed}/${PROP_TILE_LIMITS[type]})`);
      }
    }
    if (missingPropTiles.length > 0) {
      errors.push({
        message: `${t.validationMissingPropTiles} ${missingPropTiles.join(', ')}`,
        description: t.validationMissingPropTilesDesc || '',
      });
    }
    if (excessPropTiles.length > 0) {
      errors.push({
        message: `${t.validationExcessPropTiles} ${excessPropTiles.join(', ')}`,
        description: t.validationExcessPropTilesDesc || '',
      });
    }

    // Check paths (every room must have at least one connection)
    const connectedIds = new Set<string>();
    for (const path of paths) {
      connectedIds.add(path.from);
      connectedIds.add(path.to);
    }
    const unconnectedRooms = rooms.filter((r) => !connectedIds.has(r.id));
    if (unconnectedRooms.length > 0) {
      errors.push({
        message: `${t.validationNoConnections} ${unconnectedRooms.map((r) => r.name).join(', ')}`,
        description: t.validationNoConnectionsDesc || '',
      });
    }

    // Check for dead-end rooms (rooms that can only be exited via yellow/vault paths)
    // A room is a dead-end if all paths FROM it are yellow (one-way out)
    // AND it has paths TO it (so players can enter but not leave normally)
    const deadEndRooms: string[] = [];
    for (const room of rooms) {
      // Get all paths where this room is the source (from)
      const pathsFrom = paths.filter((p) => p.from === room.id);
      // Get all non-yellow paths where this room is the destination (to) - ways to enter
      const pathsTo = paths.filter((p) => p.to === room.id);
      // Also include non-yellow paths from this room (bidirectional, so also ways to leave)
      const nonYellowPathsFrom = pathsFrom.filter((p) => p.color !== 'yellow');
      // Non-yellow paths to this room are bidirectional (can also leave through them)
      const nonYellowPathsTo = pathsTo.filter((p) => p.color !== 'yellow');
      
      // Room has connections but no way to leave (all outgoing are yellow, no bidirectional connections)
      const hasIncoming = pathsTo.length > 0 || pathsFrom.some(p => p.color !== 'yellow');
      const hasNonYellowExit = nonYellowPathsFrom.length > 0 || nonYellowPathsTo.length > 0;
      
      if (hasIncoming && !hasNonYellowExit && pathsFrom.length > 0) {
        deadEndRooms.push(room.name);
      }
    }
    if (deadEndRooms.length > 0) {
      errors.push({
        message: `${t.validationDeadEndRooms || 'Rooms with only one-way exits:'} ${deadEndRooms.join(', ')}`,
        description: t.validationDeadEndRoomsDesc || '',
      });
    }

    // Check breakable walls (must have exactly 4)
    const breakableWallCount = paths.filter((p) => p.hasBreakableWall).length;
    if (breakableWallCount < MAX_BREAKABLE_WALLS) {
      const missing = MAX_BREAKABLE_WALLS - breakableWallCount;
      errors.push({
        message: `${t.validationMissingBreakableWalls} ${missing}`,
        description: t.validationMissingBreakableWallsDesc || '',
      });
    }

    return errors;
  }, [rooms, paths, t, propTileLabel]);

  /* ============ Download ============ */

  const handleDownload = useCallback(() => {
    if (!gameBoardRef.current) return;

    const errors = validateGameBoard();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setShowFormatPicker(true);
  }, [validateGameBoard]);

  const handleDownloadWithFormat = useCallback(async (format: PdfFormat) => {
    if (!gameBoardRef.current) return;
    setShowFormatPicker(false);
    setDownloading(true);
    try {
      await exportGameBoardAsImage(gameBoardRef.current, format);
      setSuccessMessage(t.downloadSuccess || 'Game board image downloaded successfully!');
    } catch (err) {
      console.error('Export failed:', err);
      alert(t.exportError);
    } finally {
      setDownloading(false);
    }
  }, [t]);

  /* ============ Import/Export .dbdmap ============ */

  const handleExport = useCallback(async () => {
    setExporting(true);
    setCtxMenu(null);
    try {
      const blob = await exportDbdMap(rooms, paths, backgroundImage);
      downloadDbdMap(blob, 'gameboard.dbdmap');
      setSuccessMessage(t.exportSuccess || 'Game board exported successfully!');
    } catch (err) {
      console.error('Export failed:', err);
      alert(t.exportError || 'Export failed');
    } finally {
      setExporting(false);
    }
  }, [rooms, paths, backgroundImage, t]);

  const handleImportOpen = useCallback(() => {
    setImportError(null);
    importInputRef.current?.click();
    setCtxMenu(null);
  }, []);

  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Reset input so same file can be selected again
    e.target.value = '';

    try {
      const data = await importDbdMap(file);
      if (!data) {
        setImportError(t.importError || 'Invalid .dbdmap file format');
        alert(t.importError || 'Invalid .dbdmap file format');
        return;
      }
      setRooms(data.rooms);
      setPaths(data.paths);
      if (data.backgroundImage) {
        setBackgroundImage(data.backgroundImage);
      }
      setImportError(null);
      setShowStartScreen(false);
    } catch (err) {
      console.error('Import failed:', err);
      setImportError(t.importError || 'Import failed');
      alert(t.importError || 'Import failed');
    }
  }, [t]);

  /* ============ Room CRUD ============ */

  const handleAddRoom = useCallback(
    (boardX: number, boardY: number) => {
      const newRoomId = `room-${Date.now()}`;
      setRooms((prev) => {
        const propTiles = { objective: 0, boldness: 0, survival: 0, altruism: 0 };
        for (const type of PROP_TILE_TYPES) {
          const totalUsed = prev.reduce((s, r) => s + r.propTiles[type], 0);
          if (totalUsed < PROP_TILE_LIMITS[type]) {
            propTiles[type] = 1;
          }
        }
        const x = Math.max(BOARD_EDGE_PADDING, Math.min(GAME_BOARD_WIDTH - ROOM_WIDTH - BOARD_EDGE_PADDING, boardX - ROOM_WIDTH / 2));
        const y = Math.max(BOARD_EDGE_PADDING, Math.min(GAME_BOARD_HEIGHT - ROOM_HEIGHT_SMALL - BOARD_EDGE_PADDING, boardY - ROOM_HEIGHT_SMALL / 2));
        const newRoom: RoomData = {
          id: newRoomId,
          name: `${t.newRoom} ${prev.length + 1}`,
          image: null,
          x,
          y,
          propTiles,
          initialPlacement: null,
          color: 'purple',
          size: 'small',
        };
        return [...prev, newRoom];
      });
      // Automatically enter name editing mode for the new room after it renders
      setTimeout(() => {
        setEditingNameId(newRoomId);
      }, 50);
    },
    [t]
  );

  const handleRemoveRoom = useCallback((id: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== id));
    setPaths((prev) => prev.filter((p) => p.from !== id && p.to !== id));
    setCtxMenu(null);
  }, []);

  const handleToggleRoomSize = useCallback((id: string) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const newSize: RoomSize = r.size === 'large' ? 'small' : 'large';
        const newHeight = newSize === 'large' ? ROOM_HEIGHT_LARGE : ROOM_HEIGHT_SMALL;
        // Ensure room stays within bounds after size change
        const maxY = GAME_BOARD_HEIGHT - newHeight;
        const newY = Math.min(r.y, maxY);
        return { ...r, size: newSize, y: newY };
      })
    );
    setCtxMenu(null);
  }, []);

  /* ============ Initial placement update ============ */

  const handleUpdateInitialPlacement = useCallback(
    (roomId: string, newPlacement: InitialPlacementValue) => {
      setRooms((prev) => {
        // If selecting a placement value (not null), remove it from any other room
        if (newPlacement !== null) {
          return prev.map((r) => {
            if (r.id === roomId) {
              return { ...r, initialPlacement: newPlacement };
            }
            // Remove this placement from other rooms
            if (r.initialPlacement === newPlacement) {
              return { ...r, initialPlacement: null };
            }
            return r;
          });
        }
        // If setting to null (no placement)
        return prev.map((r) =>
          r.id === roomId ? { ...r, initialPlacement: null } : r
        );
      });
    },
    []
  );

  /* ============ Room color update ============ */

  const handleUpdateRoomColor = useCallback(
    (roomId: string, color: RoomColor) => {
      setRooms((prev) =>
        prev.map((r) =>
          r.id === roomId ? { ...r, color } : r
        )
      );
    },
    []
  );

  /* ============ Prop tile update ============ */

  const handleUpdatePropTile = useCallback(
    (roomId: string, type: PropTileType, delta: number) => {
      setRooms((prev) => {
        const room = prev.find((r) => r.id === roomId);
        if (!room) return prev;
        const newValue = room.propTiles[type] + delta;
        if (newValue < 0) return prev;
        return prev.map((r) =>
          r.id === roomId
            ? { ...r, propTiles: { ...r.propTiles, [type]: newValue } }
            : r
        );
      });
    },
    []
  );

  /* ============ Path CRUD ============ */

  const handleAddPath = useCallback(
    (from: string, to: string, color: PathType) => {
      setPaths((prev) => {
        const exists = prev.some(
          (p) =>
            p.color === color &&
            ((p.from === from && p.to === to) ||
              (color !== 'yellow' && p.from === to && p.to === from))
        );
        if (exists) return prev;
        return [
          ...prev,
          { id: `path-${Date.now()}-${Math.random()}`, from, to, color },
        ];
      });
    },
    []
  );

  const handleRemovePath = useCallback((pathId: string) => {
    setPaths((prev) => prev.filter((p) => p.id !== pathId));
    setCtxMenu(null);
  }, []);

  const handleChangePathType = useCallback(
    (pathId: string, color: PathType) => {
      setPaths((prev) =>
        prev.map((p) => (p.id === pathId ? { ...p, color } : p))
      );
      setCtxMenu(null);
    },
    []
  );

  const handleToggleBreakableWall = useCallback(
    (pathId: string) => {
      setPaths((prev) => {
        const path = prev.find((p) => p.id === pathId);
        if (!path) return prev;

        // If turning on, check if we're at max
        if (!path.hasBreakableWall) {
          const currentWalls = prev.filter((p) => p.hasBreakableWall).length;
          if (currentWalls >= MAX_BREAKABLE_WALLS) return prev;
        }

        return prev.map((p) =>
          p.id === pathId ? { ...p, hasBreakableWall: !p.hasBreakableWall } : p
        );
      });
    },
    []
  );

  const handleUpdatePort = useCallback(
    (pathId: string, portType: 'exit' | 'entry', side: PortSide, offset: number) => {
      setPaths((prev) =>
        prev.map((p) => {
          if (p.id !== pathId) return p;
          if (portType === 'exit') {
            return { ...p, exitPort: { side, offset } };
          } else {
            return { ...p, entryPort: { side, offset } };
          }
        })
      );
    },
    []
  );

  const handleUpdateViaPoint = useCallback(
    (pathId: string, x: number, y: number) => {
      setPaths((prev) =>
        prev.map((p) =>
          p.id === pathId ? { ...p, viaPoint: { x, y } } : p
        )
      );
    },
    []
  );

  /* ============ Context Menu Openers ============ */

  const handleGameBoardContextMenu = useCallback(
    (screenX: number, screenY: number, boardX: number, boardY: number) => {
      if (connectingFrom) {
        setConnectingFrom(null);
        return;
      }
      setCtxMenu({ type: 'gameBoard', x: screenX, y: screenY, boardX, boardY });
    },
    [connectingFrom]
  );

  const handleGameBoardClick = useCallback(
    (_screenX: number, _screenY: number, _boardX: number, _boardY: number) => {
      // Skip if a room/path click already opened a menu
      if (skipNextBoardClickRef.current) {
        skipNextBoardClickRef.current = false;
        return;
      }
      if (connectingFrom) {
        setConnectingFrom(null);
        return;
      }
      // Left-click on background does nothing
    },
    [connectingFrom]
  );

  const handleRoomContextMenu = useCallback(
    (screenX: number, screenY: number, roomId: string) => {
      if (connectingFrom) {
        setConnectingFrom(null);
        return;
      }
      setCtxMenu({ type: 'room', x: screenX, y: screenY, roomId });
    },
    [connectingFrom]
  );

  const handlePathContextMenu = useCallback(
    (screenX: number, screenY: number, pathId: string) => {
      setCtxMenu({ type: 'path', x: screenX, y: screenY, pathId });
    },
    []
  );

  /* ============ Compute menu items from live state ============ */

  const getCtxMenuItems = (): MenuItemDef[] => {
    if (!ctxMenu) return [];

    if (ctxMenu.type === 'gameBoard') {
      return [
        {
          label: t.addRoom,
          onClick: () => {
            handleAddRoom(ctxMenu.boardX, ctxMenu.boardY);
            closeMenu();
          },
        },
        {
          label: t.changeBackground,
          onClick: () => {
            bgInputRef.current?.click();
            closeMenu();
          },
        },
        { label: '', separator: true },
        {
          label: t.exportGameBoard || 'Export Game Board',
          onClick: handleExport,
        },
        {
          label: t.importGameBoard || 'Import Game Board',
          onClick: handleImportOpen,
        },
        { label: '', separator: true },
        {
          label: t.clearGameBoard || 'Clear Game Board',
          danger: true,
          onClick: () => {
            closeMenu();
            setShowClearConfirm(true);
          },
        },
        { label: '', separator: true },
        {
          label: downloading ? t.downloading : t.downloadGameBoard,
          onClick: () => {
            handleDownload();
            closeMenu();
          },
          disabled: downloading,
        },
      ];
    }

    if (ctxMenu.type === 'room') {
      const room = rooms.find((r) => r.id === ctxMenu.roomId);
      if (!room) return [];
      const roomId = ctxMenu.roomId;

      return [
        {
          label: t.changeImage,
          onClick: () => {
            roomInputTargetRef.current = roomId;
            roomInputRef.current?.click();
            closeMenu();
          },
        },
        {
          label: t.connectTo,
          render: () => (
            <div style={{ paddingBottom: 2, paddingTop: 2 }}>
              <div
                style={{
                  fontSize: 11,
                  color: '#888',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                {t.connectTo}
              </div>
              <div className="ctx-path-type-options">
                {PATH_TYPE_OPTIONS.map((pathType) => (
                  <button
                    key={pathType}
                    className="ctx-path-type-btn"
                    title={pathLabel(pathType)}
                    style={{ borderColor: PATH_COLORS[pathType] }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setConnectingFrom({ roomId, pathType });
                      closeMenu();
                    }}
                  >
                    <img src={PATH_TYPE_ICONS[pathType]} alt={pathLabel(pathType)} />
                  </button>
                ))}
              </div>
            </div>
          ),
        },
        { label: '', separator: true },
        {
          label: t.propTiles,
          render: () => (
            <div style={{ paddingBottom: 2, paddingTop: 2 }}>
              <div
                style={{
                  fontSize: 11,
                  color: '#888',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 4,
                  fontWeight: 600,
                }}
              >
                {t.propTiles}
              </div>
              {PROP_TILE_TYPES.map((type: PropTileType) => {
                const totalUsed = rooms.reduce(
                  (s, r) => s + r.propTiles[type],
                  0
                );
                const remaining = PROP_TILE_LIMITS[type] - totalUsed;
                const current = room.propTiles[type];
                return (
                  <div key={type} className="ctx-prop-tile-row">
                    <img
                      className="ctx-prop-tile-icon"
                      src={PROP_TILE_ICONS[type]}
                      alt={propTileLabel(type)}
                    />
                    <span className="ctx-prop-tile-label">
                      {propTileLabel(type)}
                    </span>
                    <button
                      className="ctx-prop-tile-btn"
                      disabled={current <= 0}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleUpdatePropTile(roomId, type, -1);
                      }}
                    >
                      -
                    </button>
                    <span className="ctx-prop-tile-count">{current}</span>
                    <button
                      className="ctx-prop-tile-btn"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleUpdatePropTile(roomId, type, +1);
                      }}
                    >
                      +
                    </button>
                  </div>
                );
              })}
            </div>
          ),
        },
        { label: '', separator: true },
        {
          label: t.initialPlacement,
          render: () => (
            <div style={{ paddingBottom: 2, paddingTop: 2 }}>
              <div
                style={{
                  fontSize: 11,
                  color: '#888',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                {t.initialPlacement}
              </div>
              <div className="ctx-initial-placement-options">
                {/* No placement option */}
                <label className="ctx-initial-placement-option">
                  <input
                    type="radio"
                    name={`placement-${roomId}`}
                    checked={room.initialPlacement === null}
                    onChange={() => handleUpdateInitialPlacement(roomId, null)}
                  />
                  <img src={INITIAL_PLACEMENT_ICONS.off} alt="No placement" className="ctx-initial-placement-icon" />
                </label>
                {/* Placement 0-5 options */}
                {INITIAL_PLACEMENT_VALUES.map((placementVal) => {
                  const isUsedElsewhere = rooms.some(
                    (r) => r.id !== roomId && r.initialPlacement === placementVal
                  );
                  return (
                    <label
                      key={placementVal}
                      className={`ctx-initial-placement-option${isUsedElsewhere ? ' ctx-initial-placement-used' : ''}`}
                      title={isUsedElsewhere ? 'Used by another room' : `Placement ${placementVal}`}
                    >
                      <input
                        type="radio"
                        name={`placement-${roomId}`}
                        checked={room.initialPlacement === placementVal}
                        onChange={() => handleUpdateInitialPlacement(roomId, placementVal)}
                      />
                      <img
                        src={INITIAL_PLACEMENT_ICONS[placementVal]}
                        alt={`Placement ${placementVal}`}
                        className="ctx-initial-placement-icon"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          ),
        },
        { label: '', separator: true },
        {
          label: t.roomColor || 'Color',
          render: () => (
            <div style={{ paddingBottom: 2, paddingTop: 2 }}>
              <div
                style={{
                  fontSize: 11,
                  color: '#888',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                {t.roomColor || 'Color'}
              </div>
              <div className="ctx-room-colors">
                {ROOM_COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    className={`ctx-room-color-btn${room.color === color ? ' active' : ''}`}
                    title={color}
                    style={{
                      backgroundColor: ROOM_COLORS[color].header,
                      borderColor: ROOM_COLORS[color].border,
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleUpdateRoomColor(roomId, color);
                    }}
                  />
                ))}
              </div>
            </div>
          ),
        },
        { label: '', separator: true },
        {
          label: room.size === 'large' 
            ? (t.roomSizeSmall || 'Small Room') 
            : (t.roomSizeLarge || 'Large Room'),
          onClick: () => handleToggleRoomSize(roomId),
        },
        { label: '', separator: true },
        {
          label: t.deleteRoom,
          danger: true,
          onClick: () => handleRemoveRoom(roomId),
        },
      ];
    }

    if (ctxMenu.type === 'path') {
      const path = paths.find((p) => p.id === ctxMenu.pathId);
      if (!path) return [];
      const pathId = ctxMenu.pathId;

      return [
        {
          label: t.pathType,
          render: () => (
            <div style={{ paddingBottom: 2, paddingTop: 2 }}>
              <div
                style={{
                  fontSize: 11,
                  color: '#888',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                {t.pathType}
              </div>
              <div className="ctx-path-type-options">
                {PATH_TYPE_OPTIONS.map((color) => (
                  <button
                    key={color}
                    className={`ctx-path-type-btn${path.color === color ? ' ctx-path-type-active' : ''}`}
                    title={pathLabel(color)}
                    style={{ borderColor: PATH_COLORS[color] }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleChangePathType(pathId, color);
                    }}
                  >
                    <img src={PATH_TYPE_ICONS[color]} alt={pathLabel(color)} />
                  </button>
                ))}
              </div>
            </div>
          ),
        },
        { label: '', separator: true },
        {
          label: t.breakableWall || 'Breakable Wall',
          render: () => {
            const currentWalls = paths.filter((p) => p.hasBreakableWall).length;
            const canAddWall = path.hasBreakableWall || currentWalls < MAX_BREAKABLE_WALLS;
            return (
              <div style={{ paddingBottom: 2, paddingTop: 2 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: '#888',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    marginBottom: 6,
                    fontWeight: 600,
                  }}
                >
                  {t.breakableWall || 'Breakable Wall'} ({currentWalls}/{MAX_BREAKABLE_WALLS})
                </div>
                <div className="ctx-breakable-wall-toggle">
                  <button
                    className={`ctx-breakable-wall-btn${!path.hasBreakableWall ? ' active' : ''}`}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      if (path.hasBreakableWall) handleToggleBreakableWall(pathId);
                    }}
                  >
                    {t.breakableWallOff || 'OFF'}
                  </button>
                  <button
                    className={`ctx-breakable-wall-btn${path.hasBreakableWall ? ' active' : ''}${!canAddWall ? ' disabled' : ''}`}
                    disabled={!canAddWall}
                    title={!canAddWall ? (t.breakableWallMaxReached || 'Maximum 4 breakable walls reached') : ''}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      if (!path.hasBreakableWall && canAddWall) handleToggleBreakableWall(pathId);
                    }}
                  >
                    {t.breakableWallOn || 'ON'}
                  </button>
                </div>
              </div>
            );
          },
        },
        { label: '', separator: true },
        {
          label: t.deletePath,
          danger: true,
          onClick: () => handleRemovePath(pathId),
        },
      ];
    }

    return [];
  };

  const ctxMenuItems = getCtxMenuItems();

  /* ============ Connect mode click ============ */

  const handleRoomClick = useCallback(
    (roomId: string, _e: React.MouseEvent) => {
      if (verificationMode) {
        setVerificationSourceRoom(roomId);
        return;
      }
      if (!connectingFrom || connectingFrom.roomId === roomId) return;

      const toId = roomId;
      const fromId = connectingFrom.roomId;
      const pathType = connectingFrom.pathType;
      setConnectingFrom(null);

      handleAddPath(fromId, toId, pathType);
    },
    [connectingFrom, handleAddPath, verificationMode]
  );

  /* ============ Drag: room & path icon/port ============ */

  const handleRoomMouseDown = useCallback(
    (e: React.MouseEvent, roomId: string) => {
      if (verificationMode) return;
      if (connectingFrom !== null) return;
      if (e.button !== 0) return;
      e.preventDefault();
      const room = rooms.find((r) => r.id === roomId);
      if (!room) return;

      const state: DragState = {
        type: 'room',
        id: roomId,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startObjX: room.x,
        startObjY: room.y,
      };
      setDragging(state);
      draggingRef.current = state;
    },
    [rooms, connectingFrom, verificationMode]
  );

  const handleIconMouseDown = useCallback(
    (e: React.MouseEvent, pathId: string) => {
      if (e.button !== 0) return;
      e.preventDefault();

      const state: DragState = {
        type: 'pathIcon',
        id: pathId,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startObjX: 0,
        startObjY: 0,
      };
      setDragging(state);
      draggingRef.current = state;
    },
    []
  );

  const handlePortMouseDown = useCallback(
    (e: React.MouseEvent, pathId: string, portType: 'exit' | 'entry') => {
      if (e.button !== 0) return;
      e.preventDefault();

      const state: DragState = {
        type: 'pathPort',
        id: pathId,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startObjX: 0,
        startObjY: 0,
        portType,
      };
      setDragging(state);
      draggingRef.current = state;
    },
    []
  );

  useEffect(() => {
    if (!dragging) return;

    const DRAG_THRESHOLD = 5; // pixels before considered a drag

    const handleMouseMove = (e: MouseEvent) => {
      const d = draggingRef.current;
      if (!d) return;
      const s = scaleRef.current;

      // Check if mouse moved enough to count as a drag
      const pixelDx = Math.abs(e.clientX - d.startMouseX);
      const pixelDy = Math.abs(e.clientY - d.startMouseY);
      if (!d.didDrag && (pixelDx > DRAG_THRESHOLD || pixelDy > DRAG_THRESHOLD)) {
        d.didDrag = true;
      }
      if (!d.didDrag) return;

      const dx = (e.clientX - d.startMouseX) / s;
      const dy = (e.clientY - d.startMouseY) / s;

      if (d.type === 'room') {
        // Find the room to get its size
        const room = rooms.find((r) => r.id === d.id);
        const roomHeight = room?.size === 'large' ? ROOM_HEIGHT_LARGE : ROOM_HEIGHT_SMALL;
        
        const newX = Math.max(
          BOARD_EDGE_PADDING,
          Math.min(GAME_BOARD_WIDTH - ROOM_WIDTH - BOARD_EDGE_PADDING, d.startObjX + dx)
        );
        const newY = Math.max(
          BOARD_EDGE_PADDING,
          Math.min(GAME_BOARD_HEIGHT - roomHeight - BOARD_EDGE_PADDING, d.startObjY + dy)
        );
        setRooms((prev) =>
          prev.map((r) =>
            r.id === d.id ? { ...r, x: newX, y: newY } : r
          )
        );
      } else if (d.type === 'pathIcon') {
        // Move icon to mouse position - path will route through it
        const boardContainer = document.querySelector('.game-board-container');
        if (!boardContainer) return;
        const rect = boardContainer.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) / s;
        const mouseY = (e.clientY - rect.top) / s;

        // Clamp to board bounds
        const clampedX = Math.max(BOARD_MARGIN, Math.min(GAME_BOARD_WIDTH - BOARD_MARGIN, mouseX));
        const clampedY = Math.max(BOARD_MARGIN, Math.min(GAME_BOARD_HEIGHT - BOARD_MARGIN, mouseY));
        
        handleUpdateViaPoint(d.id, clampedX, clampedY);
      } else if (d.type === 'pathPort' && d.portType) {
        // Drag port anywhere around room perimeter
        const path = paths.find(p => p.id === d.id);
        if (!path) return;
        
        const isExit = d.portType === 'exit';
        const roomId = isExit ? path.from : path.to;
        const room = rooms.find(r => r.id === roomId);
        if (!room) return;

        // Get mouse position in game board coordinates
        const boardContainer = document.querySelector('.game-board-container');
        if (!boardContainer) return;
        const rect = boardContainer.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) / s;
        const mouseY = (e.clientY - rect.top) / s;

        // Find closest point on room perimeter
        const closest = getClosestPointOnPerimeter(room, { x: mouseX, y: mouseY });
        
        handleUpdatePort(d.id, d.portType, closest.side, closest.offset);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const d = draggingRef.current;
      if (d) {
        if (!d.didDrag) {
          // It was a click, not a drag — open the context menu
          if (d.type === 'room') {
            setCtxMenu({ type: 'room', x: e.clientX, y: e.clientY, roomId: d.id });
            skipNextBoardClickRef.current = true;
          } else if (d.type === 'pathIcon') {
            setCtxMenu({ type: 'path', x: e.clientX, y: e.clientY, pathId: d.id });
            skipNextBoardClickRef.current = true;
          }
        } else {
          // It was a drag — suppress the board click event that follows mouseup
          skipNextBoardClickRef.current = true;
        }
      }
      setDragging(null);
      draggingRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, paths, rooms, handleUpdateViaPoint, handleUpdatePort]);

  /* ============ Name editing ============ */

  const handleNameClick = useCallback(
    (roomId: string) => {
      if (connectingFrom !== null) return;
      setEditingNameId(roomId);
    },
    [connectingFrom]
  );

  const handleNameChange = useCallback(
    (roomId: string, name: string) => {
      if (name.trim()) {
        setRooms((prev) =>
          prev.map((r) => (r.id === roomId ? { ...r, name: name.trim() } : r))
        );
      }
    },
    []
  );

  const handleNameBlur = useCallback(() => {
    setEditingNameId(null);
  }, []);

  /* ============ Escape to cancel connect mode ============ */

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (connectingFrom) setConnectingFrom(null);
        if (verificationMode) {
          setVerificationMode(false);
          setVerificationSourceRoom(null);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [connectingFrom, verificationMode]);

  // Always track mouse position so tooltip can appear immediately
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
      if (connectingFrom) {
        setMousePos({ x: e.clientX, y: e.clientY });
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [connectingFrom]);

  // Set initial tooltip position from ref when connect mode starts
  useEffect(() => {
    if (connectingFrom) {
      setMousePos(mousePosRef.current);
    }
  }, [connectingFrom]);

  /* ============ Sidebar handlers ============ */

  const handleSidebarAddRoom = useCallback(() => {
    // Add room at center of board
    handleAddRoom(GAME_BOARD_WIDTH / 2, GAME_BOARD_HEIGHT / 2);
  }, [handleAddRoom]);

  const handleSidebarChangeBackground = useCallback(() => {
    bgInputRef.current?.click();
  }, []);

  const handleSidebarClear = useCallback(() => {
    setShowClearConfirm(true);
  }, []);

  /* ============ Render ============ */

  if (showStartScreen) {
    return (
      <div className="app">
        <input
          ref={importInputRef}
          type="file"
          accept=".dbdmap"
          style={{ display: 'none' }}
          onChange={handleImportFile}
        />
        <StartScreen
          onLoadExample={handleLoadExample}
          onImport={handleStartImport}
          onStartFresh={handleStartFresh}
        />
      </div>
    );
  }

  return (
    <div className="app">
      {/* Hidden file inputs */}
      <input
        ref={bgInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleBgFileChange}
      />
      <input
        ref={roomInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleRoomFileChange}
      />
      <input
        ref={importInputRef}
        type="file"
        accept=".dbdmap"
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />

      <Sidebar
        downloading={downloading}
        exporting={exporting}
        rooms={rooms}
        paths={paths}
        verificationMode={verificationMode}
        onAddRoom={handleSidebarAddRoom}
        onChangeBackground={handleSidebarChangeBackground}
        onExport={handleExport}
        onImport={handleImportOpen}
        onClear={handleSidebarClear}
        onDownload={handleDownload}
        onToggleVerification={() => {
          setVerificationMode((v) => !v);
          if (verificationMode) setVerificationSourceRoom(null);
        }}
      />

      <div className="game-board-section">
        <GameBoardView
          ref={gameBoardRef}
          backgroundImage={backgroundImage}
          rooms={rooms}
          paths={paths}
          connectingFrom={connectingFrom?.roomId ?? null}
          editingNameId={editingNameId}
          draggingId={dragging?.type === 'room' ? dragging.id : null}
          verificationMode={verificationMode}
          verificationDistances={verificationDistances}
          verificationSourceRoom={verificationSourceRoom}
          onGameBoardContextMenu={handleGameBoardContextMenu}
          onGameBoardClick={handleGameBoardClick}
          onRoomContextMenu={handleRoomContextMenu}
          onPathContextMenu={handlePathContextMenu}
          onRoomMouseDown={handleRoomMouseDown}
          onIconMouseDown={handleIconMouseDown}
          onPortMouseDown={handlePortMouseDown}
          onNameClick={handleNameClick}
          onNameChange={handleNameChange}
          onNameBlur={handleNameBlur}
          onRoomClick={handleRoomClick}
          scaleRef={scaleRef}
          getGameBoardRect={getGameBoardRectRef}
        />
      </div>

      {/* Context Menu */}
      {ctxMenu && ctxMenuItems.length > 0 && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={ctxMenuItems}
          onClose={closeMenu}
        />
      )}

      {/* Connect mode cursor tooltip */}
      {connectingFrom && (
        <div
          className="connect-tooltip"
          style={{
            left: mousePos.x + 16,
            top: mousePos.y + 16,
          }}
        >
          {t.connectModeHint}
        </div>
      )}

      {/* Verification mode hint banner */}
      {verificationMode && !verificationSourceRoom && (
        <div className="verification-hint-banner">
          {t.verificationModeHint}
        </div>
      )}

      {/* Validation Error Modal */}
      {validationErrors && (
        <div className="validation-modal-overlay" onClick={() => setValidationErrors(null)}>
          <div className="validation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="validation-modal-header">
              <span className="validation-modal-icon">⚠️</span>
              <h2>{t.validationError}</h2>
            </div>
            <div className="validation-modal-content">
              {validationErrors.map((error, i) => (
                <div key={i} className="validation-error-item" title={error.description}>
                  <div className="validation-error-message">{error.message}</div>
                  {error.description && (
                    <div className="validation-error-description">{error.description}</div>
                  )}
                </div>
              ))}
            </div>
            <button
              className="validation-modal-close"
              onClick={() => setValidationErrors(null)}
            >
              {t.validationClose}
            </button>
          </div>
        </div>
      )}

      {/* Clear Game Board Confirmation Modal */}
      {showClearConfirm && (
        <div className="validation-modal-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="validation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="validation-modal-header">
              <span className="validation-modal-icon">⚠️</span>
              <h2>{t.clearGameBoard}</h2>
            </div>
            <div className="validation-modal-content">
              <p className="success-message">{t.clearGameBoardConfirm}</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                className="validation-modal-close"
                onClick={() => setShowClearConfirm(false)}
              >
                {t.cancel}
              </button>
              <button
                className="validation-modal-close"
                style={{ backgroundColor: '#cc3333', borderColor: '#cc3333' }}
                onClick={() => {
                  setRooms([]);
                  setPaths([]);
                  setBackgroundImage(null);
                  setShowClearConfirm(false);
                }}
              >
                {t.clearGameBoard}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Format Picker Modal */}
      {showFormatPicker && (
        <div className="validation-modal-overlay" onClick={() => setShowFormatPicker(false)}>
          <div className="validation-modal format-modal" onClick={(e) => e.stopPropagation()}>
            <div className="validation-modal-header format-modal-header">
              <span className="validation-modal-icon">📄</span>
              <h2>{t.downloadFormatTitle}</h2>
            </div>
            <div className="format-options">
              <button
                className="format-option"
                onClick={() => handleDownloadWithFormat('a2')}
              >
                <span className="format-option-label">{t.downloadFormatA2}</span>
                <span className="format-option-desc">{t.downloadFormatA2Desc}</span>
              </button>
              <button
                className="format-option"
                onClick={() => handleDownloadWithFormat('2xa3')}
              >
                <span className="format-option-label">{t.downloadFormat2xA3}</span>
                <span className="format-option-desc">{t.downloadFormat2xA3Desc}</span>
              </button>
            </div>
            <button
              className="validation-modal-close"
              onClick={() => setShowFormatPicker(false)}
            >
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Success Message Modal */}
      {successMessage && (
        <div className="validation-modal-overlay" onClick={() => setSuccessMessage(null)}>
          <div className="validation-modal success-modal" onClick={(e) => e.stopPropagation()}>
            <div className="validation-modal-header">
              <span className="validation-modal-icon">✅</span>
              <h2>{t.success || 'Success'}</h2>
            </div>
            <div className="validation-modal-content">
              <p className="success-message">{successMessage}</p>
            </div>
            <button
              className="validation-modal-close"
              onClick={() => setSuccessMessage(null)}
            >
              {t.ok || 'OK'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
