/* ============ Print settings ============ */
export const DPI = 300;
export const MM_PER_INCH = 25.4;

/** Convert millimeters to pixels at target DPI */
export function mmToPx(mm: number): number {
  return Math.round((mm / MM_PER_INCH) * DPI);
}

/* ============ Dimensions in millimeters (A2 format: 594mm x 420mm landscape) ============ */

// Game board (A2 landscape)
export const GAME_BOARD_WIDTH_MM = 594;
export const GAME_BOARD_HEIGHT_MM = 420;

// Room tiles
export const ROOM_WIDTH_MM = 100;
export const ROOM_HEIGHT_SMALL_MM = 60;
export const ROOM_HEIGHT_LARGE_MM = 100;
export const ROOM_HEADER_HEIGHT_MM = 17.5;       // Room header bar height (1.75cm)
export const ROOM_BORDER_WIDTH_MM = 1;           // Room border width
export const ROOM_HEADER_PADDING_MM = 1.5;       // Room header padding
export const ROOM_HEADER_GAP_MM = 2;             // Gap between header elements
export const ROOM_NAME_FONT_SIZE_MM = 4;         // Room name font size
export const ROOM_INITIAL_ICON_SIZE_MM = 10;     // Initial placement icon size
export const ROOM_PROP_ICON_SIZE_MM = 6;         // Prop tile icon size
export const ROOM_PROP_GAP_MM = 0.5;             // Gap between prop icons
export const ROOM_BORDER_RADIUS_MM = 3;          // Room corner radius
export const ROOM_INITIAL_ICON_RADIUS_MM = 1.5;  // Initial placement icon corner radius

// Path elements
export const PATH_STROKE_WIDTH_MM = 1.5;         // Main path line width
export const PATH_OUTLINE_WIDTH_MM = 2.5;        // Outline behind path
export const PATH_MARGIN_MM = 5;                 // Margin from room corners for ports
export const PATH_EXTENSION_MM = 13;             // How far path extends from port before routing
export const PATH_ARROW_SIZE_MM = 8;            // Vault arrow size
export const PATH_ICON_SIZE_MM = 22;             // Movement icon size (inner icon, 3cm x 3cm)
export const PATH_ICON_BORDER_MM = 1.5;          // Movement icon border width
export const PORT_RADIUS_MM = 3;                 // Port handle radius
export const PORT_HIT_RADIUS_MM = 5;             // Port clickable area

// Board margins
export const BOARD_MARGIN_MM = 13;               // Margin for via points
export const BOARD_EDGE_PADDING_MM = 5;          // Padding from board edges for rooms

/* ============ Dimensions in pixels (calculated from mm at 300 DPI) ============ */

// Game board
export const GAME_BOARD_WIDTH = mmToPx(GAME_BOARD_WIDTH_MM);
export const GAME_BOARD_HEIGHT = mmToPx(GAME_BOARD_HEIGHT_MM);

// Room tiles
export const ROOM_WIDTH = mmToPx(ROOM_WIDTH_MM);
export const ROOM_HEIGHT_SMALL = mmToPx(ROOM_HEIGHT_SMALL_MM);
export const ROOM_HEIGHT_LARGE = mmToPx(ROOM_HEIGHT_LARGE_MM);
export const ROOM_HEADER_HEIGHT = mmToPx(ROOM_HEADER_HEIGHT_MM);
export const ROOM_BORDER_WIDTH = mmToPx(ROOM_BORDER_WIDTH_MM);
export const ROOM_HEADER_PADDING = mmToPx(ROOM_HEADER_PADDING_MM);
export const ROOM_HEADER_GAP = mmToPx(ROOM_HEADER_GAP_MM);
export const ROOM_NAME_FONT_SIZE = mmToPx(ROOM_NAME_FONT_SIZE_MM);
export const ROOM_INITIAL_ICON_SIZE = mmToPx(ROOM_INITIAL_ICON_SIZE_MM);
export const ROOM_PROP_ICON_SIZE = mmToPx(ROOM_PROP_ICON_SIZE_MM);
export const ROOM_PROP_GAP = mmToPx(ROOM_PROP_GAP_MM);
export const ROOM_BORDER_RADIUS = mmToPx(ROOM_BORDER_RADIUS_MM);
export const ROOM_INITIAL_ICON_RADIUS = mmToPx(ROOM_INITIAL_ICON_RADIUS_MM);

// Path elements
export const PATH_STROKE_WIDTH = mmToPx(PATH_STROKE_WIDTH_MM);
export const PATH_OUTLINE_WIDTH = mmToPx(PATH_OUTLINE_WIDTH_MM);
export const PATH_MARGIN = mmToPx(PATH_MARGIN_MM);
export const PATH_EXTENSION = mmToPx(PATH_EXTENSION_MM);
export const PATH_ARROW_SIZE = mmToPx(PATH_ARROW_SIZE_MM);
export const PATH_ICON_SIZE = mmToPx(PATH_ICON_SIZE_MM);
export const PATH_ICON_BORDER = mmToPx(PATH_ICON_BORDER_MM);
export const PORT_RADIUS = mmToPx(PORT_RADIUS_MM);
export const PORT_HIT_RADIUS = mmToPx(PORT_HIT_RADIUS_MM);

// Board margins
export const BOARD_MARGIN = mmToPx(BOARD_MARGIN_MM);
export const BOARD_EDGE_PADDING = mmToPx(BOARD_EDGE_PADDING_MM);

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
  blue: '#0E98FF',
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
