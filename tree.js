// tree.js
// -------------------
// Responsible for all SVG‐based logic: adding/editing/removing nodes,
// dragging, connect‐mode, generate connections, undo stack, etc.
// Now includes: pan/zoom, grid, selection, connect, and style features

import { updateSearchableSelects } from './searchableSelect.js';
import { openModalForEdit, closeModal } from './modal.js';
import { rebuildTableView } from './table.js';
import { exportTree } from './exporter.js';

let svg, addPersonBtn, connectBtn, styleBtn, undoBtn, undoStack = [], redoStack = [];
let connectMode = false, connectFirst = null;
let nodeRadius = 40, defaultColor = '#3498db';
let fontFamily = 'Inter', fontSize = 14, nameColor = '#333333', dateColor = '#757575';
let nextPersonId = 1;

// Pan/Zoom variables
let isPanning = false, startPoint = { x: 0, y: 0 };
let scale = 1, panX = 0, panY = 0;
const minScale = 0.1, maxScale = 5;
let isDragging = false; // Global drag state

<<<<<<< HEAD
// Performance optimization variables
let gridRedrawTimeout;
=======
// Selection management
let selectedCircles = new Set();

// Grid settings
const gridSize = 50;

// Connection modal variables
let connectionPersonA = null, connectionPersonB = null;
>>>>>>> parent of 98947fd (1)

// ----------------------------------------------------------------------------
// Initialize SVG, buttons, and event listeners
// ----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  svg = document.getElementById('svgArea');
  addPersonBtn = document.getElementById('addPersonBtn');
  connectBtn = document.getElementById('connectBtn');
  styleBtn = document.getElementById('styleBtn');
  undoBtn = document.getElementById('undoBtn');

  setupPanZoom();
  drawGrid();
  addPersonBtn.addEventListener('click', () => openModalForEdit());
  connectBtn.addEventListener('click', () => toggleConnectMode());
  styleBtn.addEventListener('click', () => openStylePanel());
  undoBtn.addEventListener('click', () => undo());

  updateSearchableSelects();
});

// ----------------------------------------------------------------------------
// Pan & Zoom
// ----------------------------------------------------------------------------
function setupPanZoom() {
<<<<<<< HEAD
=======
  if (!svg) return;

  // Touch handling variables
  let lastTouchDistance = 0;
  let lastTouchCenter = { x: 0, y: 0 };
  let isTouching = false;
  let touchStartTime = 0;
  let initialTouchDistance = 0;
  let initialScale = 1;
  let initialPan = { x: 0, y: 0 };

  // Helper function to get touch distance
  function getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Helper function to get touch center
  function getTouchCenter(touches) {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    };
  }

  // Mouse wheel zoom (desktop)
>>>>>>> parent of 98947fd (1)
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();

    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
<<<<<<< HEAD
    const delta = e.deltaY < 0 ? 1.1 : 0.9;

    const newScale = Math.min(maxScale, Math.max(minScale, scale * delta));
    const factor = newScale / scale;

    panX = mouseX - (mouseX - panX) * factor;
    panY = mouseY - (mouseY - panY) * factor;
    scale = newScale;

    svg.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  }, { passive: false });

=======
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(minScale, Math.min(maxScale, scale * delta));
    
    if (newScale !== scale) {
      const factor = newScale / scale;
      panX = mouseX - factor * (mouseX - panX);
      panY = mouseY - factor * (mouseY - panY);
      scale = newScale;
      updateTransform();
      
      // Redraw grid after zoom
      drawGrid();
    }
  }, { passive: false });

  // Touch events for mobile
  svg.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    isTouching = true;
    touchStartTime = Date.now();
    
    if (e.touches.length === 1) {
      // Single finger - prepare for panning
      const touch = e.touches[0];
      if (e.target === svg || e.target.classList.contains('grid-line')) {
        isPanning = true;
        startPoint = { 
          x: touch.clientX - panX, 
          y: touch.clientY - panY 
        };
        svg.classList.add('panning');
      }
    } else if (e.touches.length === 2) {
      // Two fingers - prepare for pinch zoom
      isPanning = false;
      svg.classList.remove('panning');
      
      initialTouchDistance = getTouchDistance(e.touches);
      lastTouchDistance = initialTouchDistance;
      lastTouchCenter = getTouchCenter(e.touches);
      initialScale = scale;
      initialPan = { x: panX, y: panY };
    }
  }, { passive: false });

  svg.addEventListener('touchmove', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isTouching) return;
    
    if (e.touches.length === 1 && isPanning) {
      // Single finger panning
      const touch = e.touches[0];
      panX = touch.clientX - startPoint.x;
      panY = touch.clientY - startPoint.y;
      updateTransform();
    } else if (e.touches.length === 2) {
      // Two finger pinch zoom
      const currentDistance = getTouchDistance(e.touches);
      const currentCenter = getTouchCenter(e.touches);
      
      if (initialTouchDistance > 0) {
        // Calculate zoom
        const scaleChange = currentDistance / initialTouchDistance;
        const newScale = Math.max(minScale, Math.min(maxScale, initialScale * scaleChange));
        
        if (newScale !== scale) {
          // Get SVG coordinates of the pinch center
          const rect = svg.getBoundingClientRect();
          const centerX = currentCenter.x - rect.left;
          const centerY = currentCenter.y - rect.top;
          
          // Calculate new pan to keep zoom centered on pinch point
          const factor = newScale / scale;
          panX = centerX - factor * (centerX - panX);
          panY = centerY - factor * (centerY - panY);
          scale = newScale;
          
          updateTransform();
        }
      }
      
      lastTouchDistance = currentDistance;
      lastTouchCenter = currentCenter;
    }
  }, { passive: false });

  svg.addEventListener('touchend', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.touches.length === 0) {
      // All fingers lifted
      isTouching = false;
      isPanning = false;
      svg.classList.remove('panning');
      
      // Redraw grid after pan/zoom
      drawGrid();
      
      // Reset touch variables
      lastTouchDistance = 0;
      initialTouchDistance = 0;
      touchStartTime = 0;
    } else if (e.touches.length === 1) {
      // One finger still down, switch back to pan mode
      const touch = e.touches[0];
      if (e.target === svg || e.target.classList.contains('grid-line')) {
        isPanning = true;
        startPoint = { 
          x: touch.clientX - panX, 
          y: touch.clientY - panY 
        };
        svg.classList.add('panning');
      }
    }
  }, { passive: false });

  // Prevent context menu on long press
  svg.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  // Mouse events for desktop (existing functionality)
>>>>>>> parent of 98947fd (1)
  svg.addEventListener('mousedown', (e) => {
    isPanning = true;
    startPoint = { x: e.clientX - panX, y: e.clientY - panY };
    svg.style.cursor = 'grabbing';
  });

  svg.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    panX = e.clientX - startPoint.x;
    panY = e.clientY - startPoint.y;
    svg.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  });

<<<<<<< HEAD
  svg.addEventListener('mouseup', () => {
    isPanning = false;
    svg.style.cursor = 'grab';
  });

  svg.addEventListener('mouseleave', () => {
    isPanning = false;
    svg.style.cursor = 'grab';
=======
  document.addEventListener('mouseup', (e) => {
    if (isPanning && !isTouching) { // Only handle mouse release if not touching
      isPanning = false;
      svg.classList.remove('panning');
      // Redraw grid after pan
      drawGrid();
      e.preventDefault();
    }
>>>>>>> parent of 98947fd (1)
  });
}

// ----------------------------------------------------------------------------
// Draw background grid
// ----------------------------------------------------------------------------
function drawGrid() {
  const gridSize = 50;
  const width = svg.clientWidth;
  const height = svg.clientHeight;

<<<<<<< HEAD
=======
  // Remove existing grid
  svg.querySelectorAll('.grid-line').forEach(line => line.remove());

  // Get the current viewport dimensions
  const rect = svg.getBoundingClientRect();
  const viewportWidth = rect.width;
  const viewportHeight = rect.height;

  // Calculate the visible area considering pan and zoom
  const visibleLeft = -panX / scale;
  const visibleTop = -panY / scale;
  const visibleWidth = viewportWidth / scale;
  const visibleHeight = viewportHeight / scale;

  // Extend grid beyond visible area for smooth panning
  const padding = gridSize * 10;
  const gridLeft = Math.floor((visibleLeft - padding) / gridSize) * gridSize;
  const gridTop = Math.floor((visibleTop - padding) / gridSize) * gridSize;
  const gridRight = Math.ceil((visibleLeft + visibleWidth + padding) / gridSize) * gridSize;
  const gridBottom = Math.ceil((visibleTop + visibleHeight + padding) / gridSize) * gridSize;

  // Create grid group
  const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  gridGroup.id = 'gridGroup';

  // Vertical lines
  for (let x = gridLeft; x <= gridRight; x += gridSize) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.classList.add('grid-line');
    if (x % (gridSize * 4) === 0) line.classList.add('major');
    line.setAttribute('x1', x);
    line.setAttribute('y1', gridTop);
    line.setAttribute('x2', x);
    line.setAttribute('y2', gridBottom);
    gridGroup.appendChild(line);
  }

  // Horizontal lines
  for (let y = gridTop; y <= gridBottom; y += gridSize) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.classList.add('grid-line');
    if (y % (gridSize * 4) === 0) line.classList.add('major');
    line.setAttribute('x1', gridLeft);
    line.setAttribute('y1', y);
    line.setAttribute('x2', gridRight);
    line.setAttribute('y2', y);
    gridGroup.appendChild(line);
  }

  // Insert grid as first child so it appears behind everything
>>>>>>> parent of 98947fd (1)
  const mainGroup = document.getElementById('mainGroup');
  if (gridRedrawTimeout) clearTimeout(gridRedrawTimeout);

  while (mainGroup.querySelectorAll('.grid-line').length > 0) {
    mainGroup.querySelector('.grid-line').remove();
  }

  for (let x = 0; x < width; x += gridSize) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x);
    line.setAttribute('y1', 0);
    line.setAttribute('x2', x);
    line.setAttribute('y2', height);
    line.setAttribute('class', 'grid-line');
    if ((x / gridSize) % 5 === 0) line.classList.add('major');
    mainGroup.appendChild(line);
  }

  for (let y = 0; y < height; y += gridSize) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', 0);
    line.setAttribute('y1', y);
    line.setAttribute('x2', width);
    line.setAttribute('y2', y);
    line.setAttribute('class', 'grid-line');
    if ((y / gridSize) % 5 === 0) line.classList.add('major');
    mainGroup.appendChild(line);
  }

  // Throttle future redraws
  gridRedrawTimeout = setTimeout(drawGrid, 100);
}

// ----------------------------------------------------------------------------
// Node Creation & Rendering
// ----------------------------------------------------------------------------
export function addPerson(data = {}) {
  const mainGroup = document.getElementById('mainGroup');
  const personGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  personGroup.setAttribute('class', 'person-group');
  personGroup.setAttribute('data-id', nextPersonId);

  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('class', 'person');
  circle.setAttribute('cx', data.cx || 100);
  circle.setAttribute('cy', data.cy || 100);
  circle.setAttribute('r', nodeRadius);
  circle.setAttribute('fill', data.fill || defaultColor);
  circle.setAttribute('data-id', nextPersonId);

  const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  nameText.setAttribute('class', 'name');
  nameText.setAttribute('x', data.cx || 100);
  nameText.setAttribute('y', (data.cy || 100) - nodeRadius - 8);
  nameText.setAttribute('font-family', fontFamily);
  nameText.setAttribute('font-size', `${fontSize}px`);
  nameText.setAttribute('fill', nameColor);
  nameText.setAttribute('text-anchor', 'middle');
  nameText.textContent = data.name || 'Name';

  const dobText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  dobText.setAttribute('class', 'dob');
  dobText.setAttribute('x', data.cx || 100);
  dobText.setAttribute('y', (data.cy || 100) + nodeRadius + 16);
  dobText.setAttribute('font-family', fontFamily);
  dobText.setAttribute('font-size', `${fontSize - 2}px`);
  dobText.setAttribute('fill', dateColor);
  dobText.setAttribute('text-anchor', 'middle');
  dobText.textContent = data.dob || 'YYYY';

  personGroup.appendChild(circle);
  personGroup.appendChild(nameText);
  personGroup.appendChild(dobText);
  mainGroup.appendChild(personGroup);

  setupCircleInteractions(personGroup, circle, nextPersonId);

  nextPersonId++;
}

// ----------------------------------------------------------------------------
// Setup circle interactions (desktop + mobile)
// ----------------------------------------------------------------------------
function setupCircleInteractions(group, circle, personId) {
  makeCircleDraggable(group, circle);

  let clickTimeout;
  let tapCount = 0;
  let lastTapTime = 0;
  let touchStartPos = null;
  let touchMoved = false;

  // Mouse events for desktop
  circle.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (clickTimeout) {
      clearTimeout(clickTimeout);
      clickTimeout = null;
    }

    clickTimeout = setTimeout(() => {
      if (!isDragging) {
        toggleCircleSelection(personId, circle, group);
      }
    }, 200);
  });

  circle.addEventListener('dblclick', (e) => {
    console.log('Double-clicked on circle:', personId);
    e.preventDefault();
    e.stopPropagation();

    if (clickTimeout) {
      clearTimeout(clickTimeout);
      clickTimeout = null;
    }

    clearSelection(); // Clear selection when editing
    openModalForEdit(personId);
  });

  // Touch events for mobile
  circle.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartPos = { x: touch.clientX, y: touch.clientY };
      touchMoved = false;

      const currentTime = Date.now();
      const timeDiff = currentTime - lastTapTime;
      if (timeDiff < 300 && timeDiff > 0) {
        tapCount++;
      } else {
        tapCount = 1;
      }
      lastTapTime = currentTime;
    }
  }, { passive: false, capture: false }); // ← changed to passive: false

  circle.addEventListener('touchmove', (e) => {
    if (!touchStartPos || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.x);
    const dy = Math.abs(touch.clientY - touchStartPos.y);
    // If moved more than 10px, consider it a drag
    if (dx > 10 || dy > 10) {
      touchMoved = true;
    }
  }, { passive: false, capture: false }); // ← changed to passive: false

  circle.addEventListener('touchend', (e) => {
    // Check if event is cancelable before preventing default
    if (e.cancelable) {
      e.preventDefault();
    }
    e.stopPropagation();

    if (!touchMoved && touchStartPos) {
      if (tapCount === 1) {
        // Single tap - select/deselect with delay to detect double tap
        if (clickTimeout) {
          clearTimeout(clickTimeout);
          clickTimeout = null;
        }

        clickTimeout = setTimeout(() => {
          if (tapCount === 1) { // Still single tap after delay
            toggleCircleSelection(personId, circle, group);
          }
        }, 300);
      } else if (tapCount === 2) {
        // Double tap - edit
        console.log('Double-tapped on circle:', personId);

        if (clickTimeout) {
          clearTimeout(clickTimeout);
          clickTimeout = null;
        }

        clearSelection(); // Clear selection when editing
        openModalForEdit(personId);
        tapCount = 0; // Reset tap count
      }
    }

    // Reset touch tracking
    touchStartPos = null;
    touchMoved = false;
  }, { passive: false, capture: true });
}

// ----------------------------------------------------------------------------
// Make a circle draggable by both mouse and touch
// ----------------------------------------------------------------------------
function makeCircleDraggable(group, circle) {
  let offsetX, offsetY, isCircleTouching = false;
  isDragging = false;

  // Mouse events for desktop
  circle.addEventListener('mousedown', (e) => {
    if (e.detail === 1) { // Single click
      e.preventDefault();
      e.stopPropagation();
      isDragging = true;

      // Get current circle position
      const currentCx = parseFloat(circle.getAttribute('cx')) || 0;
      const currentCy = parseFloat(circle.getAttribute('cy')) || 0;

      // Get mouse position in SVG coordinates
      const rect = svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Calculate offset considering current pan/zoom
      const svgX = (mouseX - panX) / scale;
      const svgY = (mouseY - panY) / scale;
      offsetX = svgX - currentCx;
      offsetY = svgY - currentCy;

      circle.style.cursor = 'grabbing';
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging || isCircleTouching) return;

    // Get mouse position in SVG coordinates
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert to SVG coordinates considering pan/zoom
    const svgX = (mouseX - panX) / scale;
    const svgY = (mouseY - panY) / scale;

    const newCx = svgX - offsetX;
    const newCy = svgY - offsetY;

    // Ensure coordinates are valid numbers
    if (!isNaN(newCx) && !isNaN(newCy)) {
      circle.setAttribute('cx', newCx);
      circle.setAttribute('cy', newCy);

      const nameText = group.querySelector('text.name');
      const dobText = group.querySelector('text.dob');
      const radius = parseFloat(circle.getAttribute('r')) || nodeRadius;

      if (nameText) {
        nameText.setAttribute('x', newCx);
        nameText.setAttribute('y', newCy - radius - 8);
      }

      if (dobText) {
        dobText.setAttribute('x', newCx);
        dobText.setAttribute('y', newCy + radius + 16);
      }

      generateAllConnections();
    }
  });

  document.addEventListener('mouseup', (e) => {
    if (!isDragging || isCircleTouching) return;
    isDragging = false;
    pushUndoState();
    circle.style.cursor = 'grab';
  });

  // Touch events for mobile
  circle.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.touches.length === 1) {
      isCircleTouching = true;
      isDragging = true;

      // Get current circle position
      const currentCx = parseFloat(circle.getAttribute('cx')) || 0;
      const currentCy = parseFloat(circle.getAttribute('cy')) || 0;

      // Get touch position in SVG coordinates
      const rect = svg.getBoundingClientRect();
      const touch = e.touches[0];
      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;

      // Calculate offset considering current pan/zoom
      const svgX = (touchX - panX) / scale;
      const svgY = (touchY - panY) / scale;
      offsetX = svgX - currentCx;
      offsetY = svgY - currentCy;

      circle.style.cursor = 'grabbing';
    }
  }, { passive: false });

  circle.addEventListener('touchmove', (e) => {
    if (!isCircleTouching || !isDragging || e.touches.length !== 1) return;
    e.preventDefault();
    e.stopPropagation();

    // Get touch position in SVG coordinates
    const rect = svg.getBoundingClientRect();
    const touch = e.touches[0];
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;

    // Convert to SVG coordinates considering pan/zoom
    const svgX = (touchX - panX) / scale;
    const svgY = (touchY - panY) / scale;

    const newCx = svgX - offsetX;
    const newCy = svgY - offsetY;

    // Ensure coordinates are valid numbers
    if (!isNaN(newCx) && !isNaN(newCy)) {
      circle.setAttribute('cx', newCx);
      circle.setAttribute('cy', newCy);

      const nameText = group.querySelector('text.name');
      const dobText = group.querySelector('text.dob');
      const radius = parseFloat(circle.getAttribute('r')) || nodeRadius;

      if (nameText) {
        nameText.setAttribute('x', newCx);
        nameText.setAttribute('y', newCy - radius - 8);
      }

      if (dobText) {
        dobText.setAttribute('x', newCx);
        dobText.setAttribute('y', newCy + radius + 16);
      }

      generateAllConnections();
    }
  }, { passive: false });

  circle.addEventListener('touchend', (e) => {
    if (!isCircleTouching) return;

    e.preventDefault();
    e.stopPropagation();

    isCircleTouching = false;

    if (isDragging) {
      isDragging = false;
      pushUndoState();
      circle.style.cursor = 'grab';
    }
  }, { passive: false });
}

// ----------------------------------------------------------------------------
// Toggle selection (highlight/unhighlight) on a circle
// ----------------------------------------------------------------------------
function toggleCircleSelection(personId, circle, group) {
  const currentlySelected = circle.classList.contains('selected');
  clearSelection();
  if (!currentlySelected) {
    circle.classList.add('selected');
    circle.setAttribute('stroke', '#e74c3c');
    circle.setAttribute('stroke-width', '4px');
  }
}

function clearSelection() {
  svg.querySelectorAll('circle.selected').forEach(c => {
    c.classList.remove('selected');
    c.setAttribute('stroke', '#2c3e50');
    c.setAttribute('stroke-width', '2px');
  });
}

// ----------------------------------------------------------------------------
// Generate all connections (lines) between people
// ----------------------------------------------------------------------------
function generateAllConnections() {
  const existingRelations = svg.querySelectorAll('line.relation');
  existingRelations.forEach(r => r.remove());

  const allGroups = Array.from(svg.querySelectorAll('g.person-group'));
  allGroups.forEach(groupA => {
    const idA = parseInt(groupA.getAttribute('data-id'));
    const personA = groupA.personData;

    if (!personA) return;
    if (!personA.relations) return;

    personA.relations.forEach(rel => {
      const groupB = svg.querySelector(`g.person-group[data-id='${rel.id}']`);
      if (!groupB) return;

      const circleA = groupA.querySelector('circle.person');
      const circleB = groupB.querySelector('circle.person');

      const x1 = parseFloat(circleA.getAttribute('cx'));
      const y1 = parseFloat(circleA.getAttribute('cy'));
      const x2 = parseFloat(circleB.getAttribute('cx'));
      const y2 = parseFloat(circleB.getAttribute('cy'));

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1);
      line.setAttribute('y1', y1);
      line.setAttribute('x2', x2);
      line.setAttribute('y2', y2);
      line.setAttribute('class', `relation ${rel.type}`);
      svg.querySelector('#mainGroup').appendChild(line);
    });
  });
}

// ----------------------------------------------------------------------------
// Undo/Redo System
// ----------------------------------------------------------------------------
export function pushUndoState() {
  if (!svg) return;

  const mainGroup = document.getElementById('mainGroup');
  const snapshot = mainGroup.cloneNode(true);
  undoStack.push(snapshot);
  if (undoStack.length > 100) {
    undoStack.shift();
  }
}

export function undo() {
  if (undoStack.length === 0) return;
  const mainGroup = document.getElementById('mainGroup');
  redoStack.push(mainGroup.cloneNode(true));

  const lastState = undoStack.pop();
  mainGroup.parentNode.replaceChild(lastState, mainGroup);

  rebuildTableView();
}

export function redo() {
  if (redoStack.length === 0) return;
  const mainGroup = document.getElementById('mainGroup');
  undoStack.push(mainGroup.cloneNode(true));

  const nextState = redoStack.pop();
  mainGroup.parentNode.replaceChild(nextState, mainGroup);

  rebuildTableView();
}

// ----------------------------------------------------------------------------
// Modal & Table Integration
// ----------------------------------------------------------------------------
export function updatePersonInTree(personId, data) {
  const group = svg.querySelector(`g.person-group[data-id='${personId}']`);
  if (!group) return;

  const circle = group.querySelector('circle.person');
  const nameText = group.querySelector('text.name');
  const dobText = group.querySelector('text.dob');

  circle.setAttribute('fill', data.fill);
  nameText.textContent = data.name;
  dobText.textContent = data.dob;

  group.personData = data;
  generateAllConnections();
  rebuildTableView();
}

export function deletePersonFromTree(personId) {
  const group = svg.querySelector(`g.person-group[data-id='${personId}']`);
  if (!group) return;
  group.remove();
  generateAllConnections();
  rebuildTableView();
}

export function loadTree(treeData) {
  const mainGroup = document.getElementById('mainGroup');
  mainGroup.innerHTML = '';
  nextPersonId = 1;

  treeData.forEach(node => {
    addPerson(node);
    const group = svg.querySelector(`g.person-group[data-id='${node.id}']`);
    group.personData = node;
  });

  // After placing all nodes, generate connections
  setTimeout(generateAllConnections, 100);
  rebuildTableView();
}
