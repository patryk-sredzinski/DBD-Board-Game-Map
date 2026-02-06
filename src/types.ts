export const MAP_WIDTH = 2267;
export const MAP_HEIGHT = 1927;
export const TILE_WIDTH = 483;
export const TILE_HEIGHT = 275;

export type MarkerType = 'objective' | 'boldness' | 'survival' | 'altruism';
export type PathColor = 'red' | 'green' | 'blue' | 'yellow';
export type SpawnValue = 0 | 1 | 2 | 3 | 4 | 5 | null;

export interface MarkerCounts {
  objective: number;
  boldness: number;
  survival: number;
  altruism: number;
}

export type TileColor = 'brown' | 'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'blue' | 'purple' | 'pink' | 'gray';

export interface LocationData {
  id: string;
  name: string;
  image: string | null;
  x: number;
  y: number;
  markers: MarkerCounts;
  spawn: SpawnValue;
  color: TileColor;
}

export interface PathConnection {
  id: string;
  from: string;
  to: string;
  color: PathColor;
  viaPoint?: { x: number; y: number };
  hasDoor?: boolean;
}

export const MAX_DOORS = 4;

export const MARKER_LIMITS: Record<MarkerType, number> = {
  objective: 10,
  boldness: 10,
  survival: 12,
  altruism: 12,
};

export const MARKER_COLORS: Record<MarkerType, string> = {
  objective: '#c9a84c',
  boldness: '#cc3333',
  survival: '#3388cc',
  altruism: '#33aa55',
};

export const PATH_COLORS: Record<PathColor, string> = {
  red: '#cc2222',
  green: '#22aa44',
  blue: '#2266cc',
  yellow: '#ccaa22',
};

export const MARKER_TYPES: MarkerType[] = ['objective', 'boldness', 'survival', 'altruism'];
export const PATH_COLOR_OPTIONS: PathColor[] = ['red', 'green', 'blue', 'yellow'];
export const SPAWN_VALUES: (0 | 1 | 2 | 3 | 4 | 5)[] = [0, 1, 2, 3, 4, 5];

export const TILE_COLOR_OPTIONS: TileColor[] = [
  'brown', 'red', 'orange', 'yellow', 'green',
  'teal', 'blue', 'purple', 'pink', 'gray'
];

export const TILE_COLORS: Record<TileColor, { header: string; border: string }> = {
  brown:  { header: '#3d3225', border: '#8B7355' },
  red:    { header: '#3d1c1c', border: '#8B4040' },
  orange: { header: '#3d2a14', border: '#8B6030' },
  yellow: { header: '#3d3814', border: '#8B8030' },
  green:  { header: '#1c3d1c', border: '#408B40' },
  teal:   { header: '#1c3d3d', border: '#408B8B' },
  blue:   { header: '#1c1c3d', border: '#40408B' },
  purple: { header: '#2e1c3d', border: '#6B408B' },
  pink:   { header: '#3d1c30', border: '#8B4070' },
  gray:   { header: '#2f2f2f', border: '#6B6B6B' },
};
