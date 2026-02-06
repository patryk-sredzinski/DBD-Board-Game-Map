export const GAME_BOARD_WIDTH = 2267;
export const GAME_BOARD_HEIGHT = 1927;
export const TOP_BAR_HEIGHT = 277;
export const ROOM_WIDTH = 483;
export const ROOM_HEIGHT_SMALL = 275;
export const ROOM_HEIGHT_LARGE = 408;

export type PropTileType = 'objective' | 'boldness' | 'survival' | 'altruism';
export type PathType = 'red' | 'green' | 'blue' | 'yellow';
export type InitialPlacementValue = 0 | 1 | 2 | 3 | 4 | 5 | null;

export interface PropTileCounts {
  objective: number;
  boldness: number;
  survival: number;
  altruism: number;
}

export type RoomColor = 'brown' | 'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'blue' | 'purple' | 'pink' | 'gray';

export type RoomSize = 'small' | 'large';

export interface RoomData {
  id: string;
  name: string;
  image: string | null;
  x: number;
  y: number;
  propTiles: PropTileCounts;
  initialPlacement: InitialPlacementValue;
  color: RoomColor;
  size: RoomSize;
}

export type PortSide = 'top' | 'bottom' | 'left' | 'right';

export interface PortPosition {
  side: PortSide;
  offset: number; // 0-1 along the edge
}

export interface PathConnection {
  id: string;
  from: string;
  to: string;
  color: PathType;
  // Port positions - side + offset along that edge
  exitPort?: PortPosition;   // Where path exits the 'from' room
  entryPort?: PortPosition;  // Where path enters the 'to' room
  // Icon position as absolute coordinates (if set, path routes through this point)
  viaPoint?: { x: number; y: number };
  hasBreakableWall?: boolean;
}

export const MAX_BREAKABLE_WALLS = 4;

export const PROP_TILE_LIMITS: Record<PropTileType, number> = {
  objective: 10,
  boldness: 10,
  survival: 12,
  altruism: 12,
};

export const PROP_TILE_COLORS: Record<PropTileType, string> = {
  objective: '#c9a84c',
  boldness: '#cc3333',
  survival: '#3388cc',
  altruism: '#33aa55',
};

export const PATH_COLORS: Record<PathType, string> = {
  red: '#cc2222',
  green: '#22aa44',
  blue: '#2266cc',
  yellow: '#ccaa22',
};

export const PROP_TILE_TYPES: PropTileType[] = ['objective', 'boldness', 'survival', 'altruism'];
export const PATH_TYPE_OPTIONS: PathType[] = ['red', 'green', 'blue', 'yellow'];
export const INITIAL_PLACEMENT_VALUES: (0 | 1 | 2 | 3 | 4 | 5)[] = [0, 1, 2, 3, 4, 5];

export const ROOM_COLOR_OPTIONS: RoomColor[] = [
  'brown', 'red', 'orange', 'yellow', 'green',
  'teal', 'blue', 'purple', 'pink', 'gray'
];

export const ROOM_COLORS: Record<RoomColor, { header: string; border: string }> = {
  brown:  { header: '#7a6a5a', border: '#a08060' },
  red:    { header: '#8a5050', border: '#c06060' },
  orange: { header: '#8a6040', border: '#c08040' },
  yellow: { header: '#8a7a40', border: '#c0a040' },
  green:  { header: '#508a50', border: '#60c060' },
  teal:   { header: '#508a8a', border: '#60c0c0' },
  blue:   { header: '#506080', border: '#6080c0' },
  purple: { header: '#6a5080', border: '#9060b0' },
  pink:   { header: '#8a5070', border: '#c06090' },
  gray:   { header: '#686868', border: '#909090' },
};
