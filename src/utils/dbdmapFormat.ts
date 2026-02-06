import JSZip from 'jszip';
import { RoomData, PathConnection, RoomColor, RoomSize, InitialPlacementValue } from '../types';

// Format version for future compatibility
const FORMAT_VERSION = 1;

interface DbdMapManifest {
  version: number;
  rooms: DbdMapRoom[];
  paths: PathConnection[];
  backgroundImage?: string; // filename in zip, e.g. "background.png"
}

interface DbdMapRoom {
  id: string;
  name: string;
  x: number;
  y: number;
  propTiles: { objective: number; boldness: number; survival: number; altruism: number };
  initialPlacement: InitialPlacementValue;
  color: RoomColor;
  size: RoomSize;
  image?: string; // filename in zip, e.g. "rooms/room-123.png"
}

/**
 * Export game board data to .dbdmap file (ZIP format)
 */
export async function exportDbdMap(
  rooms: RoomData[],
  paths: PathConnection[],
  backgroundImage: string | null
): Promise<Blob> {
  const zip = new JSZip();
  
  // Prepare manifest
  const manifest: DbdMapManifest = {
    version: FORMAT_VERSION,
    rooms: [],
    paths: paths,
  };

  // Add background image if exists
  if (backgroundImage) {
    const bgData = base64ToBlob(backgroundImage);
    if (bgData) {
      const ext = getImageExtension(backgroundImage);
      const filename = `background.${ext}`;
      zip.file(filename, bgData.blob);
      manifest.backgroundImage = filename;
    }
  }

  // Add room images
  const roomsFolder = zip.folder('rooms');
  for (const room of rooms) {
    const manifestRoom: DbdMapRoom = {
      id: room.id,
      name: room.name,
      x: room.x,
      y: room.y,
      propTiles: room.propTiles,
      initialPlacement: room.initialPlacement,
      color: room.color,
      size: room.size,
    };

    if (room.image) {
      const imgData = base64ToBlob(room.image);
      if (imgData && roomsFolder) {
        const ext = getImageExtension(room.image);
        const filename = `${room.id}.${ext}`;
        roomsFolder.file(filename, imgData.blob);
        manifestRoom.image = `rooms/${filename}`;
      }
    }

    manifest.rooms.push(manifestRoom);
  }

  // Add manifest
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  // Generate ZIP blob
  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Import game board data from .dbdmap file
 */
export async function importDbdMap(file: File): Promise<{
  rooms: RoomData[];
  paths: PathConnection[];
  backgroundImage: string | null;
} | null> {
  try {
    const zip = await JSZip.loadAsync(file);
    
    // Read manifest
    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) {
      console.error('Invalid .dbdmap file: missing manifest.json');
      return null;
    }
    
    const manifestText = await manifestFile.async('text');
    const manifest: DbdMapManifest = JSON.parse(manifestText);
    
    // Validate version
    if (manifest.version > FORMAT_VERSION) {
      console.error('Unsupported .dbdmap version:', manifest.version);
      return null;
    }

    // Load background image
    let backgroundImage: string | null = null;
    if (manifest.backgroundImage) {
      const bgFile = zip.file(manifest.backgroundImage);
      if (bgFile) {
        const bgBlob = await bgFile.async('blob');
        backgroundImage = await blobToBase64(bgBlob);
      }
    }

    // Load rooms with images
    const rooms: RoomData[] = [];
    for (const manifestRoom of manifest.rooms) {
      let roomImage: string | null = null;
      
      if (manifestRoom.image) {
        const imgFile = zip.file(manifestRoom.image);
        if (imgFile) {
          const imgBlob = await imgFile.async('blob');
          roomImage = await blobToBase64(imgBlob);
        }
      }

      rooms.push({
        id: manifestRoom.id,
        name: manifestRoom.name,
        x: manifestRoom.x,
        y: manifestRoom.y,
        propTiles: manifestRoom.propTiles,
        initialPlacement: manifestRoom.initialPlacement,
        color: manifestRoom.color,
        size: manifestRoom.size || 'small', // Default to small for backwards compatibility
        image: roomImage,
      });
    }

    return {
      rooms,
      paths: manifest.paths,
      backgroundImage,
    };
  } catch (err) {
    console.error('Failed to import .dbdmap file:', err);
    return null;
  }
}

/**
 * Trigger download of .dbdmap file
 */
export function downloadDbdMap(blob: Blob, filename: string = 'gameboard.dbdmap'): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Helper: Convert base64 data URL to Blob
function base64ToBlob(dataUrl: string): { blob: Blob; mimeType: string } | null {
  try {
    const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!matches) return null;
    
    const mimeType = matches[1];
    const base64 = matches[2];
    const byteChars = atob(base64);
    const byteNumbers = new Array(byteChars.length);
    
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return { blob: new Blob([byteArray], { type: mimeType }), mimeType };
  } catch {
    return null;
  }
}

// Helper: Convert Blob to base64 data URL
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Helper: Get image extension from data URL
function getImageExtension(dataUrl: string): string {
  const match = dataUrl.match(/^data:image\/(\w+);/);
  if (match) {
    const ext = match[1].toLowerCase();
    // Convert 'jpeg' to 'jpg'
    return ext === 'jpeg' ? 'jpg' : ext;
  }
  return 'png'; // default
}
