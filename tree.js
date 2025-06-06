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

// Performance optimization variables
let gridRedrawTimeout = null;
let lastGridRedraw = 0;
const GRID_REDRAW_THROTTLE = 100; // milliseconds

// Selection management
let selectedCircles = new Set();

// Grid settings
const gridSize = 50;

// Throttled grid redraw for better performance
function throttledGridRedraw() {
  const now = Date.now();
  
  if (gridRedrawTimeout) {
    clearTimeout(gridRedrawTimeout);
  }
  
  if (now - lastGridRedraw > GRID_REDRAW_THROTTLE) {
    drawGrid();
    lastGridRedraw = now;
  } else {
    gridRedrawTimeout = setTimeout(() => {
      drawGrid();
      lastGridRedraw = Date.now();
    }, GRID_REDRAW_THROTTLE);
  }
}

// Connection modal variables
let connectionPersonA = null, connectionPersonB = null;

document.addEventListener('DOMContentLoaded', () => {
  console.log('Tree.js initializing...');
  
  svg = document.getElementById('svgArea');
  addPersonBtn = document.getElementById('addPersonBtn');
  connectBtn = document.getElementById('connectBtn');
  styleBtn = document.getElementById('styleBtn');
  undoBtn = document.getElementById('undoBtn');

  // Initialize pan/zoom, grid, etc.
  initializeSVGCanvas();
  drawGrid();

  // Wire up buttons
  setupButtonEventListeners();

  // Settings event listeners
  setupSettingsListeners();

  // Export buttons
  document.getElementById('exportSvg')?.addEventListener('click', () => exportTree('svg'));
  document.getElementById('exportPng')?.addEventListener('click', () => exportTree('png'));
  document.getElementById('exportPdf')?.addEventListener('click', () => exportTree('pdf'));

  // Save/Load
  document.getElementById('saveData')?.addEventListener('click', saveTreeToJSON);
  document.getElementById('loadData')?.addEventListener('change', loadTreeFromJSON);

  // Style modal events
  setupStyleModalListeners();

  // Connection modal events
  setupConnectionModalListeners();

  // Push initial undo state
  pushUndoState();
  
  console.log('Tree.js initialization complete');
});

function setupButtonEventListeners() {
  // Add person button with toggle functionality
  if (addPersonBtn) {
    addPersonBtn.addEventListener('click', () => {
      const floatingButtons = document.querySelector('.floating-buttons');
      
      // If buttons are expanded, close them instead of opening modal
      if (floatingButtons && floatingButtons.classList.contains('expanded')) {
        clearSelection(); // This will close the expanded menu
      } else {
        console.log('Add person button clicked');
        openModalForEdit(); // no ID = "Add Person" mode
      }
    });
  }

  // Undo button
  if (undoBtn) {
    undoBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('Undo button clicked');
      undo();
    });
  }

  // Connect button
  if (connectBtn) {
    connectBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleConnectSelected();
    });
  }

  // Style button
  if (styleBtn) {
    styleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openStyleModal();
    });
  }

  // Form submit handler - attach to form directly
  const personForm = document.getElementById('personForm');
  if (personForm) {
    personForm.addEventListener('submit', (e) => {
      console.log('Form submit event captured in tree.js');
      e.preventDefault();
      e.stopPropagation();
      savePersonFromModal();
    });
  }
}

function setupStyleModalListeners() {
  const styleForm = document.getElementById('styleForm');
  const cancelStyleBtn = document.getElementById('cancelStyleModal');

  if (styleForm) {
    styleForm.addEventListener('submit', (e) => {
      e.preventDefault();
      applyStylesToSelected();
    });
  }

  if (cancelStyleBtn) {
    cancelStyleBtn.addEventListener('click', closeStyleModal);
  }

  // Close style modal when clicking outside
  const styleModal = document.getElementById('styleModal');
  if (styleModal) {
    styleModal.addEventListener('click', (e) => {
      if (e.target === styleModal) {
        closeStyleModal();
      }
    });
  }
}

function setupConnectionModalListeners() {
  const connectionModal = document.getElementById('connectionModal');
  const cancelConnectionBtn = document.getElementById('cancelConnectionModal');
  const motherBtn = document.getElementById('motherBtn');
  const fatherBtn = document.getElementById('fatherBtn');
  const childBtn = document.getElementById('childBtn');
  const spouseBtn = document.getElementById('spouseBtn');

  if (cancelConnectionBtn) {
    cancelConnectionBtn.addEventListener('click', closeConnectionModal);
  }

  if (motherBtn) {
    motherBtn.addEventListener('click', () => handleConnectionChoice('mother'));
  }

  if (fatherBtn) {
    fatherBtn.addEventListener('click', () => handleConnectionChoice('father'));
  }

  if (childBtn) {
    childBtn.addEventListener('click', () => handleConnectionChoice('child'));
  }

  if (spouseBtn) {
    spouseBtn.addEventListener('click', () => handleConnectionChoice('spouse'));
  }

  // Close modal when clicking outside
  if (connectionModal) {
    connectionModal.addEventListener('click', (e) => {
      if (e.target === connectionModal) {
        closeConnectionModal();
      }
    });
  }
}

// -----------------------------------------------------------------------------
// SVG Canvas Initialization with Pan/Zoom

function initializeSVGCanvas() {
  if (svg) {
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', '0 0 1200 800');
    svg.style.backgroundColor = '#fff';
    
    // Create main group for pan/zoom transformations
    const mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    mainGroup.id = 'mainGroup';
    svg.appendChild(mainGroup);
    
    setupPanZoom();
    setupSelectionHandling();
  }
  
  // Add keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if (e.ctrlKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      redo();
    } else if (e.key === 'Delete' && selectedCircles.size > 0) {
      deleteSelectedCircles();
    } else if (e.key === 'Escape') {
      clearSelection();
      closeConnectionModal();
    }
  });
}

function setupPanZoom() {
  if (!svg) return;

  // Touch handling variables
  let lastTouchDistance = 0;
  let lastTouchCenter = { x: 0, y: 0 };
  let isTouching = false;
  let touchStartTime = 0;
  let initialTouchDistance = 0;
  let initialScale = 1;
  let initialPan = { x: 0, y: 0 };
  let lastTouchPos = { x: 0, y: 0 };

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
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(minScale, Math.min(maxScale, scale * delta));
    
    if (newScale !== scale) {
      const factor = newScale / scale;
      panX = mouseX - factor * (mouseX - panX);
      panY = mouseY - factor * (mouseY - panY);
      scale = newScale;
      updateTransform();
      
      // Redraw grid after zoom
      throttledGridRedraw();
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
      lastTouchPos = { x: touch.clientX, y: touch.clientY };
      
      if (e.target === svg || e.target.classList.contains('grid-line')) {
        isPanning = true;
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
      // Single finger panning - much more responsive
      const touch = e.touches[0];
      const deltaX = touch.clientX - lastTouchPos.x;
      const deltaY = touch.clientY - lastTouchPos.y;
      
      // Direct pan calculation for better responsiveness
      panX += deltaX;
      panY += deltaY;
      
      // Update last touch position
      lastTouchPos = { x: touch.clientX, y: touch.clientY };
      
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
      setTimeout(() => throttledGridRedraw(), 50); // Small delay for better performance
      
      // Reset touch variables
      lastTouchDistance = 0;
      initialTouchDistance = 0;
      touchStartTime = 0;
    } else if (e.touches.length === 1) {
      // One finger still down, switch back to pan mode
      const touch = e.touches[0];
      lastTouchPos = { x: touch.clientX, y: touch.clientY };
      
      if (e.target === svg || e.target.classList.contains('grid-line')) {
        isPanning = true;
        svg.classList.add('panning');
      }
    }
  }, { passive: false });

  // Prevent context menu on long press
  svg.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  // Mouse events for desktop (existing functionality)
  svg.addEventListener('mousedown', (e) => {
    if (e.target === svg || e.target.classList.contains('grid-line')) {
      isPanning = true;
      startPoint = { x: e.clientX - panX, y: e.clientY - panY };
      svg.classList.add('panning');
      e.preventDefault();
      e.stopPropagation();
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (isPanning && !isTouching) { // Only handle mouse pan if not touching
      panX = e.clientX - startPoint.x;
      panY = e.clientY - startPoint.y;
      updateTransform();
      e.preventDefault();
    }
  });

  document.addEventListener('mouseup', (e) => {
    if (isPanning && !isTouching) { // Only handle mouse release if not touching
      isPanning = false;
      svg.classList.remove('panning');
      // Redraw grid after pan
      throttledGridRedraw();
      e.preventDefault();
    }
  });
}

function updateTransform() {
  const mainGroup = document.getElementById('mainGroup');
  if (mainGroup) {
    mainGroup.setAttribute('transform', `translate(${panX}, ${panY}) scale(${scale})`);
  }
}

function setupSelectionHandling() {
  if (!svg) return;

  svg.addEventListener('click', (e) => {
    // If clicking on empty space (not on circles or lines), clear selection
    if (e.target === svg || e.target.classList.contains('grid-line')) {
      // Only clear if we're not panning
      if (!isPanning) {
        clearSelection();
      }
    }
  });
}

// -----------------------------------------------------------------------------
// Grid Drawing - EXPANDED TO COVER WHOLE AREA

function drawGrid() {
  if (!svg) return;

  // Remove existing grid
  svg.querySelectorAll('.grid-line').forEach(line => line.remove());

  // Get the actual viewport dimensions more accurately
  const rect = svg.getBoundingClientRect();
  const viewportWidth = rect.width;
  const viewportHeight = rect.height;

  // Calculate the visible area considering pan and zoom with extra padding
  const visibleLeft = (-panX) / scale;
  const visibleTop = (-panY) / scale;
  const visibleWidth = viewportWidth / scale;
  const visibleHeight = viewportHeight / scale;

  // Extend grid well beyond visible area for smooth panning and full coverage
  const padding = gridSize * 20; // Increased padding
  const gridLeft = Math.floor((visibleLeft - padding) / gridSize) * gridSize;
  const gridTop = Math.floor((visibleTop - padding) / gridSize) * gridSize;
  const gridRight = Math.ceil((visibleLeft + visibleWidth + padding) / gridSize) * gridSize;
  const gridBottom = Math.ceil((visibleTop + visibleHeight + padding) / gridSize) * gridSize;

  // Ensure minimum grid coverage
  const minGridWidth = Math.max(gridRight - gridLeft, viewportWidth * 3 / scale);
  const minGridHeight = Math.max(gridBottom - gridTop, viewportHeight * 3 / scale);
  
  const finalGridRight = Math.max(gridRight, gridLeft + minGridWidth);
  const finalGridBottom = Math.max(gridBottom, gridTop + minGridHeight);

  // Create grid group
  const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  gridGroup.id = 'gridGroup';

  // Vertical lines
  for (let x = gridLeft; x <= finalGridRight; x += gridSize) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.classList.add('grid-line');
    if (x % (gridSize * 4) === 0) line.classList.add('major');
    line.setAttribute('x1', x);
    line.setAttribute('y1', gridTop);
    line.setAttribute('x2', x);
    line.setAttribute('y2', finalGridBottom);
    gridGroup.appendChild(line);
  }

  // Horizontal lines
  for (let y = gridTop; y <= finalGridBottom; y += gridSize) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.classList.add('grid-line');
    if (y % (gridSize * 4) === 0) line.classList.add('major');
    line.setAttribute('x1', gridLeft);
    line.setAttribute('y1', y);
    line.setAttribute('x2', finalGridRight);
    line.setAttribute('y2', y);
    gridGroup.appendChild(line);
  }

  // Insert grid as first child so it appears behind everything
  const mainGroup = document.getElementById('mainGroup');
  if (mainGroup) {
    mainGroup.insertBefore(gridGroup, mainGroup.firstChild);
  } else {
    svg.insertBefore(gridGroup, svg.firstChild);
  }
}

// -----------------------------------------------------------------------------
// Selection Management

function toggleCircleSelection(personId, circle, group) {
  if (selectedCircles.has(personId)) {
    // Deselect
    selectedCircles.delete(personId);
    group.classList.remove('selected');
    console.log('Deselected:', personId);
  } else {
    // Select
    selectedCircles.add(personId);
    group.classList.add('selected');
    console.log('Selected:', personId);
  }
  
  updateActionButtons();
  console.log('Current selection:', Array.from(selectedCircles));
}

function clearSelection() {
  selectedCircles.clear();
  document.querySelectorAll('.person-group.selected').forEach(group => {
    group.classList.remove('selected');
  });
  updateActionButtons();
  console.log('Selection cleared');
}

function updateActionButtons() {
  const hasSelection = selectedCircles.size > 0;
  const canConnect = selectedCircles.size === 2;
  
  console.log('Updating action buttons:', { hasSelection, canConnect, selectedCount: selectedCircles.size });
  
  const floatingButtons = document.querySelector('.floating-buttons');
  if (!floatingButtons) return;
  
  if (hasSelection) {
    // Add animation class to show buttons
    floatingButtons.classList.add('expanded');
    
    // Show/hide connect button based on selection count
    if (connectBtn) {
      if (canConnect) {
        connectBtn.classList.remove('hidden');
        connectBtn.style.display = 'flex';
      } else {
        connectBtn.classList.add('hidden');
        connectBtn.style.display = 'none';
      }
    }
    
    // Always show style button when something is selected
    if (styleBtn) {
      styleBtn.classList.remove('hidden');
      styleBtn.style.display = 'flex';
    }
  } else {
    // Hide all secondary buttons
    floatingButtons.classList.remove('expanded');
    
    if (connectBtn) {
      connectBtn.classList.add('hidden');
      connectBtn.style.display = 'none';
    }
    
    if (styleBtn) {
      styleBtn.classList.add('hidden');
      styleBtn.style.display = 'none';
    }
  }
}

function deleteSelectedCircles() {
  if (selectedCircles.size === 0) return;
  
  const selectedArray = Array.from(selectedCircles);
  const confirmMessage = `Delete ${selectedArray.length} selected person(s)?`;
  
  if (!confirm(confirmMessage)) return;
  
  selectedArray.forEach(personId => {
    const group = svg.querySelector(`g[data-id="${personId}"]`);
    if (group) group.remove();
  });
  
  clearSelection();
  generateAllConnections();
  rebuildTableView();
  pushUndoState();
}

// -----------------------------------------------------------------------------
// Connect Functionality - UPDATED TO USE MODAL

function handleConnectSelected() {
  if (selectedCircles.size !== 2) {
    alert('Please select exactly 2 circles to connect.');
    return;
  }
  
  const [personId1, personId2] = Array.from(selectedCircles);
  connectionPersonA = personId1;
  connectionPersonB = personId2;
  
  openConnectionModal();
}

function openConnectionModal() {
  const connectionModal = document.getElementById('connectionModal');
  const connectionText = document.getElementById('connectionText');
  
  if (!connectionModal || !connectionText) return;
  
  const person1Name = getPersonDisplayName(connectionPersonA);
  const person2Name = getPersonDisplayName(connectionPersonB);
  
  connectionText.textContent = `${person1Name} is __ to ${person2Name}`;
  
  connectionModal.classList.remove('hidden');
  connectionModal.style.display = 'flex';
}

function closeConnectionModal() {
  const connectionModal = document.getElementById('connectionModal');
  if (connectionModal) {
    connectionModal.classList.add('hidden');
    connectionModal.style.display = 'none';
  }
  
  connectionPersonA = null;
  connectionPersonB = null;
}

function handleConnectionChoice(relationship) {
  if (!connectionPersonA || !connectionPersonB) {
    closeConnectionModal();
    return;
  }
  
  switch (relationship) {
    case 'mother':
      // Person A is mother of Person B
      setPersonAttribute(connectionPersonB, 'data-motherId', connectionPersonA);
      break;
    case 'father':
      // Person A is father of Person B
      setPersonAttribute(connectionPersonB, 'data-fatherId', connectionPersonA);
      break;
    case 'child':
      // Person A is child of Person B (so Person B is parent of Person A)
      const parentGroup = svg.querySelector(`g[data-id="${connectionPersonB}"]`);
      const parentGender = parentGroup?.getAttribute('data-gender');
      
      if (parentGender === 'male') {
        setPersonAttribute(connectionPersonA, 'data-fatherId', connectionPersonB);
      } else if (parentGender === 'female') {
        setPersonAttribute(connectionPersonA, 'data-motherId', connectionPersonB);
      } else {
        alert('Parent gender must be specified to create parent-child relationship.');
        return;
      }
      break;
    case 'spouse':
      // Mutual spouse relationship
      setPersonAttribute(connectionPersonA, 'data-spouseId', connectionPersonB);
      setPersonAttribute(connectionPersonB, 'data-spouseId', connectionPersonA);
      break;
  }
  
  // Update the tree
  generateAllConnections();
  rebuildTableView();
  pushUndoState();
  
  // Show success message
  const person1Name = getPersonDisplayName(connectionPersonA);
  const person2Name = getPersonDisplayName(connectionPersonB);
  console.log(`Connected ${person1Name} and ${person2Name} as ${relationship}`);
  
  // Close modal and clear selection
  closeConnectionModal();
  clearSelection();
}

function getPersonDisplayName(personId) {
  const group = svg.querySelector(`g[data-id="${personId}"]`);
  if (!group) return personId;
  
  const name = group.getAttribute('data-name') || '';
  const surname = group.getAttribute('data-surname') || '';
  return `${name} ${surname}`.trim();
}

function setPersonAttribute(personId, attribute, value) {
  const group = svg.querySelector(`g[data-id="${personId}"]`);
  if (group) {
    group.setAttribute(attribute, value);
  }
}

// -----------------------------------------------------------------------------
// Style Modal and Apply Styles

function openStyleModal() {
  if (selectedCircles.size === 0) {
    alert('Please select at least one circle to style.');
    return;
  }
  
  const styleModal = document.getElementById('styleModal');
  if (!styleModal) return;
  
  // Get current style from first selected circle
  const firstSelectedId = Array.from(selectedCircles)[0];
  const firstGroup = svg.querySelector(`g[data-id="${firstSelectedId}"]`);
  const firstCircle = firstGroup?.querySelector('circle.person');
  const firstNameText = firstGroup?.querySelector('text.name');
  const firstDobText = firstGroup?.querySelector('text.dob');
  
  if (firstCircle) {
    document.getElementById('selectedNodeColor').value = rgbToHex(firstCircle.getAttribute('fill') || defaultColor);
    document.getElementById('selectedNodeSize').value = firstCircle.getAttribute('r') || nodeRadius;
  }
  
  if (firstNameText) {
    document.getElementById('selectedFont').value = firstNameText.getAttribute('font-family') || fontFamily;
    document.getElementById('selectedFontSize').value = parseInt(firstNameText.getAttribute('font-size')) || fontSize;
    document.getElementById('selectedNameColor').value = rgbToHex(firstNameText.getAttribute('fill') || nameColor);
  }
  
  if (firstDobText) {
    document.getElementById('selectedDateColor').value = rgbToHex(firstDobText.getAttribute('fill') || dateColor);
  }
  
  styleModal.classList.remove('hidden');
  styleModal.style.display = 'flex';
}

function closeStyleModal() {
  const styleModal = document.getElementById('styleModal');
  if (styleModal) {
    styleModal.classList.add('hidden');
    styleModal.style.display = 'none';
  }
}

function applyStylesToSelected() {
  if (selectedCircles.size === 0) return;
  
  const nodeColor = document.getElementById('selectedNodeColor').value;
  const nodeSize = parseInt(document.getElementById('selectedNodeSize').value);
  const font = document.getElementById('selectedFont').value;
  const fontSize = parseInt(document.getElementById('selectedFontSize').value);
  const nameColor = document.getElementById('selectedNameColor').value;
  const dateColor = document.getElementById('selectedDateColor').value;
  
  selectedCircles.forEach(personId => {
    const group = svg.querySelector(`g[data-id="${personId}"]`);
    if (!group) return;
    
    const circle = group.querySelector('circle.person');
    const nameText = group.querySelector('text.name');
    const dobText = group.querySelector('text.dob');
    
    if (circle) {
      circle.setAttribute('fill', nodeColor);
      circle.setAttribute('r', nodeSize);
    }
    
    if (nameText) {
      nameText.setAttribute('font-family', font);
      nameText.setAttribute('font-size', `${fontSize}px`);
      nameText.setAttribute('fill', nameColor);
      
      // Update text position based on new circle size
      const cx = parseFloat(circle.getAttribute('cx'));
      const cy = parseFloat(circle.getAttribute('cy'));
      nameText.setAttribute('y', cy - nodeSize - 8);
    }
    
    if (dobText) {
      dobText.setAttribute('font-family', font);
      dobText.setAttribute('font-size', `${fontSize - 2}px`);
      dobText.setAttribute('fill', dateColor);
      
      // Update text position based on new circle size
      const cx = parseFloat(circle.getAttribute('cx'));
      const cy = parseFloat(circle.getAttribute('cy'));
      dobText.setAttribute('y', cy + nodeSize + 16);
    }
  });
  
  closeStyleModal();
  pushUndoState();
  console.log('Applied styles to selected circles');
}

function rgbToHex(rgb) {
  if (rgb.startsWith('#')) return rgb;
  if (rgb.startsWith('rgb')) {
    const values = rgb.match(/\d+/g);
    if (values && values.length >= 3) {
      return '#' + values.slice(0, 3).map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
    }
  }
  return rgb;
}

// -----------------------------------------------------------------------------
// Settings Listeners

function setupSettingsListeners() {
  const applyBtn = document.getElementById('applyNodeStyle');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const color = document.getElementById('nodeColorPicker').value;
      const size = parseInt(document.getElementById('nodeSizeInput').value, 10);
      if (!isNaN(size) && size > 0) {
        nodeRadius = size;
        defaultColor = color;
        reapplyAllNodeStyles();
        pushUndoState();
      }
    });
  }

  const fontSelect = document.getElementById('fontSelect');
  if (fontSelect) {
    fontSelect.addEventListener('change', (e) => {
      fontFamily = e.target.value;
      applyGlobalFontAndColors();
      pushUndoState();
    });
  }

  const fontSizeInput = document.getElementById('fontSizeInput');
  if (fontSizeInput) {
    fontSizeInput.addEventListener('change', (e) => {
      fontSize = parseInt(e.target.value, 10) || fontSize;
      applyGlobalFontAndColors();
      pushUndoState();
    });
  }

  const nameColorPicker = document.getElementById('nameColorPicker');
  if (nameColorPicker) {
    nameColorPicker.addEventListener('change', (e) => {
      nameColor = e.target.value;
      applyGlobalFontAndColors();
      pushUndoState();
    });
  }

  const dateColorPicker = document.getElementById('dateColorPicker');
  if (dateColorPicker) {
    dateColorPicker.addEventListener('change', (e) => {
      dateColor = e.target.value;
      applyGlobalFontAndColors();
      pushUndoState();
    });
  }
}

// -----------------------------------------------------------------------------
// Modal Save Logic

function savePersonFromModal() {
  console.log('savePersonFromModal called');
  
  const nameInput = document.getElementById('personName').value.trim();
  const surnameInput = document.getElementById('personSurname').value.trim();
  const birthNameInput = document.getElementById('personBirthName').value.trim();
  const dobInput = document.getElementById('personDob').value.trim();
  const genderInput = document.getElementById('personGender').value;

  const motherId = document.querySelector('#motherSelect input[type="hidden"]')?.value || '';
  const fatherId = document.querySelector('#fatherSelect input[type="hidden"]')?.value || '';
  const spouseId = document.querySelector('#spouseSelect input[type="hidden"]')?.value || '';

  if (!nameInput || !genderInput) {
    alert('Name and Gender are required.');
    return;
  }

  const modal = document.getElementById('personModal');
  const editingId = modal?.dataset.editingId;
  
  try {
    if (editingId) {
      console.log('Updating existing person:', editingId);
      updateExistingPersonSVG(editingId, { 
        name: nameInput, surname: surnameInput, birthName: birthNameInput, 
        dob: dobInput, gender: genderInput, motherId, fatherId, spouseId 
      });
    } else {
      console.log('Creating new person');
      createNewPersonSVG({ 
        name: nameInput, surname: surnameInput, birthName: birthNameInput, 
        dob: dobInput, gender: genderInput, motherId, fatherId, spouseId 
      });
    }

    closeModal();
    generateAllConnections();
    rebuildTableView();
    pushUndoState();
    
    console.log('Person saved successfully');
  } catch (error) {
    console.error('Error saving person:', error);
    alert('Error saving person. Please try again.');
  }
}

// Create a new person node
function createNewPersonSVG(data) {
  if (!svg) return;
  
  const existingIds = Array.from(svg.querySelectorAll('g[data-id]'))
    .map(g => g.getAttribute('data-id'))
    .map(id => parseInt(id.replace('p', '')) || 0);
  
  const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
  const nextId = `p${maxId + 1}`;
  
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('data-id', nextId);
  group.setAttribute('data-name', data.name);
  group.setAttribute('data-surname', data.surname);
  group.setAttribute('data-birthName', data.birthName);
  group.setAttribute('data-dob', data.dob);
  group.setAttribute('data-gender', data.gender);
  group.setAttribute('data-motherId', data.motherId);
  group.setAttribute('data-fatherId', data.fatherId);
  group.setAttribute('data-spouseId', data.spouseId);
  group.classList.add('person-group');

  // Position in center with slight randomization - use fixed coordinates
  const cx = 600 + Math.random() * 200 - 100; // Center around 600 (middle of 1200 viewBox)
  const cy = 400 + Math.random() * 200 - 100; // Center around 400 (middle of 800 viewBox)

  // Circle
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.classList.add('person');
  circle.setAttribute('cx', cx);
  circle.setAttribute('cy', cy);
  circle.setAttribute('r', nodeRadius);
  circle.setAttribute('fill', defaultColor);
  group.appendChild(circle);

  // Name text
  const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  nameText.classList.add('name');
  nameText.textContent = data.name;
  nameText.setAttribute('x', cx);
  nameText.setAttribute('y', cy - nodeRadius - 8);
  nameText.setAttribute('text-anchor', 'middle');
  nameText.setAttribute('font-family', fontFamily);
  nameText.setAttribute('font-size', `${fontSize}px`);
  nameText.setAttribute('fill', nameColor);
  group.appendChild(nameText);

  // DOB text
  const dobText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  dobText.classList.add('dob');
  dobText.textContent = data.dob;
  dobText.setAttribute('x', cx);
  dobText.setAttribute('y', cy + nodeRadius + 16);
  dobText.setAttribute('text-anchor', 'middle');
  dobText.setAttribute('font-family', fontFamily);
  dobText.setAttribute('font-size', `${fontSize - 2}px`);
  dobText.setAttribute('fill', dateColor);
  group.appendChild(dobText);

  setupCircleInteractions(group, circle, nextId);

  const mainGroup = document.getElementById('mainGroup');
  if (mainGroup) {
    mainGroup.appendChild(group);
  } else {
    svg.appendChild(group);
  }
}

// Update existing person
function updateExistingPersonSVG(id, data) {
  const group = svg.querySelector(`g[data-id="${id}"]`);
  if (!group) return;

  group.setAttribute('data-name', data.name);
  group.setAttribute('data-surname', data.surname);
  group.setAttribute('data-birthName', data.birthName);
  group.setAttribute('data-dob', data.dob);
  group.setAttribute('data-gender', data.gender);
  group.setAttribute('data-motherId', data.motherId);
  group.setAttribute('data-fatherId', data.fatherId);
  group.setAttribute('data-spouseId', data.spouseId);

  const nameText = group.querySelector('text.name');
  if (nameText) nameText.textContent = data.name;
  
  const dobText = group.querySelector('text.dob');
  if (dobText) dobText.textContent = data.dob;
}

// Setup circle interactions
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
    
    // Clear any existing timeout
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      clickTimeout = null;
    }
    
    // Delay the selection to allow for double-click detection
    clickTimeout = setTimeout(() => {
      if (!isDragging) { // Only select if we're not dragging
        toggleCircleSelection(personId, circle, group);
      }
    }, 200);
  });
  
  // Double-click to edit (desktop)
  circle.addEventListener('dblclick', (e) => {
    console.log('Double-clicked on circle:', personId);
    e.preventDefault();
    e.stopPropagation();
    
    // Clear the single-click timeout
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
  }, { passive: true });

  circle.addEventListener('touchmove', (e) => {
    if (!touchStartPos || e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.x);
    const dy = Math.abs(touch.clientY - touchStartPos.y);
    
    // If moved more than 10px, consider it a drag
    if (dx > 10 || dy > 10) {
      touchMoved = true;
    }
  }, { passive: true });

  circle.addEventListener('touchend', (e) => {
    e.preventDefault();
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
  }, { passive: false });
}

// Make circle draggable
function makeCircleDraggable(group, circle) {
  let offsetX, offsetY, isDragging = false;
  let isCircleTouching = false;

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
    }
  }, { passive: false });

  // Mouse move and up events (for desktop)
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

  document.addEventListener('mouseup', () => {
    if (!isDragging || isCircleTouching) return;
    isDragging = false;
    circle.style.cursor = 'grab';
    pushUndoState();
  });
}

// Apply global styles
function applyGlobalFontAndColors() {
  if (!svg) return;
  
  svg.querySelectorAll('text.name').forEach(t => {
    t.setAttribute('font-family', fontFamily);
    t.setAttribute('font-size', `${fontSize}px`);
    t.setAttribute('fill', nameColor);
  });
  
  svg.querySelectorAll('text.dob').forEach(t => {
    t.setAttribute('font-family', fontFamily);
    t.setAttribute('font-size', `${fontSize - 2}px`);
    t.setAttribute('fill', dateColor);
  });
}

function reapplyAllNodeStyles() {
  if (!svg) return;
  
  svg.querySelectorAll('circle.person').forEach(c => {
    c.setAttribute('r', nodeRadius);
    c.setAttribute('fill', defaultColor);
  });
}

// -----------------------------------------------------------------------------
// Undo/Redo System

export function pushUndoState() {
  if (!svg) return;
  
  const mainGroup = document.getElementById('mainGroup');
  const state = {
    svgInner: mainGroup ? mainGroup.innerHTML : svg.innerHTML,
    nodeRadius, defaultColor, fontFamily, fontSize, nameColor, dateColor,
    selectedCircles: Array.from(selectedCircles),
    panX, panY, scale
  };
  undoStack.push(state);
  
  if (undoStack.length > 50) {
    undoStack.shift();
  }
  
  redoStack = [];
  console.log(`Undo state pushed. Stack size: ${undoStack.length}`);
}

function undo() {
  if (undoStack.length < 2) {
    console.log('Nothing to undo');
    return;
  }
  
  const current = undoStack.pop();
  redoStack.push(current);
  const previous = undoStack[undoStack.length - 1];
  restoreState(previous);
  console.log(`Undo performed. Stack size: ${undoStack.length}`);
}

function redo() {
  if (redoStack.length === 0) {
    console.log('Nothing to redo');
    return;
  }
  
  const next = redoStack.pop();
  undoStack.push(next);
  restoreState(next);
  console.log(`Redo performed. Stack size: ${undoStack.length}`);
}

function restoreState(state) {
  if (!svg) return;
  
  const mainGroup = document.getElementById('mainGroup');
  if (mainGroup) {
    mainGroup.innerHTML = state.svgInner;
  } else {
    svg.innerHTML = state.svgInner;
  }
  
  nodeRadius = state.nodeRadius;
  defaultColor = state.defaultColor;
  fontFamily = state.fontFamily;
  fontSize = state.fontSize;
  nameColor = state.nameColor;
  dateColor = state.dateColor;
  
  // Restore pan/zoom
  if (state.panX !== undefined) {
    panX = state.panX;
    panY = state.panY;
    scale = state.scale;
    updateTransform();
  }
  
  // Restore selection
  clearSelection();
  if (state.selectedCircles) {
    state.selectedCircles.forEach(personId => {
      const group = svg.querySelector(`g[data-id="${personId}"]`);
      if (group) {
        selectedCircles.add(personId);
        group.classList.add('selected');
      }
    });
    updateActionButtons();
  }
  
  // Re-wire interactions - ensure coordinates are valid
  svg.querySelectorAll('g[data-id]').forEach(group => {
    const circle = group.querySelector('circle.person');
    if (circle) {
      const personId = group.getAttribute('data-id');
      
      // Validate and fix coordinates if needed
      let cx = parseFloat(circle.getAttribute('cx'));
      let cy = parseFloat(circle.getAttribute('cy'));
      
      if (isNaN(cx) || isNaN(cy)) {
        console.warn('Invalid coordinates detected, fixing...', personId);
        cx = 600 + Math.random() * 200 - 100;
        cy = 400 + Math.random() * 200 - 100;
        circle.setAttribute('cx', cx);
        circle.setAttribute('cy', cy);
        
        // Fix text positions too
        const nameText = group.querySelector('text.name');
        const dobText = group.querySelector('text.dob');
        const radius = parseFloat(circle.getAttribute('r')) || nodeRadius;
        
        if (nameText) {
          nameText.setAttribute('x', cx);
          nameText.setAttribute('y', cy - radius - 8);
        }
        
        if (dobText) {
          dobText.setAttribute('x', cx);
          dobText.setAttribute('y', cy + radius + 16);
        }
      }
      
      setupCircleInteractions(group, circle, personId);
    }
  });
  
  drawGrid();
  rebuildTableView();
}

// -----------------------------------------------------------------------------
// Generate Connections

export function generateAllConnections() {
  if (!svg) return;
  
  const mainGroup = document.getElementById('mainGroup');
  const container = mainGroup || svg;
  
  // Remove existing relation lines
  container.querySelectorAll('line.relation').forEach(l => l.remove());

  container.querySelectorAll('g[data-id]').forEach(childGroup => {
    const childId = childGroup.getAttribute('data-id');
    const motherId = childGroup.getAttribute('data-motherId');
    const fatherId = childGroup.getAttribute('data-fatherId');
    const spouseId = childGroup.getAttribute('data-spouseId');

    function drawLineBetween(idA, idB, isSpouse = false) {
      const gA = container.querySelector(`g[data-id="${idA}"]`);
      const gB = container.querySelector(`g[data-id="${idB}"]`);
      if (!gA || !gB) return;
      
      const circleA = gA.querySelector('circle.person');
      const circleB = gB.querySelector('circle.person');
      if (!circleA || !circleB) return;
      
      const x1 = parseFloat(circleA.getAttribute('cx'));
      const y1 = parseFloat(circleA.getAttribute('cy'));
      const x2 = parseFloat(circleB.getAttribute('cx'));
      const y2 = parseFloat(circleB.getAttribute('cy'));
      
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.classList.add('relation');
      if (isSpouse) line.classList.add('spouse');
      line.setAttribute('x1', x1);
      line.setAttribute('y1', y1);
      line.setAttribute('x2', x2);
      line.setAttribute('y2', y2);
      line.setAttribute('stroke', isSpouse ? '#e74c3c' : '#7f8c8d');
      line.setAttribute('stroke-width', '2');
      if (isSpouse) line.setAttribute('stroke-dasharray', '4 2');
      
      // Insert before person groups so lines appear behind circles
      const firstPersonGroup = container.querySelector('g[data-id]');
      if (firstPersonGroup) {
        container.insertBefore(line, firstPersonGroup);
      } else {
        container.appendChild(line);
      }
    }

    if (motherId) drawLineBetween(childId, motherId, false);
    if (fatherId) drawLineBetween(childId, fatherId, false);
    if (spouseId) drawLineBetween(childId, spouseId, true);
  });
}

// -----------------------------------------------------------------------------
// Save/Load JSON

function saveTreeToJSON() {
  if (!svg) return;
  
  const allGroups = Array.from(svg.querySelectorAll('g[data-id]'));
  const data = {
    settings: { nodeRadius, defaultColor, fontFamily, fontSize, nameColor, dateColor },
    view: { panX, panY, scale },
    persons: allGroups.map(g => {
      const circle = g.querySelector('circle.person');
      return {
        id: g.getAttribute('data-id'),
        name: g.getAttribute('data-name') || '',
        surname: g.getAttribute('data-surname') || '',
        birthName: g.getAttribute('data-birthName') || '',
        dob: g.getAttribute('data-dob') || '',
        gender: g.getAttribute('data-gender') || '',
        motherId: g.getAttribute('data-motherId') || '',
        fatherId: g.getAttribute('data-fatherId') || '',
        spouseId: g.getAttribute('data-spouseId') || '',
        cx: circle ? circle.getAttribute('cx') : '0',
        cy: circle ? circle.getAttribute('cy') : '0',
        nodeColor: circle ? circle.getAttribute('fill') : defaultColor,
        nodeSize: circle ? circle.getAttribute('r') : nodeRadius,
      };
    })
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'family_tree.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function loadTreeFromJSON(e) {
  const file = e.target.files[0];
  if (!file || !svg) return;
  
  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const data = JSON.parse(evt.target.result);
      
      // Clear existing content
      const mainGroup = document.getElementById('mainGroup');
      if (mainGroup) {
        mainGroup.innerHTML = '';
      } else {
        svg.innerHTML = '';
        const newMainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        newMainGroup.id = 'mainGroup';
        svg.appendChild(newMainGroup);
      }
      
      // Restore settings
      if (data.settings) {
        nodeRadius = data.settings.nodeRadius || 40;
        defaultColor = data.settings.defaultColor || '#3498db';
        fontFamily = data.settings.fontFamily || 'Inter';
        fontSize = data.settings.fontSize || 14;
        nameColor = data.settings.nameColor || '#333333';
        dateColor = data.settings.dateColor || '#757575';
      }
      
      // Restore view
      if (data.view) {
        panX = data.view.panX || 0;
        panY = data.view.panY || 0;
        scale = data.view.scale || 1;
        updateTransform();
      }
      
      // Recreate persons
      data.persons.forEach(p => {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('data-id', p.id);
        group.setAttribute('data-name', p.name);
        group.setAttribute('data-surname', p.surname);
        group.setAttribute('data-birthName', p.birthName);
        group.setAttribute('data-dob', p.dob);
        group.setAttribute('data-gender', p.gender);
        group.setAttribute('data-motherId', p.motherId);
        group.setAttribute('data-fatherId', p.fatherId);
        group.setAttribute('data-spouseId', p.spouseId);
        group.classList.add('person-group');

        // Ensure coordinates are valid numbers
        let cx = parseFloat(p.cx);
        let cy = parseFloat(p.cy);
        
        if (isNaN(cx) || isNaN(cy)) {
          cx = 600 + Math.random() * 200 - 100;
          cy = 400 + Math.random() * 200 - 100;
        }

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.classList.add('person');
        circle.setAttribute('cx', cx);
        circle.setAttribute('cy', cy);
        circle.setAttribute('r', p.nodeSize || nodeRadius);
        circle.setAttribute('fill', p.nodeColor || defaultColor);
        group.appendChild(circle);

        const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        nameText.classList.add('name');
        nameText.textContent = p.name;
        nameText.setAttribute('x', cx);
        nameText.setAttribute('y', cy - (p.nodeSize || nodeRadius) - 8);
        nameText.setAttribute('text-anchor', 'middle');
        nameText.setAttribute('font-family', fontFamily);
        nameText.setAttribute('font-size', `${fontSize}px`);
        nameText.setAttribute('fill', nameColor);
        group.appendChild(nameText);

        const dobText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        dobText.classList.add('dob');
        dobText.textContent = p.dob;
        dobText.setAttribute('x', cx);
        dobText.setAttribute('y', cy + (p.nodeSize || nodeRadius) + 16);
        dobText.setAttribute('text-anchor', 'middle');
        dobText.setAttribute('font-family', fontFamily);
        dobText.setAttribute('font-size', `${fontSize - 2}px`);
        dobText.setAttribute('fill', dateColor);
        group.appendChild(dobText);

        setupCircleInteractions(group, circle, p.id);
        
        const container = document.getElementById('mainGroup') || svg;
        container.appendChild(group);
      });

      drawGrid();
      generateAllConnections();
      rebuildTableView();
      clearSelection();
      pushUndoState();
      
    } catch (error) {
      alert('Error loading file: ' + error.message);
    }
  };
  reader.readAsText(file);
}