import {
  MAP_WIDTH,
  MAP_HEIGHT,
  TILE_WIDTH,
  TILE_HEIGHT,
  LocationData,
} from '../types';

const PADDING = 30;
const MIN_GAP = 40;

/* ========== Position Generation (stratified + push-apart) ========== */

export function generateRandomPositions(count: number): { x: number; y: number }[] {
  const MIN_DIST_X = TILE_WIDTH + MIN_GAP;
  const MIN_DIST_Y = TILE_HEIGHT + MIN_GAP;
  const minX = PADDING;
  const maxX = MAP_WIDTH - TILE_WIDTH - PADDING;
  const minY = PADDING;
  const maxY = MAP_HEIGHT - TILE_HEIGHT - PADDING;
  const areaW = maxX - minX;
  const areaH = maxY - minY;

  const maxCols = Math.floor(areaW / TILE_WIDTH) + 1;
  const maxRows = Math.floor(areaH / TILE_HEIGHT) + 1;

  let cols = 1;
  let rows = count;
  for (let c = Math.min(maxCols, count); c >= 1; c--) {
    const r = Math.ceil(count / c);
    if (r <= maxRows) {
      cols = c;
      rows = r;
      break;
    }
  }

  const spacingX = cols > 1 ? areaW / (cols - 1) : 0;
  const spacingY = rows > 1 ? areaH / (rows - 1) : 0;
  const maxJitterX = Math.max(0, (spacingX - TILE_WIDTH) / 2);
  const maxJitterY = Math.max(0, (spacingY - TILE_HEIGHT) / 2);

  const cells: { col: number; row: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({ col: c, row: r });
    }
  }
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  const positions: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const cell = cells[i % cells.length];
    const baseX = cols > 1 ? minX + cell.col * spacingX : minX + areaW / 2;
    const baseY = rows > 1 ? minY + cell.row * spacingY : minY + areaH / 2;
    const jx = maxJitterX > 0 ? (Math.random() * 2 - 1) * maxJitterX : 0;
    const jy = maxJitterY > 0 ? (Math.random() * 2 - 1) * maxJitterY : 0;
    positions.push({
      x: Math.max(minX, Math.min(maxX, baseX + jx)),
      y: Math.max(minY, Math.min(maxY, baseY + jy)),
    });
  }

  // Push-apart
  for (let iter = 0; iter < 800; iter++) {
    let maxOverlap = 0;
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const dx = positions[j].x - positions[i].x;
        const dy = positions[j].y - positions[i].y;
        const overlapX = MIN_DIST_X - Math.abs(dx);
        const overlapY = MIN_DIST_Y - Math.abs(dy);
        if (overlapX > 0 && overlapY > 0) {
          maxOverlap = Math.max(maxOverlap, Math.min(overlapX, overlapY));
          const pf = 0.4;
          if (overlapX < overlapY) {
            const push = overlapX * pf + 1;
            const dir = dx === 0 ? (Math.random() > 0.5 ? 1 : -1) : Math.sign(dx);
            positions[i].x -= dir * push;
            positions[j].x += dir * push;
          } else {
            const push = overlapY * pf + 1;
            const dir = dy === 0 ? (Math.random() > 0.5 ? 1 : -1) : Math.sign(dy);
            positions[i].y -= dir * push;
            positions[j].y += dir * push;
          }
        }
      }
    }
    for (const p of positions) {
      p.x = Math.max(minX, Math.min(maxX, p.x));
      p.y = Math.max(minY, Math.min(maxY, p.y));
    }
    if (maxOverlap < 1) break;
  }

  return positions;
}

/* ========== Location Generation ========== */

export function generateLocations(count: number): LocationData[] {
  const positions = generateRandomPositions(count);
  return positions.map((pos, i) => ({
    id: `loc-${i}`,
    name: `Lokalizacja ${i + 1}`,
    image: null,
    x: pos.x,
    y: pos.y,
    markers: { objective: 1, boldness: 1, survival: 1, altruism: 1 },
    spawn: i < 6 ? (i as 0 | 1 | 2 | 3 | 4 | 5) : null,
    color: 'brown',
  }));
}

/* ========== Utilities ========== */

export function findFreePosition(
  existing: LocationData[]
): { x: number; y: number } {
  const minX = PADDING;
  const maxX = MAP_WIDTH - TILE_WIDTH - PADDING;
  const minY = PADDING;
  const maxY = MAP_HEIGHT - TILE_HEIGHT - PADDING;

  for (let attempts = 0; attempts < 3000; attempts++) {
    const x = minX + Math.random() * (maxX - minX);
    const y = minY + Math.random() * (maxY - minY);
    const overlaps = existing.some(
      (p) =>
        Math.abs(p.x - x) < TILE_WIDTH + MIN_GAP &&
        Math.abs(p.y - y) < TILE_HEIGHT + MIN_GAP
    );
    if (!overlaps) return { x, y };
  }

  let x = minX + Math.random() * (maxX - minX);
  let y = minY + Math.random() * (maxY - minY);
  for (let iter = 0; iter < 200; iter++) {
    let pushed = false;
    for (const p of existing) {
      const dx = x - p.x;
      const dy = y - p.y;
      const overlapX = TILE_WIDTH + MIN_GAP - Math.abs(dx);
      const overlapY = TILE_HEIGHT + MIN_GAP - Math.abs(dy);
      if (overlapX > 0 && overlapY > 0) {
        pushed = true;
        if (overlapX < overlapY) {
          x += (dx === 0 ? 1 : Math.sign(dx)) * (overlapX * 0.6 + 1);
        } else {
          y += (dy === 0 ? 1 : Math.sign(dy)) * (overlapY * 0.6 + 1);
        }
      }
    }
    x = Math.max(minX, Math.min(maxX, x));
    y = Math.max(minY, Math.min(maxY, y));
    if (!pushed) break;
  }

  return { x, y };
}
