// tree-core.js
// Core coordinator module - handles initialization and module coordination

import { PanZoomManager } from './tree-panzoom.js';
import { DragManager } from './tree-drag.js';
import { SelectionManager } from './tree-selection.js';
import { ConnectionManager } from './tree-connections.js';
import { GridManager } from './tree-grid.js';
import { UndoManager } from './tree-undo.js';
import { DataManager } from './tree-data.js';
import { InteractionManager } from './tree-interactions.js';
import { openModalForEdit, closeModal } from './modal.js';
import { rebuildTableView } from './table.js';
import { exportTree } from './exporter.js';

class TreeCore {
  constructor() {
    // Core state
    this.svg = null;
    this.nodeRadius = 40;
    this.defaultColor = '#3498db';
    this.fontFamily = 'Inter';
    this.fontSize = 14;
    this.nameColor = '#333333';
    this.dateColor = '#757575';
    
    // UI elements
    this.addPersonBtn = null;
    this.connectBtn = null;
    this.styleBtn = null;
    this.undoBtn = null;
    
    // Managers
    this.panZoom = null;
    this.drag = null;
    this.selection = null;
    this.connections = null;
    this.grid = null;
    this.undo = null;
    this.data = null;
    this.interactions = null;
  }

  initialize() {
    console.log('TreeCore initializing...');
    
    // Get DOM elements
    this.svg = document.getElementById('svgArea');
    this.addPersonBtn = document.getElementById('addPersonBtn');
    this.connectBtn = document.getElementById('connectBtn');
    this.styleBtn = document.getElementById('styleBtn');
    this.undoBtn = document.getElementById('undoBtn');

    if (!this.svg) {
      console.error('SVG area not found');
      return;
    }

    // Initialize SVG
    this.initializeSVG();
    
    // Initialize managers
    this.panZoom = new PanZoomManager(this.svg);
    this.grid = new GridManager(this.svg, this.panZoom);
    this.selection = new SelectionManager(this.connectBtn, this.styleBtn);
    this.connections = new ConnectionManager(this.svg);
    this.drag = new DragManager(this.svg, this.panZoom, this.connections, this.selection);
    this.undo = new UndoManager(this.svg, this);
    this.data = new DataManager(this.svg, this);
    this.interactions = new InteractionManager(this.svg, this.selection, this.drag);

    // Setup UI
    this.setupButtons();
    this.setupSettings();
    this.setupExport();
    this.setupKeyboard();

    // Initial state
    this.grid.draw();
    this.undo.pushState();
    
    console.log('TreeCore initialization complete');
  }

  initializeSVG() {
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    this.svg.setAttribute('viewBox', '0 0 1200 800');
    this.svg.style.backgroundColor = '#fff';
    
    // Create main group for pan/zoom transformations
    const mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    mainGroup.id = 'mainGroup';
    this.svg.appendChild(mainGroup);
  }

  setupButtons() {
    // Add person button
    if (this.addPersonBtn) {
      this.addPersonBtn.addEventListener('click', () => {
        const floatingButtons = document.querySelector('.floating-buttons');
        
        if (floatingButtons && floatingButtons.classList.contains('expanded')) {
          this.selection.clear();
        } else {
          console.log('Add person button clicked');
          openModalForEdit();
        }
      });
    }

    // Undo button
    if (this.undoBtn) {
      this.undoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.undo.undo();
      });
    }

    // Connect button
    if (this.connectBtn) {
      this.connectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.connections.handleConnectSelected(this.selection.getSelected());
      });
    }

    // Style button
    if (this.styleBtn) {
      this.styleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openStyleModal();
      });
    }

    // Form submit handler
    const personForm = document.getElementById('personForm');
    if (personForm) {
      personForm.addEventListener('submit', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.savePersonFromModal();
      });
    }
  }

  setupSettings() {
    // Settings panel event listeners
    const applyBtn = document.getElementById('applyNodeStyle');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        const color = document.getElementById('nodeColorPicker').value;
        const size = parseInt(document.getElementById('nodeSizeInput').value, 10);
        if (!isNaN(size) && size > 0) {
          this.nodeRadius = size;
          this.defaultColor = color;
          this.reapplyAllNodeStyles();
          this.undo.pushState();
        }
      });
    }

    const fontSelect = document.getElementById('fontSelect');
    if (fontSelect) {
      fontSelect.addEventListener('change', (e) => {
        this.fontFamily = e.target.value;
        this.applyGlobalFontAndColors();
        this.undo.pushState();
      });
    }

    const fontSizeInput = document.getElementById('fontSizeInput');
    if (fontSizeInput) {
      fontSizeInput.addEventListener('change', (e) => {
        this.fontSize = parseInt(e.target.value, 10) || this.fontSize;
        this.applyGlobalFontAndColors();
        this.undo.pushState();
      });
    }

    const nameColorPicker = document.getElementById('nameColorPicker');
    if (nameColorPicker) {
      nameColorPicker.addEventListener('change', (e) => {
        this.nameColor = e.target.value;
        this.applyGlobalFontAndColors();
        this.undo.pushState();
      });
    }

    const dateColorPicker = document.getElementById('dateColorPicker');
    if (dateColorPicker) {
      dateColorPicker.addEventListener('change', (e) => {
        this.dateColor = e.target.value;
        this.applyGlobalFontAndColors();
        this.undo.pushState();
      });
    }
  }

  setupExport() {
    document.getElementById('exportSvg')?.addEventListener('click', () => exportTree('svg'));
    document.getElementById('exportPng')?.addEventListener('click', () => exportTree('png'));
    document.getElementById('exportPdf')?.addEventListener('click', () => exportTree('pdf'));
    document.getElementById('saveData')?.addEventListener('click', () => this.data.saveToJSON());
    document.getElementById('loadData')?.addEventListener('change', (e) => this.data.loadFromJSON(e));
  }

  setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
      }
      
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.undo.undo();
      } else if (e.ctrlKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        this.undo.redo();
      } else if (e.key === 'Delete' && this.selection.hasSelection()) {
        this.selection.deleteSelected();
      } else if (e.key === 'Escape') {
        this.selection.clear();
        this.connections.closeModal();
      }
    });
  }

  // Person management
  savePersonFromModal() {
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
        this.updateExistingPerson(editingId, { 
          name: nameInput, surname: surnameInput, birthName: birthNameInput, 
          dob: dobInput, gender: genderInput, motherId, fatherId, spouseId 
        });
      } else {
        this.createNewPerson({ 
          name: nameInput, surname: surnameInput, birthName: birthNameInput, 
          dob: dobInput, gender: genderInput, motherId, fatherId, spouseId 
        });
      }

      closeModal();
      this.connections.generateAll();
      rebuildTableView();
      this.undo.pushState();
    } catch (error) {
      console.error('Error saving person:', error);
      alert('Error saving person. Please try again.');
    }
  }

  createNewPerson(data) {
    const existingIds = Array.from(this.svg.querySelectorAll('g[data-id]'))
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

    // Position in center with slight randomization
    const cx = 600 + Math.random() * 200 - 100;
    const cy = 400 + Math.random() * 200 - 100;

    // Create circle
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.classList.add('person');
    circle.setAttribute('cx', cx);
    circle.setAttribute('cy', cy);
    circle.setAttribute('r', this.nodeRadius);
    circle.setAttribute('fill', this.defaultColor);
    group.appendChild(circle);

    // Create name text
    const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    nameText.classList.add('name');
    nameText.textContent = data.name;
    nameText.setAttribute('x', cx);
    nameText.setAttribute('y', cy - this.nodeRadius - 8);
    nameText.setAttribute('text-anchor', 'middle');
    nameText.setAttribute('font-family', this.fontFamily);
    nameText.setAttribute('font-size', `${this.fontSize}px`);
    nameText.setAttribute('fill', this.nameColor);
    group.appendChild(nameText);

    // Create DOB text
    const dobText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    dobText.classList.add('dob');
    dobText.textContent = data.dob;
    dobText.setAttribute('x', cx);
    dobText.setAttribute('y', cy + this.nodeRadius + 16);
    dobText.setAttribute('text-anchor', 'middle');
    dobText.setAttribute('font-family', this.fontFamily);
    dobText.setAttribute('font-size', `${this.fontSize - 2}px`);
    dobText.setAttribute('fill', this.dateColor);
    group.appendChild(dobText);

    // Setup interactions
    this.interactions.setupCircleInteractions(group, circle, nextId);

    // Add to SVG
    const mainGroup = document.getElementById('mainGroup');
    if (mainGroup) {
      mainGroup.appendChild(group);
    } else {
      this.svg.appendChild(group);
    }
  }

  updateExistingPerson(id, data) {
    const group = this.svg.querySelector(`g[data-id="${id}"]`);
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

  // Style management
  openStyleModal() {
    if (!this.selection.hasSelection()) {
      alert('Please select at least one circle to style.');
      return;
    }
    
    const styleModal = document.getElementById('styleModal');
    if (!styleModal) return;
    
    // Pre-populate with current values from first selected
    const firstSelectedId = Array.from(this.selection.getSelected())[0];
    const firstGroup = this.svg.querySelector(`g[data-id="${firstSelectedId}"]`);
    const firstCircle = firstGroup?.querySelector('circle.person');
    const firstNameText = firstGroup?.querySelector('text.name');
    const firstDobText = firstGroup?.querySelector('text.dob');
    
    if (firstCircle) {
      document.getElementById('selectedNodeColor').value = this.rgbToHex(firstCircle.getAttribute('fill') || this.defaultColor);
      document.getElementById('selectedNodeSize').value = firstCircle.getAttribute('r') || this.nodeRadius;
    }
    
    if (firstNameText) {
      document.getElementById('selectedFont').value = firstNameText.getAttribute('font-family') || this.fontFamily;
      document.getElementById('selectedFontSize').value = parseInt(firstNameText.getAttribute('font-size')) || this.fontSize;
      document.getElementById('selectedNameColor').value = this.rgbToHex(firstNameText.getAttribute('fill') || this.nameColor);
    }
    
    if (firstDobText) {
      document.getElementById('selectedDateColor').value = this.rgbToHex(firstDobText.getAttribute('fill') || this.dateColor);
    }
    
    styleModal.classList.remove('hidden');
    styleModal.style.display = 'flex';
  }

  applyGlobalFontAndColors() {
    this.svg.querySelectorAll('text.name').forEach(t => {
      t.setAttribute('font-family', this.fontFamily);
      t.setAttribute('font-size', `${this.fontSize}px`);
      t.setAttribute('fill', this.nameColor);
    });
    
    this.svg.querySelectorAll('text.dob').forEach(t => {
      t.setAttribute('font-family', this.fontFamily);
      t.setAttribute('font-size', `${this.fontSize - 2}px`);
      t.setAttribute('fill', this.dateColor);
    });
  }

  reapplyAllNodeStyles() {
    this.svg.querySelectorAll('circle.person').forEach(c => {
      c.setAttribute('r', this.nodeRadius);
      c.setAttribute('fill', this.defaultColor);
    });
  }

  rgbToHex(rgb) {
    if (rgb.startsWith('#')) return rgb;
    if (rgb.startsWith('rgb')) {
      const values = rgb.match(/\d+/g);
      if (values && values.length >= 3) {
        return '#' + values.slice(0, 3).map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
      }
    }
    return rgb;
  }

  // Getters for managers to access core state
  getState() {
    return {
      nodeRadius: this.nodeRadius,
      defaultColor: this.defaultColor,
      fontFamily: this.fontFamily,
      fontSize: this.fontSize,
      nameColor: this.nameColor,
      dateColor: this.dateColor
    };
  }

  setState(state) {
    this.nodeRadius = state.nodeRadius;
    this.defaultColor = state.defaultColor;
    this.fontFamily = state.fontFamily;
    this.fontSize = state.fontSize;
    this.nameColor = state.nameColor;
    this.dateColor = state.dateColor;
  }
}

// Create global instance
const treeCore = new TreeCore();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  treeCore.initialize();
});

// Export for other modules
export { treeCore };