import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { GAME_BOARD_WIDTH, GAME_BOARD_HEIGHT, GAME_BOARD_WIDTH_MM, GAME_BOARD_HEIGHT_MM } from '../types';

export type PdfFormat = 'a2' | '2xa3';

// Convert an image URL to a data URL
async function imageToDataUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        reject(new Error('Could not get canvas context'));
      }
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

// Convert SVG element to an image data URL
async function svgToImage(svgElement: SVGSVGElement): Promise<string> {
  // Clone SVG and inline all styles
  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
  
  // Set explicit dimensions
  clonedSvg.setAttribute('width', String(GAME_BOARD_WIDTH));
  clonedSvg.setAttribute('height', String(GAME_BOARD_HEIGHT));
  
  // Remove port handles (circular dragging icons) from export
  clonedSvg.querySelectorAll('.port-handle').forEach((el) => {
    el.remove();
  });
  
  // Convert all <image> elements to use data URLs
  const imageElements = clonedSvg.querySelectorAll('image');
  for (const imgEl of imageElements) {
    const href = imgEl.getAttribute('href') || imgEl.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
    if (href && !href.startsWith('data:')) {
      try {
        const dataUrl = await imageToDataUrl(href);
        imgEl.setAttribute('href', dataUrl);
        imgEl.removeAttributeNS('http://www.w3.org/1999/xlink', 'href');
      } catch (err) {
        console.warn('Failed to convert image to data URL:', href, err);
      }
    }
  }
  
  // Serialize SVG to string
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clonedSvg);
  
  // Create blob and load as image
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Draw to canvas to get data URL
      const canvas = document.createElement('canvas');
      canvas.width = GAME_BOARD_WIDTH;
      canvas.height = GAME_BOARD_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      } else {
        reject(new Error('Could not get canvas context'));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG as image'));
    };
    img.src = url;
  });
}

export async function exportGameBoardAsImage(element: HTMLElement, format: PdfFormat = 'a2'): Promise<void> {
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
  
  // Fix background image - html2canvas doesn't support object-fit properly
  // Replace img element with div using background-image
  const bgImage = clone.querySelector('.game-board-background') as HTMLImageElement;
  if (bgImage) {
    const src = bgImage.src;
    const container = bgImage.parentElement;
    if (container && src) {
      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.top = '0';
      div.style.left = '0';
      div.style.width = '100%';
      div.style.height = '100%';
      div.style.backgroundImage = `url("${src}")`;
      div.style.backgroundSize = 'cover';
      div.style.backgroundPosition = 'center';
      div.style.zIndex = '0';
      // Insert right after the original img to keep it behind paths and rooms
      bgImage.replaceWith(div);
    }
  }
  
  // Fix room images - html2canvas doesn't support object-fit properly
  // Replace img elements with divs using background-image
  clone.querySelectorAll('.room-image').forEach((img) => {
    const imgEl = img as HTMLImageElement;
    const src = imgEl.src;
    const container = imgEl.parentElement;
    if (container && src) {
      // Create a div with background-image to replace the img
      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.top = '0';
      div.style.left = '0';
      div.style.width = '100%';
      div.style.height = '100%';
      div.style.backgroundImage = `url("${src}")`;
      div.style.backgroundSize = 'cover';
      div.style.backgroundPosition = 'center';
      // Hide original img and add the div
      imgEl.style.display = 'none';
      container.appendChild(div);
    }
  });
  
  // Convert SVG to image to avoid html2canvas SVG rendering issues
  const svgElement = clone.querySelector('.path-overlay') as SVGSVGElement;
  if (svgElement) {
    try {
      // Get SVG from the ORIGINAL element (not clone) to preserve correct rendering
      const originalSvg = element.querySelector('.path-overlay') as SVGSVGElement;
      if (originalSvg) {
        const svgDataUrl = await svgToImage(originalSvg);
        
        // Create an img element to replace the SVG
        const imgElement = document.createElement('img');
        imgElement.src = svgDataUrl;
        imgElement.style.position = 'absolute';
        imgElement.style.top = '0';
        imgElement.style.left = '0';
        imgElement.style.width = `${GAME_BOARD_WIDTH}px`;
        imgElement.style.height = `${GAME_BOARD_HEIGHT}px`;
        imgElement.style.pointerEvents = 'none';
        
        // Replace SVG with img in clone
        svgElement.parentNode?.replaceChild(imgElement, svgElement);
        
        // Wait for image to load
        await new Promise<void>((resolve) => {
          if (imgElement.complete) {
            resolve();
          } else {
            imgElement.onload = () => resolve();
          }
        });
      }
    } catch (err) {
      console.warn('Failed to convert SVG to image, falling back to direct rendering:', err);
    }
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

    if (format === '2xa3') {
      const halfWidth = Math.floor(canvas.width / 2);
      const a3WidthMm = GAME_BOARD_WIDTH_MM / 2; // 297mm
      const a3HeightMm = GAME_BOARD_HEIGHT_MM;    // 420mm

      const leftCanvas = document.createElement('canvas');
      leftCanvas.width = halfWidth;
      leftCanvas.height = canvas.height;
      const leftCtx = leftCanvas.getContext('2d')!;
      leftCtx.drawImage(canvas, 0, 0, halfWidth, canvas.height, 0, 0, halfWidth, canvas.height);

      const rightCanvas = document.createElement('canvas');
      rightCanvas.width = canvas.width - halfWidth;
      rightCanvas.height = canvas.height;
      const rightCtx = rightCanvas.getContext('2d')!;
      rightCtx.drawImage(canvas, halfWidth, 0, canvas.width - halfWidth, canvas.height, 0, 0, canvas.width - halfWidth, canvas.height);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [a3WidthMm, a3HeightMm],
      });
      pdf.addImage(leftCanvas.toDataURL('image/png'), 'PNG', 0, 0, a3WidthMm, a3HeightMm);
      pdf.addPage([a3WidthMm, a3HeightMm], 'portrait');
      pdf.addImage(rightCanvas.toDataURL('image/png'), 'PNG', 0, 0, a3WidthMm, a3HeightMm);
      pdf.save('dbd-game-board-2xA3.pdf');
    } else {
      const pngDataUrl = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [GAME_BOARD_WIDTH_MM, GAME_BOARD_HEIGHT_MM],
      });
      pdf.addImage(pngDataUrl, 'PNG', 0, 0, GAME_BOARD_WIDTH_MM, GAME_BOARD_HEIGHT_MM);
      pdf.save('dbd-game-board.pdf');
    }
  } finally {
    // Remove clone
    document.body.removeChild(clone);
  }
}
