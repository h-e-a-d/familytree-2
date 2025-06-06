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

document.addEventListener('DOMContentLoaded', () => {
  svg = document.getElementById('svgArea');
  addPersonBtn = document.getElementById('addPersonBtn');

  // Initialize pan/zoom, grid, etc.
  initializeSVGCanvas();

  // Wire up the floating "Add Person" button
  addPersonBtn.addEventListener('click', () => {
    openModalForEdit(); // no ID = "Add Person" mode
  });

  // Catch save from modal
  document.getElementById('personForm').addEventListener('submit', (e) => {
    e.preventDefault();
    savePersonFromModal();
  });

  // Cancel modal
  document.getElementById('cancelModal').addEventListener('click', () => {
    closeModal();
  });

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

  // Toggle Connect Mode (optional: if you have a button to do so)
  // document.getElementById('connectBtn').addEventListener('click', toggleConnectMode);

  // Whenever the modal opens (for either Add or Edit), rebuild the searchable selects
  document.getElementById('personModal').addEventListener('show', () => {
    // If editing, modal code will attach existing IDs
    const existingData = getModalExistingData(); 
    updateSearchableSelects(existingData);
  });
});

// -----------------------------------------------------------------------------
// SVG Initialization, grid, pan/zoom, etc.

function initializeSVGCanvas() {
  // For brevity, assume we have some pan/zoom library or
  // basic event listeners here. We also draw a light grid background.

  // Example: Fill background with white
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.style.backgroundColor = '#fff';
  // TODO: grid lines if desired…
}

// -----------------------------------------------------------------------------
// Modal Save Logic: add or update a person

function savePersonFromModal() {
  const nameInput = document.getElementById('personName').value.trim();
  const surnameInput = document.getElementById('personSurname').value.trim();
  const birthNameInput = document.getElementById('personBirthName').value.trim();
  const dobInput = document.getElementById('personDob').value.trim();
  const genderInput = document.getElementById('personGender').value;

  // Hidden selects:
  const motherId = document.querySelector('#motherSelect input[type="hidden"]').value;
  const fatherId = document.querySelector('#fatherSelect input[type="hidden"]').value;
  const spouseId = document.querySelector('#spouseSelect input[type="hidden"]').value;

  if (!nameInput || !genderInput) {
    alert('Name and Gender are required.');
    return;
  }

  // Determine if we're editing or adding
  const editingId = document.getElementById('personModal').dataset.editingId;
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

  closeModal();
  rebuildTableView();       // refresh the table view data
  pushUndoState();          // save state for undo
}

// Create a new <g> circle‐node in the SVG
function createNewPersonSVG(data) {
  // Generate a unique ID (p1, p2, etc.)
  const nextId = `p${document.querySelectorAll('svg#g svg g[data-id]').length + 1}`;
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
  const bbox = svg.getBoundingClientRect();
  const cx = bbox.width / 2;
  const cy = bbox.height / 2;

  // Circle
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.classList.add('person');
  circle.setAttribute('cx', cx);
  circle.setAttribute('cy', cy);
  circle.setAttribute('r', nodeRadius);
  circle.setAttribute('fill', defaultColor);
  circle.style.cursor = 'grab';
  group.appendChild(circle);

  // Name text
  const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  nameText.classList.add('name');
  nameText.textContent = data.name;
  nameText.setAttribute('x', cx);
  nameText.setAttribute('y', cy - nodeRadius - 8);
  nameText.setAttribute('text-anchor', 'middle');
  group.appendChild(nameText);

  // DOB text
  const dobText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  dobText.classList.add('dob');
  dobText.textContent = data.dob;
  dobText.setAttribute('x', cx);
  dobText.setAttribute('y', cy + nodeRadius + 16);
  dobText.setAttribute('text-anchor', 'middle');
  group.appendChild(dobText);

  // Make draggable
  makeCircleDraggable(group, circle);

  // Click to open edit modal
  circle.addEventListener('dblclick', () => {
    openModalForEdit(nextId);
  });

  svg.appendChild(group);
}

// Update an existing person’s attributes and re‐render texts
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
  nameText.textContent = data.name;
  const dobText = group.querySelector('text.dob');
  dobText.textContent = data.dob;
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
    isDragging = true;
    // Compute offset relative to circle center
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
    offsetX = svgP.x - parseFloat(circle.getAttribute('cx'));
    offsetY = svgP.y - parseFloat(circle.getAttribute('cy'));
    circle.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
    const newCx = svgP.x - offsetX;
    const newCy = svgP.y - offsetY;
    circle.setAttribute('cx', newCx);
    circle.setAttribute('cy', newCy);
    // Move the text labels along
    const groupG = group;
    const nameText = groupG.querySelector('text.name');
    const dobText = groupG.querySelector('text.dob');
    nameText.setAttribute('x', newCx);
    const currentNameY = parseFloat(nameText.getAttribute('y'));
    const desiredNameY = newCy - nodeRadius - 8;
    nameText.setAttribute('y', desiredNameY);
    dobText.setAttribute('x', newCx);
    const desiredDobY = newCy + nodeRadius + 16;
    dobText.setAttribute('y', desiredDobY);

    // If connectMode and we already selected the first, draw a temporary line
    if (connectMode && connectFirst === groupG.getAttribute('data-id')) {
      // TODO: optional: show a rubber‐band line following the cursor
    }
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

function pushUndoState() {
  // Serialize the entire <svg> innerHTML and global settings
  const state = {
    svgInner: svg.innerHTML,
    nodeRadius, defaultColor, fontFamily, fontSize, nameColor, dateColor
  };
  undoStack.push(state);
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
    makeCircleDraggable(group, circle);
    circle.addEventListener('dblclick', () => {
      openModalForEdit(group.getAttribute('data-id'));
    });
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

  svg.querySelectorAll('g[data-id]').forEach(parentGroup => {
    const pid = parentGroup.getAttribute('data-id');
    const motherId = parentGroup.getAttribute('data-motherId');
    const fatherId = parentGroup.getAttribute('data-fatherId');
    const spouseId = parentGroup.getAttribute('data-spouseId');

    // Helper to draw a line between two circles
    function drawLineBetween(idA, idB, isSpouse = false) {
      const gA = svg.querySelector(`g[data-id="${idA}"]`);
      const gB = svg.querySelector(`g[data-id="${idB}"]`);
      if (!gA || !gB) return;
      const circleA = gA.querySelector('circle.person');
      const circleB = gB.querySelector('circle.person');
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
      svg.appendChild(line);
    }

    if (motherId) drawLineBetween(pid, motherId, false);
    if (fatherId) drawLineBetween(pid, fatherId, false);
    if (spouseId) drawLineBetween(pid, spouseId, true);
  });

  // Reorder lines to be behind circles
  const allLines = Array.from(svg.querySelectorAll('line.relation'));
  allLines.forEach(l => svg.insertBefore(l, svg.firstChild));
}

// -----------------------------------------------------------------------------
// Modal‐related helper: get existing data if editing

function getModalExistingData() {
  const modal = document.getElementById('personModal');
  const editingId = modal.dataset.editingId;
  if (!editingId) return {};
  const group = svg.querySelector(`g[data-id="${editingId}"]`);
  if (!group) return {};
  return {
    motherId: group.getAttribute('data-motherId'),
    fatherId: group.getAttribute('data-fatherId'),
    spouseId: group.getAttribute('data-spouseId')
  };
}

// -----------------------------------------------------------------------------
// Save / Load (JSON serialization)

function saveTreeToJSON() {
  const allGroups = Array.from(svg.querySelectorAll('g[data-id]'));
  const data = {
    settings: { nodeRadius, defaultColor, fontFamily, fontSize, nameColor, dateColor },
    persons: allGroups.map(g => ({
      id: g.getAttribute('data-id'),
      name: g.getAttribute('data-name'),
      surname: g.getAttribute('data-surname'),
      birthName: g.getAttribute('data-birthName'),
      dob: g.getAttribute('data-dob'),
      gender: g.getAttribute('data-gender'),
      motherId: g.getAttribute('data-motherId'),
      fatherId: g.getAttribute('data-fatherId'),
      spouseId: g.getAttribute('data-spouseId'),
      cx: g.querySelector('circle.person').getAttribute('cx'),
      cy: g.querySelector('circle.person').getAttribute('cy'),
    }))
  };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'family_tree.json';
  a.click();
  URL.revokeObjectURL(url);
}

function loadTreeFromJSON(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    const data = JSON.parse(evt.target.result);
    // Clear existing SVG
    svg.innerHTML = '';
    // Restore settings
    nodeRadius = data.settings.nodeRadius;
    defaultColor = data.settings.defaultColor;
    fontFamily = data.settings.fontFamily;
    fontSize = data.settings.fontSize;
    nameColor = data.settings.nameColor;
    dateColor = data.settings.dateColor;
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
      circle.style.cursor = 'grab';
      group.appendChild(circle);

      const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      nameText.classList.add('name');
      nameText.textContent = p.name;
      nameText.setAttribute('x', p.cx);
      nameText.setAttribute('y', p.cy - nodeRadius - 8);
      nameText.setAttribute('text-anchor', 'middle');
      group.appendChild(nameText);

      const dobText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      dobText.classList.add('dob');
      dobText.textContent = p.dob;
      dobText.setAttribute('x', p.cx);
      dobText.setAttribute('y', p.cy + nodeRadius + 16);
      dobText.setAttribute('text-anchor', 'middle');
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
  };
  reader.readAsText(file);
}
