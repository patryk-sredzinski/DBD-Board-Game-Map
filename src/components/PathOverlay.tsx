import { useMemo, useState, useEffect } from 'react';
import {
  PathConnection,
  RoomData,
  PATH_COLORS,
  PathType,
  PortSide,
  ROOM_WIDTH,
  ROOM_HEIGHT_SMALL,
  ROOM_HEIGHT_LARGE,
  GAME_BOARD_WIDTH,
  GAME_BOARD_HEIGHT,
  PATH_STROKE_WIDTH,
  PATH_OUTLINE_WIDTH,
  PATH_MARGIN,
  PATH_EXTENSION,
  PATH_ARROW_SIZE,
  PATH_ICON_SIZE,
  PATH_ICON_BORDER,
  PORT_RADIUS,
  PORT_HIT_RADIUS,
} from '../types';

// Helper to get room height based on size
function getRoomHeight(room: RoomData): number {
  return room.size === 'large' ? ROOM_HEIGHT_LARGE : ROOM_HEIGHT_SMALL;
}

// Movement icons: blue=sneak, green=sprint, red=crouch, yellow=vault
import sneakIcon from '../assets/movement/walk.png';
import sprintIcon from '../assets/movement/sprint.png';
import crouchIcon from '../assets/movement/crouch.png';
import vaultIcon from '../assets/movement/jump.png';

const MOVEMENT_ICONS: Record<PathType, string> = {
  blue: sneakIcon,
  green: sprintIcon,
  red: crouchIcon,
  yellow: vaultIcon,
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
function useBase64Icons(): Record<PathType, string> | null {
  const [icons, setIcons] = useState<Record<PathType, string> | null>(null);

  useEffect(() => {
    async function loadIcons() {
      try {
        const [sneak, sprint, crouch, vault] = await Promise.all([
          imageToBase64(sneakIcon),
          imageToBase64(sprintIcon),
          imageToBase64(crouchIcon),
          imageToBase64(vaultIcon),
        ]);
        setIcons({
          blue: sneak,
          green: sprint,
          red: crouch,
          yellow: vault,
        });
      } catch (err) {
        console.error('Failed to load icons as base64:', err);
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
  rooms: RoomData[];
  onPathContextMenu: (e: React.MouseEvent, pathId: string) => void;
  onIconMouseDown: (e: React.MouseEvent, pathId: string) => void;
  onPortMouseDown: (e: React.MouseEvent, pathId: string, portType: 'exit' | 'entry') => void;
}

interface Point {
  x: number;
  y: number;
}

interface RouteData {
  id: string;
  color: string;
  pathType: PathType;
  isVault: boolean;
  points: Point[];
  displayPoints: Point[];
  iconPoint: Point;
  exitPort: Point;
  entryPort: Point;
  endAngle: number;
  hasBreakableWall: boolean;
}

/* ========== Geometry Helpers ========== */

function getRoomCenter(room: RoomData): Point {
  const roomHeight = getRoomHeight(room);
  return { x: room.x + ROOM_WIDTH / 2, y: room.y + roomHeight / 2 };
}

/** Get the default side facing toward another room */
function getDefaultSide(from: RoomData, to: RoomData): PortSide {
  const fc = getRoomCenter(from);
  const tc = getRoomCenter(to);
  const dx = tc.x - fc.x;
  const dy = tc.y - fc.y;
  const fromHeight = getRoomHeight(from);
  const aspectRatio = ROOM_WIDTH / fromHeight;
  if (Math.abs(dx) / aspectRatio > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  }
  return dy > 0 ? 'bottom' : 'top';
}

/** Get point on room edge given side and offset (0-1) */
function getPortPoint(room: RoomData, side: PortSide, offset: number): Point {
  const clampedOffset = Math.max(0, Math.min(1, offset));
  const roomHeight = getRoomHeight(room);
  
  switch (side) {
    case 'top': {
      const minX = room.x + PATH_MARGIN;
      const maxX = room.x + ROOM_WIDTH - PATH_MARGIN;
      return { x: minX + (maxX - minX) * clampedOffset, y: room.y };
    }
    case 'bottom': {
      const minX = room.x + PATH_MARGIN;
      const maxX = room.x + ROOM_WIDTH - PATH_MARGIN;
      return { x: minX + (maxX - minX) * clampedOffset, y: room.y + roomHeight };
    }
    case 'left': {
      const minY = room.y + PATH_MARGIN;
      const maxY = room.y + roomHeight - PATH_MARGIN;
      return { x: room.x, y: minY + (maxY - minY) * clampedOffset };
    }
    case 'right': {
      const minY = room.y + PATH_MARGIN;
      const maxY = room.y + roomHeight - PATH_MARGIN;
      return { x: room.x + ROOM_WIDTH, y: minY + (maxY - minY) * clampedOffset };
    }
  }
}

/** Find closest point on room perimeter to a given point */
function getClosestPointOnPerimeter(room: RoomData, point: Point): { side: PortSide; offset: number; point: Point } {
  const sides: PortSide[] = ['top', 'bottom', 'left', 'right'];
  const roomHeight = getRoomHeight(room);
  let bestSide: PortSide = 'top';
  let bestOffset = 0.5;
  let bestPoint: Point = { x: 0, y: 0 };
  let bestDist = Infinity;

  for (const side of sides) {
    // Get the offset for this side
    let offset: number;
    let pt: Point;
    
    switch (side) {
      case 'top':
      case 'bottom': {
        const minX = room.x + PATH_MARGIN;
        const maxX = room.x + ROOM_WIDTH - PATH_MARGIN;
        const clampedX = Math.max(minX, Math.min(maxX, point.x));
        offset = (clampedX - minX) / (maxX - minX);
        pt = { x: clampedX, y: side === 'top' ? room.y : room.y + roomHeight };
        break;
      }
      case 'left':
      case 'right': {
        const minY = room.y + PATH_MARGIN;
        const maxY = room.y + roomHeight - PATH_MARGIN;
        const clampedY = Math.max(minY, Math.min(maxY, point.y));
        offset = (clampedY - minY) / (maxY - minY);
        pt = { x: side === 'left' ? room.x : room.x + ROOM_WIDTH, y: clampedY };
        break;
      }
    }
    
    const dist = Math.sqrt((pt.x - point.x) ** 2 + (pt.y - point.y) ** 2);
    if (dist < bestDist) {
      bestDist = dist;
      bestSide = side;
      bestOffset = offset;
      bestPoint = pt;
    }
  }
  
  return { side: bestSide, offset: bestOffset, point: bestPoint };
}

/** Build orthogonal path from exit port through optional via point to entry port */
function buildOrthogonalPath(
  exitPort: Point,
  exitSide: PortSide,
  entryPort: Point,
  entrySide: PortSide,
  viaPoint?: Point
): Point[] {
  
  const extDelta: Record<PortSide, Point> = {
    right: { x: PATH_EXTENSION, y: 0 },
    left: { x: -PATH_EXTENSION, y: 0 },
    bottom: { x: 0, y: PATH_EXTENSION },
    top: { x: 0, y: -PATH_EXTENSION },
  };
  
  const exitExt = { 
    x: exitPort.x + extDelta[exitSide].x, 
    y: exitPort.y + extDelta[exitSide].y 
  };
  const entryExt = { 
    x: entryPort.x + extDelta[entrySide].x, 
    y: entryPort.y + extDelta[entrySide].y 
  };
  
  if (viaPoint) {
    // Route: exitPort -> exitExt -> viaPoint -> entryExt -> entryPort
    // Build orthogonal segments through viaPoint
    const pts: Point[] = [exitPort, exitExt];
    
    // Connect exitExt to viaPoint orthogonally
    const exitH = exitSide === 'left' || exitSide === 'right';
    if (exitH) {
      // Exit is horizontal, so first go horizontally to viaPoint.x, then vertically
      pts.push({ x: viaPoint.x, y: exitExt.y });
      pts.push(viaPoint);
    } else {
      // Exit is vertical, so first go vertically to viaPoint.y, then horizontally
      pts.push({ x: exitExt.x, y: viaPoint.y });
      pts.push(viaPoint);
    }
    
    // Connect viaPoint to entryExt orthogonally
    const entryH = entrySide === 'left' || entrySide === 'right';
    if (entryH) {
      pts.push({ x: viaPoint.x, y: entryExt.y });
    } else {
      pts.push({ x: entryExt.x, y: viaPoint.y });
    }
    
    pts.push(entryExt);
    pts.push(entryPort);
    
    return pts;
  }
  
  // Standard routing without via point
  const pts: Point[] = [exitPort, exitExt];
  const exitH = exitSide === 'left' || exitSide === 'right';
  const entryH = entrySide === 'left' || entrySide === 'right';
  
  if (exitH && entryH) {
    if (Math.abs(exitExt.y - entryExt.y) < 5) {
      pts.push(entryExt);
    } else {
      const midX = (exitExt.x + entryExt.x) / 2;
      pts.push({ x: midX, y: exitExt.y });
      pts.push({ x: midX, y: entryExt.y });
      pts.push(entryExt);
    }
  } else if (!exitH && !entryH) {
    if (Math.abs(exitExt.x - entryExt.x) < 5) {
      pts.push(entryExt);
    } else {
      const midY = (exitExt.y + entryExt.y) / 2;
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
  return pts;
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

/* ========== Route Computation ========== */

function computeRoutes(
  paths: PathConnection[],
  rooms: RoomData[]
): RouteData[] {
  const roomMap = new Map(rooms.map((r) => [r.id, r]));
  if (paths.length === 0 || rooms.length === 0) return [];

  const routes: RouteData[] = [];

  for (const path of paths) {
    const from = roomMap.get(path.from);
    const to = roomMap.get(path.to);
    if (!from || !to) continue;

    // Determine exit port
    let exitSide: PortSide;
    let exitOffset: number;
    if (path.exitPort) {
      exitSide = path.exitPort.side;
      exitOffset = path.exitPort.offset;
    } else {
      exitSide = getDefaultSide(from, to);
      exitOffset = 0.5;
    }
    const exitPort = getPortPoint(from, exitSide, exitOffset);

    // Determine entry port
    let entrySide: PortSide;
    let entryOffset: number;
    if (path.entryPort) {
      entrySide = path.entryPort.side;
      entryOffset = path.entryPort.offset;
    } else {
      entrySide = getDefaultSide(to, from);
      entryOffset = 0.5;
    }
    const entryPort = getPortPoint(to, entrySide, entryOffset);

    // Build path points
    const pts = buildOrthogonalPath(exitPort, exitSide, entryPort, entrySide, path.viaPoint);

    // Icon position - use viaPoint if set, otherwise middle of path
    let iconPoint: Point;
    if (path.viaPoint) {
      iconPoint = path.viaPoint;
    } else {
      const tLen = totalPathLength(pts);
      iconPoint = pointAtDistance(pts, tLen * 0.5);
    }

    const n = pts.length;
    const endAngle = Math.atan2(
      pts[n - 1].y - pts[n - 2].y,
      pts[n - 1].x - pts[n - 2].x
    );

    // For vault (yellow) paths, shorten display line so it ends at the arrow base
    const isVault = path.color === 'yellow';
    let displayPoints = pts;
    if (isVault && pts.length >= 2) {
      const tLen = totalPathLength(pts);
      const targetLen = tLen - PATH_ARROW_SIZE;
      if (targetLen > 0) {
        const cutPoint = pointAtDistance(pts, targetLen);
        // Rebuild points: keep all full segments before the cut, then add the cut point
        let accumulated = 0;
        const newPoints: Point[] = [pts[0]];
        for (let i = 1; i < pts.length; i++) {
          const dx = pts[i].x - pts[i - 1].x;
          const dy = pts[i].y - pts[i - 1].y;
          const segLen = Math.sqrt(dx * dx + dy * dy);
          if (accumulated + segLen >= targetLen) {
            newPoints.push(cutPoint);
            break;
          }
          newPoints.push(pts[i]);
          accumulated += segLen;
        }
        displayPoints = newPoints;
      }
    }

    routes.push({
      id: path.id,
      color: PATH_COLORS[path.color],
      pathType: path.color,
      isVault,
      points: pts,
      displayPoints,
      exitPort,
      entryPort,
      iconPoint,
      endAngle,
      hasBreakableWall: path.hasBreakableWall || false,
    });
  }

  return routes;
}

/* ========== Breakable Wall Border Path ========== */

// Seeded random for consistent results per edge
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

function getBreakableWallBorderPath(size: number, borderWidth: number, offsetX: number = 0, offsetY: number = 0): string {
  const totalSize = size + borderWidth;
  const baseOffset = -borderWidth / 2;
  
  // Scale notch depth based on icon size for print quality
  const notchScale = size / 100;
  
  // Generate irregular edge with varying notches (cracked wall effect)
  const generateEdge = (
    startX: number, startY: number,
    endX: number, endY: number,
    outwardX: number, outwardY: number,
    seed: number
  ): string => {
    const dx = endX - startX;
    const dy = endY - startY;
    const segments = 12 + Math.floor(seededRandom(seed) * 6); // 12-17 segments for more detail
    
    let path = '';
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const px = startX + dx * t;
      const py = startY + dy * t;
      
      // Vary the notch depth and direction randomly
      const rand = seededRandom(seed + i * 7.3);
      const depth = (rand - 0.35) * 6.3 * notchScale; // Moderate notches, scaled to size
      
      path += `L ${px + outwardX * depth} ${py + outwardY * depth} `;
    }
    return path;
  };
  
  // Four corners with offset applied
  const tl = { x: offsetX + baseOffset, y: offsetY + baseOffset };
  const tr = { x: offsetX + baseOffset + totalSize, y: offsetY + baseOffset };
  const br = { x: offsetX + baseOffset + totalSize, y: offsetY + baseOffset + totalSize };
  const bl = { x: offsetX + baseOffset, y: offsetY + baseOffset + totalSize };
  
  // Build path with irregular edges on each side
  let d = `M ${tl.x} ${tl.y} `;
  
  // Top edge (left to right, notches go up)
  d += generateEdge(tl.x, tl.y, tr.x, tr.y, 0, -1, 1);
  d += `L ${tr.x} ${tr.y} `;
  
  // Right edge (top to bottom, notches go right)
  d += generateEdge(tr.x, tr.y, br.x, br.y, 1, 0, 2);
  d += `L ${br.x} ${br.y} `;
  
  // Bottom edge (right to left, notches go down)
  d += generateEdge(br.x, br.y, bl.x, bl.y, 0, 1, 3);
  d += `L ${bl.x} ${bl.y} `;
  
  // Left edge (bottom to top, notches go left)
  d += generateEdge(bl.x, bl.y, tl.x, tl.y, -1, 0, 4);
  
  d += 'Z';
  return d;
}

/* ========== Port Handle ========== */

function PortHandle({
  x,
  y,
  color,
  portType,
  pathId,
  onMouseDown,
}: {
  x: number;
  y: number;
  color: string;
  portType: 'exit' | 'entry';
  pathId: string;
  onMouseDown: (e: React.MouseEvent, pathId: string, portType: 'exit' | 'entry') => void;
}) {
  const [hovered, setHovered] = useState(false);
  const radius = hovered ? PORT_RADIUS * 0.75 : PORT_RADIUS;
  const strokeWidth = hovered ? PORT_RADIUS * 0.17 : PORT_RADIUS * 0.25;
  
  return (
    <g className="port-handle">
      <circle
        cx={x}
        cy={y}
        r={PORT_HIT_RADIUS}
        fill="transparent"
        style={{ cursor: 'pointer' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onMouseDown={(e) => {
          if (e.button === 0) {
            e.stopPropagation();
            onMouseDown(e, pathId, portType);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />
      <circle
        cx={x}
        cy={y}
        r={radius}
        fill={color}
        stroke="#ffffff"
        strokeWidth={strokeWidth}
        style={{ pointerEvents: 'none', transition: 'r 0.15s ease, stroke-width 0.15s ease' }}
        className="port-handle-circle"
      />
    </g>
  );
}

/* ========== Movement Icon ========== */

function MovementIcon({
  x,
  y,
  color,
  iconSrc,
  hasBreakableWall,
  onMouseDown,
  onContextMenu,
}: {
  x: number;
  y: number;
  color: string;
  iconSrc: string;
  hasBreakableWall: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const size = PATH_ICON_SIZE;
  const innerBorderWidth = PATH_ICON_BORDER;
  const hitPadding = PATH_ICON_SIZE * 0.1; // 10% padding for easier clicking
  const offsetX = x - size / 2;
  const offsetY = y - size / 2;
  return (
    <g
      className="path-movement-icon"
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenu}
    >
      <rect
        x={offsetX - innerBorderWidth / 2 - hitPadding}
        y={offsetY - innerBorderWidth / 2 - hitPadding}
        width={size + innerBorderWidth + hitPadding * 2}
        height={size + innerBorderWidth + hitPadding * 2}
        fill="transparent"
        style={{ cursor: 'grab' }}
      />
      {hasBreakableWall ? (
        <>
          <path
            d={getBreakableWallBorderPath(size, innerBorderWidth, offsetX, offsetY)}
            fill="#1a1a1a"
            stroke="none"
            style={{ pointerEvents: 'none' }}
          />
          <path
            d={getBreakableWallBorderPath(size, innerBorderWidth, offsetX, offsetY)}
            fill="none"
            stroke={color}
            strokeWidth={innerBorderWidth}
            style={{ pointerEvents: 'none' }}
          />
        </>
      ) : (
        <path
          d={`M ${offsetX - innerBorderWidth / 2} ${offsetY - innerBorderWidth / 2} 
              L ${offsetX - innerBorderWidth / 2 + size + innerBorderWidth} ${offsetY - innerBorderWidth / 2} 
              L ${offsetX - innerBorderWidth / 2 + size + innerBorderWidth} ${offsetY - innerBorderWidth / 2 + size + innerBorderWidth} 
              L ${offsetX - innerBorderWidth / 2} ${offsetY - innerBorderWidth / 2 + size + innerBorderWidth} Z`}
          fill="none"
          stroke={color}
          strokeWidth={innerBorderWidth}
          style={{ pointerEvents: 'none' }}
        />
      )}
      <image
        href={iconSrc}
        x={offsetX}
        y={offsetY}
        width={size}
        height={size}
        style={{ pointerEvents: 'none' }}
      />
    </g>
  );
}

/* ========== Movement Icon Outline ========== */

function MovementIconOutline({
  x,
  y,
  hasBreakableWall,
}: {
  x: number;
  y: number;
  hasBreakableWall: boolean;
}) {
  const size = PATH_ICON_SIZE;
  const innerBorderWidth = PATH_ICON_BORDER;
  const outlineWidth = PATH_ICON_BORDER * 0.4;
  const totalSize = size + innerBorderWidth;
  const offsetX = x - size / 2;
  const offsetY = y - size / 2;

  if (hasBreakableWall) {
    return (
      <path
        d={getBreakableWallBorderPath(size, innerBorderWidth, offsetX, offsetY)}
        fill="none"
        stroke="#000"
        strokeWidth={innerBorderWidth + outlineWidth * 2}
        style={{ pointerEvents: 'none' }}
      />
    );
  }

  const outlineX = offsetX - innerBorderWidth / 2 - outlineWidth;
  const outlineY = offsetY - innerBorderWidth / 2 - outlineWidth;
  const outlineSize = totalSize + outlineWidth * 2;

  return (
    <path
      d={`M ${outlineX} ${outlineY} 
          L ${outlineX + outlineSize} ${outlineY} 
          L ${outlineX + outlineSize} ${outlineY + outlineSize} 
          L ${outlineX} ${outlineY + outlineSize} Z`}
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
  rooms,
  onPathContextMenu,
  onIconMouseDown,
  onPortMouseDown,
}: PathOverlayProps) {
  const routes = useMemo(
    () => computeRoutes(paths, rooms),
    [paths, rooms]
  );

  const base64Icons = useBase64Icons();

  if (!base64Icons) {
    return null;
  }

  return (
    <svg
      className="path-overlay"
      width={GAME_BOARD_WIDTH}
      height={GAME_BOARD_HEIGHT}
      style={{ position: 'absolute', top: 0, left: 0 }}
    >
      {/* Layer 1: Dark outlines */}
      <g style={{ pointerEvents: 'none' }}>
        {routes.map((route) => {
          const pointsStr = route.displayPoints
            .map((p) => `${p.x},${p.y}`)
            .join(' ');
          return (
            <g key={`outline-${route.id}`}>
              <polyline
                points={pointsStr}
                fill="none"
                stroke="#000"
                strokeWidth={PATH_OUTLINE_WIDTH}
                strokeLinejoin="miter"
                strokeLinecap="butt"
              />
              {route.isVault && (() => {
                const n = route.points.length;
                const tip = route.points[n - 1];
                const angleDeg = (route.endAngle * 180) / Math.PI;
                const sz = PATH_ARROW_SIZE;
                const outlineExtra = PATH_ARROW_SIZE * 0.06;
                return (
                  <g transform={`translate(${tip.x}, ${tip.y}) rotate(${angleDeg})`}>
                    <polygon
                      points={`${outlineExtra},0 ${-sz - outlineExtra},-${(sz / 2) + outlineExtra} ${-sz - outlineExtra},${(sz / 2) + outlineExtra}`}
                      fill="#000"
                    />
                  </g>
                );
              })()}
              <MovementIconOutline
                x={route.iconPoint.x}
                y={route.iconPoint.y}
                hasBreakableWall={route.hasBreakableWall}
              />
            </g>
          );
        })}
      </g>

      {/* Layer 2: Colored elements */}
      {routes.map((route) => {
        const pointsStr = route.displayPoints
          .map((p) => `${p.x},${p.y}`)
          .join(' ');

        return (
          <g
            key={route.id}
            className="path-group"
          >
            <polyline
              points={pointsStr}
              fill="none"
              stroke={route.color}
              strokeWidth={PATH_STROKE_WIDTH}
              strokeLinejoin="miter"
              strokeLinecap="butt"
              style={{ pointerEvents: 'none' }}
            />

            {route.isVault && (() => {
              const n = route.points.length;
              const tip = route.points[n - 1];
              const angleDeg = (route.endAngle * 180) / Math.PI;
              const sz = PATH_ARROW_SIZE;
              return (
                <g transform={`translate(${tip.x}, ${tip.y}) rotate(${angleDeg})`}>
                  <polygon
                    points={`0,0 ${-sz},-${sz / 2} ${-sz},${sz / 2}`}
                    fill={route.color}
                    style={{ pointerEvents: 'none' }}
                  />
                </g>
              );
            })()}

            <MovementIcon
              x={route.iconPoint.x}
              y={route.iconPoint.y}
              color={route.color}
              iconSrc={base64Icons[route.pathType]}
              hasBreakableWall={route.hasBreakableWall}
              onMouseDown={(e) => {
                if (e.button === 0) {
                  e.stopPropagation();
                  onIconMouseDown(e, route.id);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPathContextMenu(e, route.id);
              }}
            />

            <PortHandle
              x={route.exitPort.x}
              y={route.exitPort.y}
              color={route.color}
              portType="exit"
              pathId={route.id}
              onMouseDown={onPortMouseDown}
            />
            <PortHandle
              x={route.entryPort.x}
              y={route.entryPort.y}
              color={route.color}
              portType="entry"
              pathId={route.id}
              onMouseDown={onPortMouseDown}
            />
          </g>
        );
      })}
    </svg>
  );
}

// Export helper functions for use in App.tsx
export { getClosestPointOnPerimeter, getPortPoint, getRoomCenter };
