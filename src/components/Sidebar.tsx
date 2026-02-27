import { useI18n, LANGUAGES } from '../i18n';
import {
  RoomData,
  PathConnection,
  PropTileType,
  PROP_TILE_TYPES,
  PROP_TILE_LIMITS,
  MAX_BREAKABLE_WALLS,
  INITIAL_PLACEMENT_VALUES,
} from '../types';

import objectiveIcon from '../assets/score/objective-tinted.png';
import boldnessIcon from '../assets/score/boldness-tinted.png';
import survivalIcon from '../assets/score/survival-tinted.png';
import altruismIcon from '../assets/score/altruism-tinted.png';

import spawn0 from '../assets/spawn/spawn0.png';
import spawn1 from '../assets/spawn/spawn1.png';
import spawn2 from '../assets/spawn/spawn2.png';
import spawn3 from '../assets/spawn/spawn3.png';
import spawn4 from '../assets/spawn/spawn4.png';
import spawn5 from '../assets/spawn/spawn5.png';

const SPAWN_ICONS: Record<number, string> = {
  0: spawn0,
  1: spawn1,
  2: spawn2,
  3: spawn3,
  4: spawn4,
  5: spawn5,
};

const PROP_TILE_ICONS: Record<PropTileType, string> = {
  objective: objectiveIcon,
  boldness: boldnessIcon,
  survival: survivalIcon,
  altruism: altruismIcon,
};

interface SidebarProps {
  downloading: boolean;
  exporting: boolean;
  rooms: RoomData[];
  paths: PathConnection[];
  verificationMode: boolean;
  onAddRoom: () => void;
  onChangeBackground: () => void;
  onExport: () => void;
  onImport: () => void;
  onClear: () => void;
  onDownload: () => void;
  onToggleVerification: () => void;
}

export function Sidebar({
  downloading,
  exporting,
  rooms,
  paths,
  verificationMode,
  onAddRoom,
  onChangeBackground,
  onExport,
  onImport,
  onClear,
  onDownload,
  onToggleVerification,
}: SidebarProps) {
  const { t, lang, setLang, propTileLabel } = useI18n();

  // Compute prop tile stats
  const propTileStats = PROP_TILE_TYPES.map((type) => {
    const used = rooms.reduce((s, r) => s + r.propTiles[type], 0);
    const total = PROP_TILE_LIMITS[type];
    const remaining = total - used;
    return { type, used, total, remaining };
  });

  // Compute breakable wall stats
  const breakableWallCount = paths.filter((p) => p.hasBreakableWall).length;
  const breakableWallsRemaining = MAX_BREAKABLE_WALLS - breakableWallCount;

  return (
    <aside className="sidebar">
      {/* Actions section */}
      <div className="sidebar-section">
        <h3 className="sidebar-heading">{t.sidebarActions}</h3>
        <div className="sidebar-actions">
          <button className="sidebar-btn" onClick={onAddRoom}>
            <span className="sidebar-btn-icon">+</span>
            {t.addRoom}
          </button>
          <button className="sidebar-btn" onClick={onChangeBackground}>
            <span className="sidebar-btn-icon">🖼</span>
            {t.changeBackground}
          </button>
          <div className="sidebar-sep" />
          <button className="sidebar-btn" onClick={onExport} disabled={exporting}>
            <span className="sidebar-btn-icon">📦</span>
            {t.exportGameBoard}
          </button>
          <button className="sidebar-btn" onClick={onImport}>
            <span className="sidebar-btn-icon">📂</span>
            {t.importGameBoard}
          </button>
          <div className="sidebar-sep" />
          <button className="sidebar-btn sidebar-btn-danger" onClick={onClear}>
            <span className="sidebar-btn-icon">🗑</span>
            {t.clearGameBoard}
          </button>
          <div className="sidebar-sep" />
          <button
            className={`sidebar-btn${verificationMode ? ' sidebar-btn-verification-active' : ''}`}
            onClick={onToggleVerification}
          >
            <span className="sidebar-btn-icon">🔍</span>
            {t.verificationMode}
          </button>
          <div className="sidebar-sep" />
          <button
            className="sidebar-btn sidebar-btn-primary"
            onClick={onDownload}
            disabled={downloading}
          >
            <span className="sidebar-btn-icon">⬇</span>
            {downloading ? t.downloading : t.downloadGameBoard}
          </button>
        </div>
      </div>

      {/* Stats section */}
      <div className="sidebar-section">
        <h3 className="sidebar-heading">{t.propTiles}</h3>
        <div className="sidebar-stats">
          {propTileStats.map(({ type, used, total, remaining }) => {
            const isOk = remaining === 0;
            return (
              <div key={type} className="sidebar-stat-row">
                <img
                  className="sidebar-stat-icon"
                  src={PROP_TILE_ICONS[type]}
                  alt={propTileLabel(type)}
                />
                <span className="sidebar-stat-label">{propTileLabel(type)}</span>
                <span className={`sidebar-stat-value ${isOk ? 'stat-ok' : 'stat-warn'}`}>
                  {used}/{total}
                </span>
              </div>
            );
          })}
          <div className="sidebar-stat-sep" />
          <div className="sidebar-stat-row">
            <span className="sidebar-stat-icon-text">🧱</span>
            <span className="sidebar-stat-label">{t.breakableWall}</span>
            <span className={`sidebar-stat-value ${breakableWallsRemaining === 0 ? 'stat-ok' : 'stat-warn'}`}>
              {breakableWallCount}/{MAX_BREAKABLE_WALLS}
            </span>
          </div>
        </div>
      </div>

      {/* Spawns section */}
      <div className="sidebar-section">
        <h3 className="sidebar-heading">{t.initialPlacement}</h3>
        <div className="sidebar-stats">
          {INITIAL_PLACEMENT_VALUES.map((val) => {
            const room = rooms.find((r) => r.initialPlacement === val);
            return (
              <div key={val} className="sidebar-stat-row">
                <img
                  className="sidebar-spawn-icon"
                  src={SPAWN_ICONS[val]}
                  alt={`Spawn ${val}`}
                />
                <span className={`sidebar-spawn-label ${room ? '' : 'stat-warn'}`}>
                  {room ? room.name : t.spawnUnassigned}
                </span>
                {room
                  ? <span className="sidebar-spawn-check">✓</span>
                  : <span className="sidebar-spawn-x">✕</span>
                }
              </div>
            );
          })}
        </div>
      </div>

      {/* Language section */}
      <div className="sidebar-section">
        <h3 className="sidebar-heading">{t.sidebarLanguage}</h3>
        <div className="sidebar-flags">
          {LANGUAGES.map((l) => (
            <button
              key={l.id}
              className={`sidebar-flag-btn${lang === l.id ? ' sidebar-flag-active' : ''}`}
              title={l.label}
              onClick={() => setLang(l.id)}
            >
              <span className="sidebar-flag-emoji">{l.flag}</span>
              <span className="sidebar-flag-label">{l.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Instructions section */}
      <div className="sidebar-section">
        <h3 className="sidebar-heading">{t.sidebarHowToUse}</h3>
        <ul className="sidebar-instructions">
          <li>
            <span className="sidebar-instruction-icon">👆</span>
            {t.sidebarInstructionDragRooms}
          </li>
          <li>
            <span className="sidebar-instruction-icon">↗</span>
            {t.sidebarInstructionDragPaths}
          </li>
          <li>
            <span className="sidebar-instruction-icon">⚬</span>
            {t.sidebarInstructionDragJoins}
          </li>
          <li>
            <span className="sidebar-instruction-icon">🖱</span>
            {t.sidebarInstructionRightClickRoom}
          </li>
          <li>
            <span className="sidebar-instruction-icon">🖱</span>
            {t.sidebarInstructionRightClickPath}
          </li>
          <li>
            <span className="sidebar-instruction-icon">✏</span>
            {t.sidebarInstructionClickName}
          </li>
        </ul>
      </div>
    </aside>
  );
}
