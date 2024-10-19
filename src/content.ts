import html2canvas from 'html2canvas';

let isSelecting = false;
let startX: number, startY: number;
let selectionBox: HTMLDivElement | null = null;

function createSelectionBox() {
  selectionBox = document.createElement('div');
  selectionBox.style.position = 'fixed';
  selectionBox.style.border = '2px dashed #007bff';
  selectionBox.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
  selectionBox.style.pointerEvents = 'none';
  selectionBox.style.zIndex = '10000';
  document.body.appendChild(selectionBox);
}

function updateSelectionBox(endX: number, endY: number) {
  if (selectionBox) {
    const left = Math.min(startX, endX);
    const top = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    
    selectionBox.style.left = `${left}px`;
    selectionBox.style.top = `${top}px`;
    selectionBox.style.width = `${width}px`;
    selectionBox.style.height = `${height}px`;
  }
}

function removeSelectionBox() {
  if (selectionBox) {
    document.body.removeChild(selectionBox);
    selectionBox = null;
  }
}

function captureScreenshot(x: number, y: number, width: number, height: number) {
  const captureArea = document.createElement('div');
  captureArea.style.position = 'absolute';
  captureArea.style.left = `${x}px`;
  captureArea.style.top = `${y}px`;
  captureArea.style.width = `${width}px`;
  captureArea.style.height = `${height}px`;
  captureArea.style.overflow = 'hidden';
  document.body.appendChild(captureArea);

  html2canvas(captureArea).then((canvas) => {
    const screenshot = canvas.toDataURL('image/png');
    chrome.runtime.sendMessage({ action: 'screenshotTaken', screenshot });
    document.body.removeChild(captureArea);
  });
}

document.addEventListener('mousedown', (e) => {
  if (isSelecting) {
    startX = e.clientX;
    startY = e.clientY;
    createSelectionBox();
  }
});

document.addEventListener('mousemove', (e) => {
  if (isSelecting && selectionBox) {
    updateSelectionBox(e.clientX, e.clientY);
  }
});

document.addEventListener('mouseup', (e) => {
  if (isSelecting) {
    const endX = e.clientX;
    const endY = e.clientY;
    const left = Math.min(startX, endX);
    const top = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);

    captureScreenshot(left, top, width, height);
    removeSelectionBox();
    isSelecting = false;
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'takeScreenshot') {
    isSelecting = true;
  }
});