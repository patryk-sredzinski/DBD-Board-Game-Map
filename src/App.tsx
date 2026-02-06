import { useState, useRef, useCallback, useEffect } from 'react';
import {
  LocationData,
  PathConnection,
  MarkerType,
  PathColor,
  SpawnValue,
  TileColor,
  MARKER_LIMITS,
  MARKER_COLORS,
  MARKER_TYPES,
  MAP_WIDTH,
  MAP_HEIGHT,
  TILE_WIDTH,
  TILE_HEIGHT,
  PATH_COLORS,
  PATH_COLOR_OPTIONS,
  SPAWN_VALUES,
  TILE_COLOR_OPTIONS,
  TILE_COLORS,
  MAX_DOORS,
} from './types';
import { useI18n } from './i18n';
import { generateRandomPositions } from './utils/placement';
import { exportMapAsImage } from './utils/exportMap';
import { MapView } from './components/MapView';
import { ContextMenu, MenuItemDef } from './components/ContextMenu';
import './index.css';

/* ============ Default assets ============ */

import defaultBg from './assets/background/background.png';
import spawn0 from './assets/spawn/spawn0.png';
import spawn1 from './assets/spawn/spawn1.png';
import spawn2 from './assets/spawn/spawn2.png';
import spawn3 from './assets/spawn/spawn3.png';
import spawn4 from './assets/spawn/spawn4.png';
import spawn5 from './assets/spawn/spawn5.png';
import spawnOff from './assets/spawn/spawnoff.png';

const SPAWN_ICONS: Record<number | 'off', string> = {
  0: spawn0,
  1: spawn1,
  2: spawn2,
  3: spawn3,
  4: spawn4,
  5: spawn5,
  off: spawnOff,
};

import imgCoalTower from './assets/locations/IconMap_Ind_CoalTower.webp';
import imgScrapyard from './assets/locations/IconMap_Jnk_Scrapyard.webp';
import imgCornfield from './assets/locations/IconMap_Frm_Cornfield.webp';
import imgPaleRose from './assets/locations/IconMap_Swp_ThePaleRose.webp';
import imgTreatment from './assets/locations/IconMap_Hos_Treatment.webp';
import imgCottage from './assets/locations/IconMap_Kny_Cottage.webp';
import imgElmstreet from './assets/locations/IconMap_Eng_Elmstreet.webp';
import imgManor from './assets/locations/IconMap_Hti_Manor.webp';
import imgMadHouse from './assets/locations/IconMap_Brl_MadHouse.webp';
import imgLaboratory from './assets/locations/IconMap_Qat_Laboratory.webp';
import imgRaccoonCity from './assets/locations/IconMap_Ecl_Orionlevel01.webp';

const DEFAULT_LOCATIONS: { name: string; image: string | null }[] = [
  { name: 'Coal Tower', image: imgCoalTower },
  { name: "Wreckers' Yard", image: imgScrapyard },
  { name: 'Rotten Fields', image: imgCornfield },
  { name: 'The Pale Rose', image: imgPaleRose },
  { name: 'Treatment Theatre', image: imgTreatment },
  { name: "Mother's Dwelling", image: imgMadHouse },
  { name: 'Badham Preschool', image: imgElmstreet },
  { name: 'Family Residence', image: imgManor },
  { name: 'Mount Ormond Resort', image: imgCottage },
  { name: 'Raccoon City', image: imgRaccoonCity },
  { name: 'The Underground Complex', image: imgLaboratory },
];

/* ============ Types ============ */

type CtxMenuState =
  | { type: 'map'; x: number; y: number; mapX: number; mapY: number }
  | { type: 'location'; x: number; y: number; locationId: string }
  | { type: 'path'; x: number; y: number; pathId: string }
  | { type: 'colorPicker'; x: number; y: number; fromId: string; toId: string };

interface DragState {
  type: 'location' | 'pathMid';
  id: string;
  startMouseX: number;
  startMouseY: number;
  startObjX: number;
  startObjY: number;
}

/* ============ Initial state ============ */

function createInitialState(): LocationData[] {
  const count = DEFAULT_LOCATIONS.length;
  const positions = generateRandomPositions(count);
  
  // Randomly assign spawns 0-5 to 6 random locations
  const spawnAssignments: (SpawnValue)[] = new Array(count).fill(null);
  const availableSpawns = [...SPAWN_VALUES]; // [0, 1, 2, 3, 4, 5]
  const availableIndices = Array.from({ length: count }, (_, i) => i);
  
  // Shuffle and pick first 6 indices for spawn assignment
  for (let i = availableIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [availableIndices[i], availableIndices[j]] = [availableIndices[j], availableIndices[i]];
  }
  
  // Assign each spawn value to a random location
  for (let i = 0; i < availableSpawns.length && i < count; i++) {
    spawnAssignments[availableIndices[i]] = availableSpawns[i];
  }
  
  return positions.map((pos, i) => ({
    id: `loc-${i}`,
    name: DEFAULT_LOCATIONS[i].name,
    image: DEFAULT_LOCATIONS[i].image,
    x: pos.x,
    y: pos.y,
    markers: { objective: 1, boldness: 1, survival: 1, altruism: 1 },
    spawn: spawnAssignments[i],
    color: 'brown' as TileColor,
  }));
}

/* ============ App ============ */

export default function App() {
  const { t, markerLabel, pathLabel } = useI18n();

  const [locations, setLocations] = useState<LocationData[]>(() =>
    createInitialState()
  );
  const [paths, setPaths] = useState<PathConnection[]>([]);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(
    defaultBg
  );
  const [downloading, setDownloading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[] | null>(null);

  // Context menu
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);

  // Connect mode
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);

  // Inline name editing
  const [editingNameId, setEditingNameId] = useState<string | null>(null);

  // Drag state
  const [dragging, setDragging] = useState<DragState | null>(null);
  const draggingRef = useRef<DragState | null>(null);

  // Refs
  const mapRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(0.5);
  const getMapRectRef = useRef<(() => DOMRect | null) | null>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const tileInputRef = useRef<HTMLInputElement>(null);
  const tileInputTargetRef = useRef<string | null>(null);

  /* ============ Close menu ============ */

  const closeMenu = useCallback(() => setCtxMenu(null), []);

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

  /* ============ Tile image ============ */

  const handleTileFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      const targetId = tileInputTargetRef.current;
      if (file && targetId) {
        const reader = new FileReader();
        reader.onload = () => {
          setLocations((prev) =>
            prev.map((l) =>
              l.id === targetId ? { ...l, image: reader.result as string } : l
            )
          );
        };
        reader.readAsDataURL(file);
      }
      e.target.value = '';
      tileInputTargetRef.current = null;
    },
    []
  );

  /* ============ Validation ============ */

  const validateMap = useCallback((): string[] => {
    const errors: string[] = [];

    // Check spawns (0-5 must all be assigned)
    const assignedSpawns = new Set(
      locations.map((l) => l.spawn).filter((s) => s !== null)
    );
    const missingSpawns = SPAWN_VALUES.filter((s) => !assignedSpawns.has(s));
    if (missingSpawns.length > 0) {
      errors.push(`${t.validationMissingSpawns} ${missingSpawns.join(', ')}`);
    }

    // Check markers (all must be used)
    const missingMarkers: string[] = [];
    for (const type of MARKER_TYPES) {
      const totalUsed = locations.reduce((s, l) => s + l.markers[type], 0);
      const missing = MARKER_LIMITS[type] - totalUsed;
      if (missing > 0) {
        missingMarkers.push(`${markerLabel(type)} (${missing})`);
      }
    }
    if (missingMarkers.length > 0) {
      errors.push(`${t.validationMissingMarkers} ${missingMarkers.join(', ')}`);
    }

    // Check connections (every location must have at least one)
    const connectedIds = new Set<string>();
    for (const path of paths) {
      connectedIds.add(path.from);
      connectedIds.add(path.to);
    }
    const unconnectedLocations = locations.filter((l) => !connectedIds.has(l.id));
    if (unconnectedLocations.length > 0) {
      errors.push(
        `${t.validationNoConnections} ${unconnectedLocations.map((l) => l.name).join(', ')}`
      );
    }

    // Check doors (must have exactly 4)
    const doorCount = paths.filter((p) => p.hasDoor).length;
    if (doorCount < MAX_DOORS) {
      const missing = MAX_DOORS - doorCount;
      errors.push(`${t.validationMissingDoors} ${missing}`);
    }

    return errors;
  }, [locations, paths, t, markerLabel]);

  /* ============ Download ============ */

  const handleDownload = useCallback(async () => {
    if (!mapRef.current) return;

    // Validate first
    const errors = validateMap();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setDownloading(true);
    try {
      await exportMapAsImage(mapRef.current);
    } catch (err) {
      console.error('Export failed:', err);
      alert(t.exportError);
    } finally {
      setDownloading(false);
    }
  }, [t, validateMap]);

  /* ============ Location CRUD ============ */

  const handleAddLocation = useCallback(
    (mapX: number, mapY: number) => {
      setLocations((prev) => {
        const markers = { objective: 0, boldness: 0, survival: 0, altruism: 0 };
        for (const type of MARKER_TYPES) {
          const totalUsed = prev.reduce((s, l) => s + l.markers[type], 0);
          if (totalUsed < MARKER_LIMITS[type]) {
            markers[type] = 1;
          }
        }
        const x = Math.max(0, Math.min(MAP_WIDTH - TILE_WIDTH, mapX - TILE_WIDTH / 2));
        const y = Math.max(0, Math.min(MAP_HEIGHT - TILE_HEIGHT, mapY - TILE_HEIGHT / 2));
        const newLoc: LocationData = {
          id: `loc-${Date.now()}`,
          name: `${t.newLocation} ${prev.length + 1}`,
          image: null,
          x,
          y,
          markers,
          spawn: null,
          color: 'brown',
        };
        return [...prev, newLoc];
      });
    },
    [t]
  );

  const handleRemoveLocation = useCallback((id: string) => {
    setLocations((prev) => prev.filter((l) => l.id !== id));
    setPaths((prev) => prev.filter((p) => p.from !== id && p.to !== id));
    setCtxMenu(null);
  }, []);

  /* ============ Spawn update ============ */

  const handleUpdateSpawn = useCallback(
    (locationId: string, newSpawn: SpawnValue) => {
      setLocations((prev) => {
        // If selecting a spawn value (not null), remove it from any other location
        if (newSpawn !== null) {
          return prev.map((l) => {
            if (l.id === locationId) {
              return { ...l, spawn: newSpawn };
            }
            // Remove this spawn from other locations
            if (l.spawn === newSpawn) {
              return { ...l, spawn: null };
            }
            return l;
          });
        }
        // If setting to null (spawnoff)
        return prev.map((l) =>
          l.id === locationId ? { ...l, spawn: null } : l
        );
      });
    },
    []
  );

  /* ============ Tile color update ============ */

  const handleUpdateTileColor = useCallback(
    (locationId: string, color: TileColor) => {
      setLocations((prev) =>
        prev.map((l) =>
          l.id === locationId ? { ...l, color } : l
        )
      );
    },
    []
  );

  /* ============ Marker update ============ */

  const handleUpdateMarker = useCallback(
    (locationId: string, type: MarkerType, delta: number) => {
      setLocations((prev) => {
        const totalCurrent = prev.reduce((s, l) => s + l.markers[type], 0);
        const location = prev.find((l) => l.id === locationId);
        if (!location) return prev;
        const newValue = location.markers[type] + delta;
        if (newValue < 0) return prev;
        if (delta > 0 && totalCurrent >= MARKER_LIMITS[type]) return prev;
        return prev.map((l) =>
          l.id === locationId
            ? { ...l, markers: { ...l.markers, [type]: newValue } }
            : l
        );
      });
    },
    []
  );

  /* ============ Path CRUD ============ */

  const handleAddPath = useCallback(
    (from: string, to: string, color: PathColor) => {
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

  const handleChangePathColor = useCallback(
    (pathId: string, color: PathColor) => {
      setPaths((prev) =>
        prev.map((p) => (p.id === pathId ? { ...p, color } : p))
      );
      setCtxMenu(null);
    },
    []
  );

  const handleTogglePathDoor = useCallback(
    (pathId: string) => {
      setPaths((prev) => {
        const path = prev.find((p) => p.id === pathId);
        if (!path) return prev;

        // If turning on, check if we're at max
        if (!path.hasDoor) {
          const currentDoors = prev.filter((p) => p.hasDoor).length;
          if (currentDoors >= MAX_DOORS) return prev;
        }

        return prev.map((p) =>
          p.id === pathId ? { ...p, hasDoor: !p.hasDoor } : p
        );
      });
    },
    []
  );

  const handleUpdatePathViaPoint = useCallback(
    (pathId: string, point: { x: number; y: number }) => {
      setPaths((prev) =>
        prev.map((p) =>
          p.id === pathId ? { ...p, viaPoint: point } : p
        )
      );
    },
    []
  );

  /* ============ Context Menu Openers ============ */

  const handleMapContextMenu = useCallback(
    (screenX: number, screenY: number, mapX: number, mapY: number) => {
      if (connectingFrom) {
        setConnectingFrom(null);
        return;
      }
      setCtxMenu({ type: 'map', x: screenX, y: screenY, mapX, mapY });
    },
    [connectingFrom]
  );

  const handleLocationContextMenu = useCallback(
    (screenX: number, screenY: number, locationId: string) => {
      if (connectingFrom) {
        setConnectingFrom(null);
        return;
      }
      setCtxMenu({ type: 'location', x: screenX, y: screenY, locationId });
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

    if (ctxMenu.type === 'map') {
      return [
        {
          label: t.changeBackground,
          onClick: () => {
            bgInputRef.current?.click();
            closeMenu();
          },
        },
        {
          label: downloading ? t.downloading : t.downloadMap,
          onClick: () => {
            handleDownload();
            closeMenu();
          },
          disabled: downloading,
        },
        { label: '', separator: true },
        {
          label: t.addLocation,
          onClick: () => {
            handleAddLocation(ctxMenu.mapX, ctxMenu.mapY);
            closeMenu();
          },
        },
      ];
    }

    if (ctxMenu.type === 'location') {
      const loc = locations.find((l) => l.id === ctxMenu.locationId);
      if (!loc) return [];
      const locationId = ctxMenu.locationId;

      return [
        {
          label: t.changeImage,
          onClick: () => {
            tileInputTargetRef.current = locationId;
            tileInputRef.current?.click();
            closeMenu();
          },
        },
        {
          label: t.connectTo,
          onClick: () => {
            setConnectingFrom(locationId);
            closeMenu();
          },
        },
        { label: '', separator: true },
        {
          label: t.markers,
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
                {t.markers}
              </div>
              {MARKER_TYPES.map((type: MarkerType) => {
                const totalUsed = locations.reduce(
                  (s, l) => s + l.markers[type],
                  0
                );
                const remaining = MARKER_LIMITS[type] - totalUsed;
                const current = loc.markers[type];
                return (
                  <div key={type} className="ctx-marker-row">
                    <span
                      className="ctx-marker-dot"
                      style={{ backgroundColor: MARKER_COLORS[type] }}
                    />
                    <span className="ctx-marker-label">
                      {markerLabel(type)}
                    </span>
                    <button
                      className="ctx-marker-btn"
                      disabled={current <= 0}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleUpdateMarker(locationId, type, -1);
                      }}
                    >
                      -
                    </button>
                    <span className="ctx-marker-count">{current}</span>
                    <button
                      className="ctx-marker-btn"
                      disabled={remaining <= 0}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleUpdateMarker(locationId, type, +1);
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
          label: 'Spawn',
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
                Spawn
              </div>
              <div className="ctx-spawn-options">
                {/* No spawn option */}
                <label className="ctx-spawn-option">
                  <input
                    type="radio"
                    name={`spawn-${locationId}`}
                    checked={loc.spawn === null}
                    onChange={() => handleUpdateSpawn(locationId, null)}
                  />
                  <img src={SPAWN_ICONS.off} alt="No spawn" className="ctx-spawn-icon" />
                </label>
                {/* Spawn 0-5 options */}
                {SPAWN_VALUES.map((spawnVal) => {
                  const isUsedElsewhere = locations.some(
                    (l) => l.id !== locationId && l.spawn === spawnVal
                  );
                  return (
                    <label
                      key={spawnVal}
                      className={`ctx-spawn-option${isUsedElsewhere ? ' ctx-spawn-used' : ''}`}
                      title={isUsedElsewhere ? 'Used by another location' : `Spawn ${spawnVal}`}
                    >
                      <input
                        type="radio"
                        name={`spawn-${locationId}`}
                        checked={loc.spawn === spawnVal}
                        onChange={() => handleUpdateSpawn(locationId, spawnVal)}
                      />
                      <img
                        src={SPAWN_ICONS[spawnVal]}
                        alt={`Spawn ${spawnVal}`}
                        className="ctx-spawn-icon"
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
          label: t.tileColor || 'Color',
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
                {t.tileColor || 'Color'}
              </div>
              <div className="ctx-tile-colors">
                {TILE_COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    className={`ctx-tile-color-btn${loc.color === color ? ' active' : ''}`}
                    title={color}
                    style={{
                      backgroundColor: TILE_COLORS[color].header,
                      borderColor: TILE_COLORS[color].border,
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleUpdateTileColor(locationId, color);
                    }}
                  />
                ))}
              </div>
            </div>
          ),
        },
        { label: '', separator: true },
        {
          label: t.deleteLocation,
          danger: true,
          onClick: () => handleRemoveLocation(locationId),
        },
      ];
    }

    if (ctxMenu.type === 'path') {
      const path = paths.find((p) => p.id === ctxMenu.pathId);
      if (!path) return [];
      const pathId = ctxMenu.pathId;

      return [
        {
          label: t.changeColor,
          render: () => (
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: '#888',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 4,
                  fontWeight: 600,
                  padding: '4px 0',
                }}
              >
                {t.changeColor}
              </div>
              <div className="ctx-colors">
                {PATH_COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    className="ctx-color-btn"
                    title={pathLabel(color)}
                    style={{
                      backgroundColor: PATH_COLORS[color],
                      outline:
                        path.color === color ? '2px solid #fff' : 'none',
                      outlineOffset: 2,
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleChangePathColor(pathId, color);
                    }}
                  />
                ))}
              </div>
            </div>
          ),
        },
        { label: '', separator: true },
        {
          label: t.door || 'Door',
          render: () => {
            const currentDoors = paths.filter((p) => p.hasDoor).length;
            const canAddDoor = path.hasDoor || currentDoors < MAX_DOORS;
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
                  {t.door || 'Door'} ({currentDoors}/{MAX_DOORS})
                </div>
                <div className="ctx-door-toggle">
                  <button
                    className={`ctx-door-btn${!path.hasDoor ? ' active' : ''}`}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      if (path.hasDoor) handleTogglePathDoor(pathId);
                    }}
                  >
                    {t.doorOff || 'OFF'}
                  </button>
                  <button
                    className={`ctx-door-btn${path.hasDoor ? ' active' : ''}${!canAddDoor ? ' disabled' : ''}`}
                    disabled={!canAddDoor}
                    title={!canAddDoor ? (t.doorMaxReached || 'Maximum 4 doors reached') : ''}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      if (!path.hasDoor && canAddDoor) handleTogglePathDoor(pathId);
                    }}
                  >
                    {t.doorOn || 'ON'}
                  </button>
                </div>
              </div>
            );
          },
        },
        { label: '', separator: true },
        {
          label: t.deleteConnection,
          danger: true,
          onClick: () => handleRemovePath(pathId),
        },
      ];
    }

    if (ctxMenu.type === 'colorPicker') {
      const { fromId, toId } = ctxMenu;
      return [
        {
          label: t.pathColor,
          render: () => (
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: '#888',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 4,
                  fontWeight: 600,
                  padding: '4px 0',
                }}
              >
                {t.pathColor}
              </div>
              <div className="ctx-colors">
                {PATH_COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    className="ctx-color-btn"
                    title={pathLabel(color)}
                    style={{ backgroundColor: PATH_COLORS[color] }}
                    onMouseDown={(ev) => {
                      ev.stopPropagation();
                      handleAddPath(fromId, toId, color);
                      closeMenu();
                    }}
                  />
                ))}
              </div>
            </div>
          ),
        },
      ];
    }

    return [];
  };

  const ctxMenuItems = getCtxMenuItems();

  /* ============ Connect mode click ============ */

  const handleTileClick = useCallback(
    (locationId: string, e: React.MouseEvent) => {
      if (!connectingFrom || connectingFrom === locationId) return;

      const toId = locationId;
      const fromId = connectingFrom;
      setConnectingFrom(null);

      setCtxMenu({
        type: 'colorPicker',
        x: e.clientX,
        y: e.clientY,
        fromId,
        toId,
      });
    },
    [connectingFrom]
  );

  /* ============ Drag: location & path midpoint ============ */

  const handleLocationMouseDown = useCallback(
    (e: React.MouseEvent, locationId: string) => {
      if (connectingFrom) return;
      if (e.button !== 0) return;
      e.preventDefault();
      const loc = locations.find((l) => l.id === locationId);
      if (!loc) return;

      const state: DragState = {
        type: 'location',
        id: locationId,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startObjX: loc.x,
        startObjY: loc.y,
      };
      setDragging(state);
      draggingRef.current = state;
    },
    [locations, connectingFrom]
  );

  const handlePathMidMouseDown = useCallback(
    (e: React.MouseEvent, pathId: string, midX: number, midY: number) => {
      if (e.button !== 0) return;
      e.preventDefault();

      const state: DragState = {
        type: 'pathMid',
        id: pathId,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startObjX: midX,
        startObjY: midY,
      };
      setDragging(state);
      draggingRef.current = state;
    },
    []
  );

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const d = draggingRef.current;
      if (!d) return;
      const s = scaleRef.current;
      const dx = (e.clientX - d.startMouseX) / s;
      const dy = (e.clientY - d.startMouseY) / s;

      if (d.type === 'location') {
        const newX = Math.max(
          0,
          Math.min(MAP_WIDTH - TILE_WIDTH, d.startObjX + dx)
        );
        const newY = Math.max(
          0,
          Math.min(MAP_HEIGHT - TILE_HEIGHT, d.startObjY + dy)
        );
        setLocations((prev) =>
          prev.map((l) =>
            l.id === d.id ? { ...l, x: newX, y: newY } : l
          )
        );
        setPaths((prev) =>
          prev.map((p) =>
            (p.from === d.id || p.to === d.id) && p.viaPoint
              ? { ...p, viaPoint: undefined }
              : p
          )
        );
      } else if (d.type === 'pathMid') {
        handleUpdatePathViaPoint(d.id, {
          x: d.startObjX + dx,
          y: d.startObjY + dy,
        });
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
      draggingRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, handleUpdatePathViaPoint]);

  /* ============ Name editing ============ */

  const handleNameClick = useCallback(
    (locationId: string) => {
      if (connectingFrom) return;
      setEditingNameId(locationId);
    },
    [connectingFrom]
  );

  const handleNameChange = useCallback(
    (locationId: string, name: string) => {
      if (name.trim()) {
        setLocations((prev) =>
          prev.map((l) => (l.id === locationId ? { ...l, name: name.trim() } : l))
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
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [connectingFrom]);

  /* ============ Render ============ */

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
        ref={tileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleTileFileChange}
      />

      <div className="map-section">
        <MapView
          ref={mapRef}
          backgroundImage={backgroundImage}
          locations={locations}
          paths={paths}
          connectingFrom={connectingFrom}
          editingNameId={editingNameId}
          draggingId={dragging?.type === 'location' ? dragging.id : null}
          onMapContextMenu={handleMapContextMenu}
          onLocationContextMenu={handleLocationContextMenu}
          onPathContextMenu={handlePathContextMenu}
          onLocationMouseDown={handleLocationMouseDown}
          onPathMidMouseDown={handlePathMidMouseDown}
          onNameClick={handleNameClick}
          onNameChange={handleNameChange}
          onNameBlur={handleNameBlur}
          onTileClick={handleTileClick}
          scaleRef={scaleRef}
          getMapRect={getMapRectRef}
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

      {/* Status bar */}
      <div className="status-bar">
        {connectingFrom && (
          <span className="status-hint">{t.connectMode}</span>
        )}
        {!connectingFrom && <span>{t.rightClickHint}</span>}
      </div>

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
                <div key={i} className="validation-error-item">
                  {error}
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
    </div>
  );
}
