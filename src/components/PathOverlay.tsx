import { useMemo, useState, useEffect } from 'react';
import {
  PathConnection,
  LocationData,
  PATH_COLORS,
  PathColor,
  TILE_WIDTH,
  TILE_HEIGHT,
  MAP_WIDTH,
  MAP_HEIGHT,
} from '../types';

import walkIcon from '../assets/movement/walk.png';
import sprintIcon from '../assets/movement/sprint.png';
import crouchIcon from '../assets/movement/crouch.png';
import jumpIcon from '../assets/movement/jump.png';

const MOVEMENT_ICONS: Record<PathColor, string> = {
  blue: walkIcon,
  green: sprintIcon,
  red: crouchIcon,
  yellow: jumpIcon,
};

// Convert image URL to base64 data URL for SVG embedding
async function imageToBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// Hook to load all movement icons as base64
function useBase64Icons(): Record<PathColor, string> | null {
  const [icons, setIcons] = useState<Record<PathColor, string> | null>(null);

  useEffect(() => {
    async function loadIcons() {
      try {
        const [walk, sprint, crouch, jump] = await Promise.all([
          imageToBase64(walkIcon),
          imageToBase64(sprintIcon),
          imageToBase64(crouchIcon),
          imageToBase64(jumpIcon),
        ]);
        setIcons({
          blue: walk,
          green: sprint,
          red: crouch,
          yellow: jump,
        });
      } catch (err) {
        console.error('Failed to load icons as base64:', err);
        // Fallback to original URLs
        setIcons(MOVEMENT_ICONS);
      }
    }
    loadIcons();
  }, []);

  return icons;
}

/* ========== Types ========== */

interface PathOverlayProps {
  paths: PathConnection[];
  locations: LocationData[];
  onPathContextMenu: (e: React.MouseEvent, pathId: string) => void;
  onPathMidMouseDown: (
    e: React.MouseEvent,
    pathId: string,
    midX: number,
    midY: number
  ) => void;
}

interface Point {
  x: number;
  y: number;
}

type Side = 'top' | 'bottom' | 'left' | 'right';

interface RouteData {
  id: string;
  color: string;
  pathColor: PathColor;
  isYellow: boolean;
  points: Point[];
  displayPoints: Point[];
  midPoint: Point;
  endAngle: number;
  hasDoor: boolean;
}

/* ========== Geometry Helpers ========== */

function getTileCenter(loc: LocationData): Point {
  return { x: loc.x + TILE_WIDTH / 2, y: loc.y + TILE_HEIGHT / 2 };
}

/** Determine which side of `tile` faces toward `target` point */
function getSideToward(tile: LocationData, target: Point): Side {
  const tc = getTileCenter(tile);
  const dx = target.x - tc.x;
  const dy = target.y - tc.y;
  const aspectRatio = TILE_WIDTH / TILE_HEIGHT;
  if (Math.abs(dx) / aspectRatio > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  }
  return dy > 0 ? 'bottom' : 'top';
}

function getExitSide(from: LocationData, to: LocationData): Side {
  return getSideToward(from, getTileCenter(to));
}

function isHSide(side: Side): boolean {
  return side === 'left' || side === 'right';
}

function getPortPosition(
  tile: LocationData,
  side: Side,
  offset: number
): Point {
  const cx = tile.x + TILE_WIDTH / 2;
  const cy = tile.y + TILE_HEIGHT / 2;
  switch (side) {
    case 'right':
      return { x: tile.x + TILE_WIDTH, y: cy + offset };
    case 'left':
      return { x: tile.x, y: cy + offset };
    case 'bottom':
      return { x: cx + offset, y: tile.y + TILE_HEIGHT };
    case 'top':
      return { x: cx + offset, y: tile.y };
  }
}

function totalPathLength(points: Point[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

function pointAtDistance(points: Point[], targetLen: number): Point {
  let accumulated = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const segLen = Math.sqrt(dx * dx + dy * dy);
    if (segLen > 0 && accumulated + segLen >= targetLen) {
      const t = (targetLen - accumulated) / segLen;
      return {
        x: points[i - 1].x + dx * t,
        y: points[i - 1].y + dy * t,
      };
    }
    accumulated += segLen;
  }
  return points[points.length - 1];
}

/** Remove consecutive duplicates and collinear midpoints */
function cleanRoute(pts: Point[]): Point[] {
  if (pts.length <= 2) return pts;
  // Deduplicate
  const deduped: Point[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const prev = deduped[deduped.length - 1];
    if (Math.abs(pts[i].x - prev.x) > 0.5 || Math.abs(pts[i].y - prev.y) > 0.5) {
      deduped.push(pts[i]);
    }
  }
  if (deduped.length <= 2) return deduped;
  // Remove collinear midpoints
  const result: Point[] = [deduped[0]];
  for (let i = 1; i < deduped.length - 1; i++) {
    const prev = result[result.length - 1];
    const curr = deduped[i];
    const next = deduped[i + 1];
    const colX = Math.abs(prev.x - curr.x) < 1 && Math.abs(curr.x - next.x) < 1;
    const colY = Math.abs(prev.y - curr.y) < 1 && Math.abs(curr.y - next.y) < 1;
    if (!colX && !colY) {
      result.push(curr);
    }
  }
  result.push(deduped[deduped.length - 1]);
  return result;
}

/* ========== Route Computation ========== */

const EXT_DIST = 50;
const PORT_SPACING = 40;
const CHANNEL_SPACING = 18;

const extDelta: Record<Side, Point> = {
  right: { x: EXT_DIST, y: 0 },
  left: { x: -EXT_DIST, y: 0 },
  bottom: { x: 0, y: EXT_DIST },
  top: { x: 0, y: -EXT_DIST },
};

function computeRoutes(
  paths: PathConnection[],
  locations: LocationData[]
): RouteData[] {
  const locMap = new Map(locations.map((l) => [l.id, l]));
  if (paths.length === 0 || locations.length === 0) return [];

  // Step 1: Determine sides (viaPoint-aware)
  const infos = paths
    .map((path) => {
      const from = locMap.get(path.from);
      const to = locMap.get(path.to);
      if (!from || !to) return null;

      let exitSide: Side;
      let entrySide: Side;

      if (path.viaPoint) {
        // Choose sides that face toward the via point
        exitSide = getSideToward(from, path.viaPoint);
        entrySide = getSideToward(to, path.viaPoint);
      } else {
        exitSide = getExitSide(from, to);
        entrySide = getExitSide(to, from);
      }

      return { path, exitSide, entrySide };
    })
    .filter(Boolean) as {
    path: PathConnection;
    exitSide: Side;
    entrySide: Side;
  }[];

  // Step 2: Group by (tile, side) for port assignment
  const sideGroups = new Map<string, PathConnection[]>();
  for (const info of infos) {
    const ek = `${info.path.from}:${info.exitSide}`;
    const nk = `${info.path.to}:${info.entrySide}`;
    if (!sideGroups.has(ek)) sideGroups.set(ek, []);
    sideGroups.get(ek)!.push(info.path);
    if (!sideGroups.has(nk)) sideGroups.set(nk, []);
    sideGroups.get(nk)!.push(info.path);
  }

  // Step 3: Build routes
  const routes: RouteData[] = [];

  for (let pi = 0; pi < infos.length; pi++) {
    const info = infos[pi];
    const from = locMap.get(info.path.from)!;
    const to = locMap.get(info.path.to)!;

    // Port offsets
    const ek = `${info.path.from}:${info.exitSide}`;
    const exitGroup = sideGroups.get(ek)!;
    const exitIdx = exitGroup.indexOf(info.path);
    const exitTotal = exitGroup.length;
    const exitOffset = (exitIdx - (exitTotal - 1) / 2) * PORT_SPACING;

    const nk = `${info.path.to}:${info.entrySide}`;
    const entryGroup = sideGroups.get(nk)!;
    const entryIdx = entryGroup.indexOf(info.path);
    const entryTotal = entryGroup.length;
    const entryOffset = (entryIdx - (entryTotal - 1) / 2) * PORT_SPACING;

    const exitPort = getPortPosition(from, info.exitSide, exitOffset);
    const entryPort = getPortPosition(to, info.entrySide, entryOffset);

    const exitExt: Point = {
      x: exitPort.x + extDelta[info.exitSide].x,
      y: exitPort.y + extDelta[info.exitSide].y,
    };
    const entryExt: Point = {
      x: entryPort.x + extDelta[info.entrySide].x,
      y: entryPort.y + extDelta[info.entrySide].y,
    };

    const exitH = isHSide(info.exitSide);
    const entryH = isHSide(info.entrySide);

    let pts: Point[];

    if (info.path.viaPoint) {
      // ---- Route through via point with orthogonal segments ----
      const V = info.path.viaPoint;
      pts = [exitPort, exitExt];

      // From exitExt to V:
      // After a horizontal extension, next segment must be vertical (and vice versa)
      if (exitH) {
        // Extension was horizontal → go vertical to V.y, then horizontal to V.x
        pts.push({ x: exitExt.x, y: V.y });
        pts.push(V);
      } else {
        // Extension was vertical → go horizontal to V.x, then vertical to V.y
        pts.push({ x: V.x, y: exitExt.y });
        pts.push(V);
      }

      // From V to entryExt:
      // Must arrive at entryExt from the correct direction
      if (entryH) {
        // Entry extension is horizontal → last segment to entryExt must be horizontal
        // So go vertical first, then horizontal
        pts.push({ x: V.x, y: entryExt.y });
        pts.push(entryExt);
      } else {
        // Entry extension is vertical → last segment to entryExt must be vertical
        // So go horizontal first, then vertical
        pts.push({ x: entryExt.x, y: V.y });
        pts.push(entryExt);
      }

      pts.push(entryPort);
      pts = cleanRoute(pts);
    } else {
      // ---- Standard automatic routing ----
      const channelOff = (pi - infos.length / 2) * CHANNEL_SPACING;
      pts = [exitPort, exitExt];

      if (exitH && entryH) {
        if (Math.abs(exitExt.y - entryExt.y) < 5) {
          pts.push(entryExt);
        } else {
          const midX = (exitExt.x + entryExt.x) / 2 + channelOff;
          pts.push({ x: midX, y: exitExt.y });
          pts.push({ x: midX, y: entryExt.y });
          pts.push(entryExt);
        }
      } else if (!exitH && !entryH) {
        if (Math.abs(exitExt.x - entryExt.x) < 5) {
          pts.push(entryExt);
        } else {
          const midY = (exitExt.y + entryExt.y) / 2 + channelOff;
          pts.push({ x: exitExt.x, y: midY });
          pts.push({ x: entryExt.x, y: midY });
          pts.push(entryExt);
        }
      } else {
        if (exitH) {
          pts.push({ x: entryExt.x, y: exitExt.y });
          pts.push(entryExt);
        } else {
          pts.push({ x: exitExt.x, y: entryExt.y });
          pts.push(entryExt);
        }
      }

      pts.push(entryPort);
    }

    // Midpoint & end angle
    const tLen = totalPathLength(pts);
    // For paths with viaPoint, place runner at the via point; otherwise at geometric midpoint
    const midPoint = info.path.viaPoint
      ? info.path.viaPoint
      : pointAtDistance(pts, tLen / 2);
    const n = pts.length;
    const endAngle = Math.atan2(
      pts[n - 1].y - pts[n - 2].y,
      pts[n - 1].x - pts[n - 2].x
    );

    // For yellow (one-way) paths, shorten the line so it ends at the arrow base
    const isYellow = info.path.color === 'yellow';
    let displayPoints = pts;
    if (isYellow && pts.length >= 2) {
      const arrowSize = 30; // Slightly less than arrow (32) to overlap nicely
      const lastPt = pts[n - 1];
      const prevPt = pts[n - 2];
      const dx = lastPt.x - prevPt.x;
      const dy = lastPt.y - prevPt.y;
      const segLen = Math.sqrt(dx * dx + dy * dy);
      if (segLen > arrowSize) {
        const ratio = (segLen - arrowSize) / segLen;
        const shortenedEnd = {
          x: prevPt.x + dx * ratio,
          y: prevPt.y + dy * ratio,
        };
        displayPoints = [...pts.slice(0, -1), shortenedEnd];
      }
    }

    routes.push({
      id: info.path.id,
      color: PATH_COLORS[info.path.color],
      pathColor: info.path.color,
      isYellow,
      points: pts,
      displayPoints,
      midPoint,
      endAngle,
      hasDoor: info.path.hasDoor || false,
    });
  }

  return routes;
}

/* ========== Door Border Path (irregular border for doors) ========== */

function getDoorBorderPath(size: number, borderWidth: number): string {
  // Create irregular/jagged border path
  const totalSize = size + borderWidth;
  const offset = -borderWidth / 2;
  const notchSize = 6;
  const notchDepth = 5;
  
  // Start at top-left, go clockwise with notches
  return `
    M ${offset} ${offset + notchSize}
    L ${offset} ${offset}
    L ${offset + notchSize} ${offset}
    L ${offset + totalSize / 4} ${offset - notchDepth}
    L ${offset + totalSize / 2 - notchSize} ${offset}
    L ${offset + totalSize / 2 + notchSize} ${offset}
    L ${offset + totalSize * 3 / 4} ${offset - notchDepth}
    L ${offset + totalSize - notchSize} ${offset}
    L ${offset + totalSize} ${offset}
    L ${offset + totalSize} ${offset + notchSize}
    L ${offset + totalSize + notchDepth} ${offset + totalSize / 4}
    L ${offset + totalSize} ${offset + totalSize / 2 - notchSize}
    L ${offset + totalSize} ${offset + totalSize / 2 + notchSize}
    L ${offset + totalSize + notchDepth} ${offset + totalSize * 3 / 4}
    L ${offset + totalSize} ${offset + totalSize - notchSize}
    L ${offset + totalSize} ${offset + totalSize}
    L ${offset + totalSize - notchSize} ${offset + totalSize}
    L ${offset + totalSize * 3 / 4} ${offset + totalSize + notchDepth}
    L ${offset + totalSize / 2 + notchSize} ${offset + totalSize}
    L ${offset + totalSize / 2 - notchSize} ${offset + totalSize}
    L ${offset + totalSize / 4} ${offset + totalSize + notchDepth}
    L ${offset + notchSize} ${offset + totalSize}
    L ${offset} ${offset + totalSize}
    L ${offset} ${offset + totalSize - notchSize}
    L ${offset - notchDepth} ${offset + totalSize * 3 / 4}
    L ${offset} ${offset + totalSize / 2 + notchSize}
    L ${offset} ${offset + totalSize / 2 - notchSize}
    L ${offset - notchDepth} ${offset + totalSize / 4}
    Z
  `;
}

/* ========== Movement Icon (using image) ========== */

function MovementIcon({
  x,
  y,
  pathColor,
  color,
  iconSrc,
  hasDoor,
  onMouseDown,
  onContextMenu,
}: {
  x: number;
  y: number;
  pathColor: PathColor;
  color: string;
  iconSrc: string;
  hasDoor: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const size = 102;
  const innerBorderWidth = 6;
  return (
    <g
      transform={`translate(${x - size / 2}, ${y - size / 2})`}
      className="path-runner"
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenu}
    >
      {/* Invisible hit area */}
      <rect
        x={-innerBorderWidth / 2 - 10}
        y={-innerBorderWidth / 2 - 10}
        width={size + innerBorderWidth + 20}
        height={size + innerBorderWidth + 20}
        fill="transparent"
        style={{ cursor: 'grab' }}
      />
      {/* Colored border - regular or door style */}
      {hasDoor ? (
        <>
          {/* Fill the entire door shape with dark background */}
          <path
            d={getDoorBorderPath(size, innerBorderWidth)}
            fill="#1a1a1a"
            stroke="none"
            style={{ pointerEvents: 'none' }}
          />
          {/* Then draw the colored border on top */}
          <path
            d={getDoorBorderPath(size, innerBorderWidth)}
            fill="none"
            stroke={color}
            strokeWidth={innerBorderWidth}
            style={{ pointerEvents: 'none' }}
          />
        </>
      ) : (
        <rect
          x={-innerBorderWidth / 2}
          y={-innerBorderWidth / 2}
          width={size + innerBorderWidth}
          height={size + innerBorderWidth}
          fill="none"
          stroke={color}
          strokeWidth={innerBorderWidth}
          style={{ pointerEvents: 'none' }}
        />
      )}
      <image
        href={iconSrc}
        width={size}
        height={size}
        style={{ pointerEvents: 'none' }}
      />
    </g>
  );
}

/* ========== Movement Icon Outline (dark border only) ========== */

function MovementIconOutline({
  x,
  y,
  hasDoor,
}: {
  x: number;
  y: number;
  hasDoor: boolean;
}) {
  const size = 102;
  const innerBorderWidth = 6;
  const outlineWidth = 2.5;
  // Total size including colored border
  const totalSize = size + innerBorderWidth;

  if (hasDoor) {
    // Use same irregular path but offset for outline
    return (
      <g transform={`translate(${x - size / 2}, ${y - size / 2})`}>
        <path
          d={getDoorBorderPath(size, innerBorderWidth)}
          fill="none"
          stroke="#000"
          strokeWidth={innerBorderWidth + outlineWidth * 2}
          style={{ pointerEvents: 'none' }}
        />
      </g>
    );
  }

  return (
    <rect
      x={x - totalSize / 2 - outlineWidth}
      y={y - totalSize / 2 - outlineWidth}
      width={totalSize + outlineWidth * 2}
      height={totalSize + outlineWidth * 2}
      fill="none"
      stroke="#000"
      strokeWidth={outlineWidth * 2}
      style={{ pointerEvents: 'none' }}
    />
  );
}

/* ========== Component ========== */

export function PathOverlay({
  paths,
  locations,
  onPathContextMenu,
  onPathMidMouseDown,
}: PathOverlayProps) {
  const routes = useMemo(
    () => computeRoutes(paths, locations),
    [paths, locations]
  );

  const base64Icons = useBase64Icons();

  // Don't render paths until icons are loaded as base64
  if (!base64Icons) {
    return null;
  }

  return (
    <svg
      className="path-overlay"
      width={MAP_WIDTH}
      height={MAP_HEIGHT}
      style={{ position: 'absolute', top: 0, left: 0 }}
    >
      {/* Layer 1: All dark outlines (paths, arrows and icons) */}
      <g style={{ pointerEvents: 'none' }}>
        {routes.map((route) => {
          const pointsStr = route.displayPoints
            .map((p) => `${p.x},${p.y}`)
            .join(' ');
          return (
            <g key={`outline-${route.id}`}>
              {/* Dark outline for path */}
              <polyline
                points={pointsStr}
                fill="none"
                stroke="#000"
                strokeWidth={10}
                strokeLinejoin="miter"
                strokeLinecap="butt"
              />
              {/* Dark outline for arrowhead (yellow paths only) */}
              {route.isYellow && (() => {
                const n = route.points.length;
                const tip = route.points[n - 1];
                const angleDeg = (route.endAngle * 180) / Math.PI;
                const sz = 32;
                const outlineExtra = 3;
                return (
                  <g transform={`translate(${tip.x}, ${tip.y}) rotate(${angleDeg})`}>
                    <polygon
                      points={`${outlineExtra},0 ${-sz - outlineExtra},-${(sz / 2) + outlineExtra} ${-sz - outlineExtra},${(sz / 2) + outlineExtra}`}
                      fill="#000"
                    />
                  </g>
                );
              })()}
              {/* Dark outline for icon */}
              <MovementIconOutline
                x={route.midPoint.x}
                y={route.midPoint.y}
                hasDoor={route.hasDoor}
              />
            </g>
          );
        })}
      </g>

      {/* Layer 2: All colored elements (paths, arrows, icons) */}
      {routes.map((route) => {
        const pointsStr = route.displayPoints
          .map((p) => `${p.x},${p.y}`)
          .join(' ');

        return (
          <g
            key={route.id}
            className="path-group"
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onPathContextMenu(e, route.id);
            }}
          >
            {/* Wide invisible hit area */}
            <polyline
              points={pointsStr}
              fill="none"
              stroke="transparent"
              strokeWidth={24}
              strokeLinejoin="miter"
              strokeLinecap="butt"
              style={{ pointerEvents: 'stroke' }}
            />
            {/* Colored path */}
            <polyline
              points={pointsStr}
              fill="none"
              stroke={route.color}
              strokeWidth={6}
              strokeLinejoin="miter"
              strokeLinecap="butt"
              style={{ pointerEvents: 'none' }}
            />

            {/* Arrowhead for yellow one-way paths */}
            {route.isYellow &&
              (() => {
                const n = route.points.length;
                const tip = route.points[n - 1];
                const angleDeg = (route.endAngle * 180) / Math.PI;
                const sz = 32;
                return (
                  <g
                    transform={`translate(${tip.x}, ${tip.y}) rotate(${angleDeg})`}
                  >
                    <polygon
                      points={`0,0 ${-sz},-${sz / 2} ${-sz},${sz / 2}`}
                      fill={route.color}
                      style={{ pointerEvents: 'none' }}
                    />
                  </g>
                );
              })()}

            {/* Movement icon at midpoint / viaPoint */}
            <MovementIcon
              x={route.midPoint.x}
              y={route.midPoint.y}
              pathColor={route.pathColor}
              color={route.color}
              iconSrc={base64Icons[route.pathColor]}
              hasDoor={route.hasDoor}
              onMouseDown={(e) => {
                if (e.button === 0) {
                  e.stopPropagation();
                  onPathMidMouseDown(
                    e,
                    route.id,
                    route.midPoint.x,
                    route.midPoint.y
                  );
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPathContextMenu(e, route.id);
              }}
            />
          </g>
        );
      })}
    </svg>
  );
}
