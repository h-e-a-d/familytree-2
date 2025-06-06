// tree.js
// -------------------
// Responsible for all SVG‐based logic: adding/editing/removing nodes,
// dragging, connect‐mode, generate connections, undo stack, etc.
// Imports `updateSearchableSelects` from searchableSelect.js.

import { updateSearchableSelects } from './searchableSelect.js';
import { openModalForEdit, closeModal } from './modal.js';
import { rebuildTableView } from './table.js';
import { exportTree } from './exporter.js';

let svg, addPersonBtn, undoStack = [], redoStack = [];
let connectMode = false, connectFirst = null;
let nodeRadius = 40, defaultColor = '#3498db';
let fontFamily = 'Inter', fontSize = 14, nameColor = '#333333', dateColor = '#757575';
let nextPersonId = 1;

document.addEventListener('DOMContentLoaded', () => {
  svg = document.getElementById('svgArea');
  addPersonBtn = document.getElementById('addPersonBtn');

  // Initialize pan/zoom, grid, etc.
  initializeSVGCanvas();

  // Wire up the floating "Add Person" button
  if (addPersonBtn) {
    addPersonBtn.addEventListener('click', () => {
      openModalForEdit(); // no ID = "Add Person" mode
    });
  }

  // Catch save from modal
  const personForm = document.getElementById('personForm');
  if (personForm) {
    personForm.addEventListener('submit', (e) => {
      e.preventDefault();
      savePersonFromModal();
    });
  }

  // Settings from cog panel
  document.getElementById('applyNodeStyle').addEventListener('click', () => {
    const color = document.getElementById('nodeColorPicker').value;
    const size = parseInt(document.getElementById('nodeSizeInput').value, 10);
    if (!isNaN(size) && size > 0) {
      nodeRadius = size;
      defaultColor = color;
      reapplyAllNodeStyles();
      pushUndoState();
    }
  });

  document.getElementById('fontSelect').addEventListener('change', (e) => {
    fontFamily = e.target.value;
    applyGlobalFontAndColors();
    pushUndoState();
  });

  document.getElementById('fontSizeInput').addEventListener('change', (e) => {
    fontSize = parseInt(e.target.value, 10) || fontSize;
    applyGlobalFontAndColors();
    pushUndoState();
  });

  document.getElementById('nameColorPicker').addEventListener('change', (e) => {
    nameColor = e.target.value;
    applyGlobalFontAndColors();
    pushUndoState();
  });

  document.getElementById('dateColorPicker').addEventListener('change', (e) => {
    dateColor = e.target.value;
    applyGlobalFontAndColors();
    pushUndoState();
  });

  // Export buttons
  document.getElementById('exportSvg').addEventListener('click', () => exportTree('svg'));
  document.getElementById('exportPng').addEventListener('click', () => exportTree('png'));
  document.getElementById('exportPdf').addEventListener('click', () => exportTree('pdf'));

  // Save/Load
  document.getElementById('saveData').addEventListener('click', saveTreeToJSON);
  document.getElementById('loadData').addEventListener('change', loadTreeFromJSON);

  // Push initial undo state
  pushUndoState();
});

// -----------------------------------------------------------------------------
// SVG Initialization, grid, pan/zoom, etc.

function initializeSVGCanvas() {
  // Set up SVG viewBox and basic attributes
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('viewBox', '0 0 1200 800');
  svg.style.backgroundColor = '#fff';
  
  // Add keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if (e.ctrlKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      redo();
    }
  });
}

// -----------------------------------------------------------------------------
// Modal Save Logic: add or update a person

function savePersonFromModal() {
  const nameInput = document.getElementById('personName').value.trim();
  const surnameInput = document.getElementById('personSurname').value.trim();
  const birthNameInput = document.getElementById('personBirthName').value.trim();
  const dobInput = document.getElementById('personDob').value.trim();
  const genderInput = document.getElementById('personGender').value;

  // Hidden selects values:
  const motherId = document.querySelector('#motherSelect input[type="hidden"]')?.value || '';
  const fatherId = document.querySelector('#fatherSelect input[type="hidden"]')?.value || '';
  const spouseId = document.querySelector('#spouseSelect input[type="hidden"]')?.value || '';

  if (!nameInput || !genderInput) {
    alert('Name and Gender are required.');
    return;
  }

  // Determine if we're editing or adding
  const editingId = document.getElementById('personModal').dataset.editingId;
  
  try {
    if (editingId) {
      updateExistingPersonSVG(editingId, { 
        name: nameInput, 
        surname: surnameInput, 
        birthName: birthNameInput, 
        dob: dobInput, 
        gender: genderInput, 
        motherId, fatherId, spouseId 
      });
    } else {
      createNewPersonSVG({ 
        name: nameInput, 
        surname: surnameInput, 
        birthName: birthNameInput, 
        dob: dobInput, 
        gender: genderInput, 
        motherId, fatherId, spouseId 
      });
    }

    // Close modal first, then update other components
    closeModal();
    
    // Update other components
    generateAllConnections();   // regenerate connection lines
    rebuildTableView();         // refresh the table view data
    pushUndoState();            // save state for undo
    
    console.log('Person saved successfully');
  } catch (error) {
    console.error('Error saving person:', error);
    alert('Error saving person. Please try again.');
  }
}

// Create a new <g> circle‐node in the SVG
function createNewPersonSVG(data) {
  // Generate a unique ID
  const existingIds = Array.from(document.querySelectorAll('svg#svgArea g[data-id]'))
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

  // Positioning: center of viewport by default
  const viewBox = svg.viewBox.baseVal;
  const cx = viewBox.width / 2 + Math.random() * 200 - 100;
  const cy = viewBox.height / 2 + Math.random() * 200 - 100;

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

  // Make draggable
  makeCircleDraggable(group, circle);

  // Click to open edit modal
  circle.addEventListener('dblclick', () => {
    openModalForEdit(nextId);
  });

  svg.appendChild(group);
}

// Update an existing person's attributes and re‐render texts
function updateExistingPersonSVG(id, data) {
  const group = svg.querySelector(`g[data-id="${id}"]`);
  if (!group) return;

  // Overwrite attributes
  group.setAttribute('data-name', data.name);
  group.setAttribute('data-surname', data.surname);
  group.setAttribute('data-birthName', data.birthName);
  group.setAttribute('data-dob', data.dob);
  group.setAttribute('data-gender', data.gender);
  group.setAttribute('data-motherId', data.motherId);
  group.setAttribute('data-fatherId', data.fatherId);
  group.setAttribute('data-spouseId', data.spouseId);

  // Update text elements
  const nameText = group.querySelector('text.name');
  if (nameText) nameText.textContent = data.name;
  
  const dobText = group.querySelector('text.dob');
  if (dobText) dobText.textContent = data.dob;
}

// Apply global font, font size, nameColor, dateColor to all existing <text> nodes
function applyGlobalFontAndColors() {
  const allNameTexts = svg.querySelectorAll('text.name');
  const allDobTexts = svg.querySelectorAll('text.dob');
  
  allNameTexts.forEach(t => {
    t.setAttribute('font-family', fontFamily);
    t.setAttribute('font-size', `${fontSize}px`);
    t.setAttribute('fill', nameColor);
  });
  
  allDobTexts.forEach(t => {
    t.setAttribute('font-family', fontFamily);
    t.setAttribute('font-size', `${fontSize - 2}px`);
    t.setAttribute('fill', dateColor);
  });
}

// Reapply node radius & fill color to all circles
function reapplyAllNodeStyles() {
  svg.querySelectorAll('circle.person').forEach(c => {
    c.setAttribute('r', nodeRadius);
    c.setAttribute('fill', defaultColor);
  });
}

// Make a given <circle> draggable within the SVG
function makeCircleDraggable(group, circle) {
  let offsetX, offsetY, isDragging = false;

  circle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isDragging = true;
    
    // Get SVG coordinates
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; 
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
    
    offsetX = svgP.x - parseFloat(circle.getAttribute('cx'));
    offsetY = svgP.y - parseFloat(circle.getAttribute('cy'));
    
    circle.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; 
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
    
    const newCx = svgP.x - offsetX;
    const newCy = svgP.y - offsetY;
    
    circle.setAttribute('cx', newCx);
    circle.setAttribute('cy', newCy);
    
    // Move the text labels along
    const nameText = group.querySelector('text.name');
    const dobText = group.querySelector('text.dob');
    
    if (nameText) {
      nameText.setAttribute('x', newCx);
      nameText.setAttribute('y', newCy - nodeRadius - 8);
    }
    
    if (dobText) {
      dobText.setAttribute('x', newCx);
      dobText.setAttribute('y', newCy + nodeRadius + 16);
    }

    // Update any connected lines
    generateAllConnections();
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    circle.style.cursor = 'grab';
    pushUndoState();
  });
}

// -----------------------------------------------------------------------------
// Undo Stack

export function pushUndoState() {
  // Serialize the entire <svg> innerHTML and global settings
  const state = {
    svgInner: svg.innerHTML,
    nodeRadius, defaultColor, fontFamily, fontSize, nameColor, dateColor
  };
  undoStack.push(state);
  
  // Limit undo stack size
  if (undoStack.length > 50) {
    undoStack.shift();
  }
  
  // Clear redo stack on new action
  redoStack = [];
}

function undo() {
  if (undoStack.length < 2) return; // nothing to undo
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
  svg.innerHTML = state.svgInner;
  nodeRadius = state.nodeRadius;
  defaultColor = state.defaultColor;
  fontFamily = state.fontFamily;
  fontSize = state.fontSize;
  nameColor = state.nameColor;
  dateColor = state.dateColor;
  
  // Re‐wire interactions on restored nodes:
  svg.querySelectorAll('g[data-id]').forEach(group => {
    const circle = group.querySelector('circle.person');
    if (circle) {
      makeCircleDraggable(group, circle);
      circle.addEventListener('dblclick', () => {
        openModalForEdit(group.getAttribute('data-id'));
      });
    }
  });
  
  applyGlobalFontAndColors();
  reapplyAllNodeStyles();
  rebuildTableView();
}

// -----------------------------------------------------------------------------
// Generate Connections (parent/child & spouse)

export function generateAllConnections() {
  // Remove all existing relation lines first
  svg.querySelectorAll('line.relation').forEach(l => l.remove());

  svg.querySelectorAll('g[data-id]').forEach(childGroup => {
    const childId = childGroup.getAttribute('data-id');
    const motherId = childGroup.getAttribute('data-motherId');
    const fatherId = childGroup.getAttribute('data-fatherId');
    const spouseId = childGroup.getAttribute('data-spouseId');

    // Helper to draw a line between two circles
    function drawLineBetween(idA, idB, isSpouse = false) {
      const gA = svg.querySelector(`g[data-id="${idA}"]`);
      const gB = svg.querySelector(`g[data-id="${idB}"]`);
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
      
      // Insert at beginning so lines appear behind circles
      svg.insertBefore(line, svg.firstChild);
    }

    if (motherId) drawLineBetween(childId, motherId, false);
    if (fatherId) drawLineBetween(childId, fatherId, false);
    if (spouseId) drawLineBetween(childId, spouseId, true);
  });
}

// -----------------------------------------------------------------------------
// Save / Load (JSON serialization)

function saveTreeToJSON() {
  const allGroups = Array.from(svg.querySelectorAll('g[data-id]'));
  const data = {
    settings: { nodeRadius, defaultColor, fontFamily, fontSize, nameColor, dateColor },
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
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const data = JSON.parse(evt.target.result);
      
      // Clear existing SVG
      svg.innerHTML = '';
      
      // Restore settings
      if (data.settings) {
        nodeRadius = data.settings.nodeRadius || 40;
        defaultColor = data.settings.defaultColor || '#3498db';
        fontFamily = data.settings.fontFamily || 'Inter';
        fontSize = data.settings.fontSize || 14;
        nameColor = data.settings.nameColor || '#333333';
        dateColor = data.settings.dateColor || '#757575';
      }
      
      // Recreate each person
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

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.classList.add('person');
        circle.setAttribute('cx', p.cx);
        circle.setAttribute('cy', p.cy);
        circle.setAttribute('r', nodeRadius);
        circle.setAttribute('fill', defaultColor);
        group.appendChild(circle);

        const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        nameText.classList.add('name');
        nameText.textContent = p.name;
        nameText.setAttribute('x', p.cx);
        nameText.setAttribute('y', p.cy - nodeRadius - 8);
        nameText.setAttribute('text-anchor', 'middle');
        nameText.setAttribute('font-family', fontFamily);
        nameText.setAttribute('font-size', `${fontSize}px`);
        nameText.setAttribute('fill', nameColor);
        group.appendChild(nameText);

        const dobText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        dobText.classList.add('dob');
        dobText.textContent = p.dob;
        dobText.setAttribute('x', p.cx);
        dobText.setAttribute('y', p.cy + nodeRadius + 16);
        dobText.setAttribute('text-anchor', 'middle');
        dobText.setAttribute('font-family', fontFamily);
        dobText.setAttribute('font-size', `${fontSize - 2}px`);
        dobText.setAttribute('fill', dateColor);
        group.appendChild(dobText);

        makeCircleDraggable(group, circle);
        circle.addEventListener('dblclick', () => {
          openModalForEdit(p.id);
        });

        svg.appendChild(group);
      });

      // Re‐apply global styles and generate lines
      applyGlobalFontAndColors();
      reapplyAllNodeStyles();
      generateAllConnections();
      rebuildTableView();
      pushUndoState();
      
    } catch (error) {
      alert('Error loading file: ' + error.message);
    }
  };
  reader.readAsText(file);
}