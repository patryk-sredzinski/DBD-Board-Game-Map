import html2canvas from 'html2canvas';
import { GAME_BOARD_WIDTH, GAME_BOARD_HEIGHT } from '../types';

export async function exportGameBoardAsImage(element: HTMLElement): Promise<void> {
  // Wait for fonts to be loaded
  await document.fonts.ready;

  // Clone the element for off-screen rendering
  const clone = element.cloneNode(true) as HTMLElement;
  
  // Style clone to be off-screen but rendered at full size
  clone.style.position = 'absolute';
  clone.style.left = '-9999px';
  clone.style.top = '-9999px';
  clone.style.transform = 'none';
  clone.style.transformOrigin = 'top left';
  clone.style.width = `${GAME_BOARD_WIDTH}px`;
  clone.style.height = `${GAME_BOARD_HEIGHT}px`;
  
  // Hide port handles for export
  clone.querySelectorAll('.port-handle').forEach((el) => {
    (el as HTMLElement).style.display = 'none';
  });
  
  // Adjust background to extend under the top bar for seamless rendering
  const bgImage = clone.querySelector('.game-board-background') as HTMLElement;
  if (bgImage) {
    bgImage.style.top = '0';
    bgImage.style.height = '100%';
  }
  
  document.body.appendChild(clone);

  // Small delay to ensure clone is rendered
  await new Promise(resolve => setTimeout(resolve, 100));

  try {
    const canvas = await html2canvas(clone, {
      width: GAME_BOARD_WIDTH,
      height: GAME_BOARD_HEIGHT,
      scale: 1,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false,
    });

    // Download
    canvas.toBlob((blob) => {
      if (!blob) {
        throw new Error('Failed to create blob');
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'dbd-game-board.png';
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/png');
  } finally {
    // Remove clone
    document.body.removeChild(clone);
  }
}
