# DBD Board Game Map Generator

A web-based tool for creating custom game board maps for the Dead by Daylight board game. Design rooms, connect paths, place prop tiles, and export your creations as images or shareable map files.

## Live Demo

**[Open the Map Generator](https://patryk-sredzinski.github.io/DBD-Board-Game-Map/)**

## Features

- **Room Management**
  - Add, move, and resize rooms (small/large)
  - Customize room colors with 10 color options
  - Upload custom images for each room
  - Set initial placement markers (0-5) for game start positions

- **Path System**
  - Connect rooms with 4 path types (Sneak, Sprint, Crouch, Vault)
  - Drag path endpoints around room perimeters
  - Position path icons anywhere along the path
  - Mark paths as breakable walls (max 4 per map)

- **Prop Tiles**
  - Place Objective, Boldness, Survival, and Altruism tiles
  - Automatic tracking of remaining tiles

- **Import/Export**
  - Export maps as `.dbdmap` files (includes all images)
  - Import previously saved maps
  - Download finished maps as PNG images

- **Validation**
  - Ensures all 6 initial placements are set
  - Checks all prop tiles are used
  - Verifies all rooms are connected
  - Confirms 4 breakable walls are placed

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/patryk-sredzinski/DBD-Board-Game-Map.git

# Navigate to project directory
cd DBD-Board-Game-Map

# Install dependencies
npm install

# Start development server
npm run dev
```

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` folder.

## Usage

1. **Right-click** on the game board to open the context menu
2. **Add rooms** and position them on the board
3. **Connect rooms** by right-clicking a room → "Connect to..." → select path type → click target room
4. **Customize** room colors, images, and prop tiles via context menu
5. **Export** your map as `.dbdmap` file to share or save
6. **Download** as PNG image when ready

## Tech Stack

- React 18
- TypeScript
- Vite
- html2canvas (for PNG export)
- JSZip (for .dbdmap format)

## Languages

The interface supports:
- English
- Polish (Polski)
- French (Français)
- German (Deutsch)
- Spanish (Español)

## Author

**Patryk Średziński**

## License

This project is for personal and fan use. Dead by Daylight is a trademark of Behaviour Interactive Inc.
