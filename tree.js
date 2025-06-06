// tree.js
// -------------------
// Responsible for all SVG‐based logic: adding/editing/removing nodes,
// dragging, connect‐mode, generate connections, undo stack, etc.
// Now includes: pan/zoom, grid, selection, connect, and style features

import { updateSearchableSelects } from './searchableSelect.js';
import { openModalForEdit, closeModal } from './modal.js';
import { rebuildTableView } from './table.js';
import { exportTree } from './exporter.js';

let svg, addPersonBtn, connectBtn, styleBtn, undoStack = [], redoStack = [];
let connectMode = false, connectFirst = null;
let nodeRadius = 40, defaultColor = '#3498db';
let fontFamily = 'Inter', fontSize = 14, nameColor = '#333333', dateColor = '#757575';
let nextPersonId = 1;

// Pan/Zoom variables
let isPanning = false, startPoint = { x: 0, y: 0 };
let scale = 1, panX = 0, panY = 0;
const minScale = 0.1, maxScale = 5;
let isDragging = false; // Global drag state

// Selection management
let selectedCircles = new Set();

// Grid settings
const gridSize = 50;

document.addEventListener('DOMContentLoaded', () => {
  console.log('Tree.js initializing...');
  
  svg = document.getElementById('svgArea');
  addPersonBtn = document.getElementById('addPersonBtn');
  connectBtn = document.getElementById('connectBtn');
  styleBtn = document.getElementById('styleBtn');

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

  // Push initial undo state
  pushUndoState();
  
  console.log('Tree.js initialization complete');
});

function setupButtonEventListeners() {
  // Add person button
  if (addPersonBtn) {
    addPersonBtn.addEventListener('click', () => {
      console.log('Add person button clicked');
      openModalForEdit(); // no ID = "Add Person" mode
    });
  }

  // Connect button
  if (connectBtn) {
    connectBtn.addEventListener('click', handleConnectSelected);
  }

  // Style button
  if (styleBtn) {
    styleBtn.addEventListener('click', openStyleModal);
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
    }
  });
}

function setupPanZoom() {
  if (!svg) return;

  // Mouse wheel zoom
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
    }
  });

  // Pan with mouse drag - only on empty space
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
    if (isPanning) {
      panX = e.clientX - startPoint.x;
      panY = e.clientY - startPoint.y;
      updateTransform();
      e.preventDefault();
    }
  });

  document.addEventListener('mouseup', (e) => {
    if (isPanning) {
      isPanning = false;
      svg.classList.remove('panning');
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
// Grid Drawing

function drawGrid() {
  if (!svg) return;

  // Remove existing grid
  svg.querySelectorAll('.grid-line').forEach(line => line.remove());

  const viewBox = svg.viewBox.baseVal;
  const width = viewBox.width;
  const height = viewBox.height;

  // Create grid group
  const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  gridGroup.id = 'gridGroup';

  // Vertical lines
  for (let x = 0; x <= width; x += gridSize) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.classList.add('grid-line');
    if (x % (gridSize * 4) === 0) line.classList.add('major');
    line.setAttribute('x1', x);
    line.setAttribute('y1', 0);
    line.setAttribute('x2', x);
    line.setAttribute('y2', height);
    gridGroup.appendChild(line);
  }

  // Horizontal lines
  for (let y = 0; y <= height; y += gridSize) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.classList.add('grid-line');
    if (y % (gridSize * 4) === 0) line.classList.add('major');
    line.setAttribute('x1', 0);
    line.setAttribute('y1', y);
    line.setAttribute('x2', width);
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
  } else {
    // Select
    selectedCircles.add(personId);
    group.classList.add('selected');
  }
  
  updateActionButtons();
  console.log('Selected circles:', Array.from(selectedCircles));
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
  
  if (connectBtn) {
    if (canConnect) {
      connectBtn.classList.remove('hidden');
    } else {
      connectBtn.classList.add('hidden');
    }
  }
  
  if (styleBtn) {
    if (hasSelection) {
      styleBtn.classList.remove('hidden');
    } else {
      styleBtn.classList.add('hidden');
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
// Connect Functionality

function handleConnectSelected() {
  if (selectedCircles.size !== 2) {
    alert('Please select exactly 2 circles to connect.');
    return;
  }
  
  const [personId1, personId2] = Array.from(selectedCircles);
  
  // Show connection type dialog
  const connectionType = prompt('Connection type:\n1. Parent-Child\n2. Spouse\n\nEnter 1 or 2:');
  
  if (connectionType === '1') {
    // Parent-child connection
    const parentId = prompt(`Which person is the parent?\nEnter 1 for ${getPersonDisplayName(personId1)} or 2 for ${getPersonDisplayName(personId2)}:`);
    
    if (parentId === '1' || parentId === '2') {
      const parent = parentId === '1' ? personId1 : personId2;
      const child = parentId === '1' ? personId2 : personId1;
      
      const parentGroup = svg.querySelector(`g[data-id="${parent}"]`);
      const parentGender = parentGroup?.getAttribute('data-gender');
      
      if (parentGender === 'male') {
        setPersonAttribute(child, 'data-fatherId', parent);
      } else if (parentGender === 'female') {
        setPersonAttribute(child, 'data-motherId', parent);
      }
    }
  } else if (connectionType === '2') {
    // Spouse connection
    setPersonAttribute(personId1, 'data-spouseId', personId2);
    setPersonAttribute(personId2, 'data-spouseId', personId1);
  } else {
    return; // Cancelled or invalid input
  }
  
  generateAllConnections();
  rebuildTableView();
  pushUndoState();
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
  
  // Click to select/deselect
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
  
  // Double-click to edit
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
}

// Make circle draggable
function makeCircleDraggable(group, circle) {
  let offsetX, offsetY, isDragging = false;

  circle.addEventListener('mousedown', (e) => {
    if (e.detail === 1) { // Single click
      e.preventDefault();
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
    if (!isDragging) return;
    
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
    if (!isDragging) return;
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
}

function undo() {
  if (undoStack.length < 2) return;
  const current = undoStack.pop();
  redoStack.push(current);
  const previous = undoStack[undoStack.length - 1];
  restoreState(previous);
}

function redo() {
  if (redoStack.length === 0) return;
  const next = redoStack.pop();
  undoStack.push(next);
  restoreState(next);
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