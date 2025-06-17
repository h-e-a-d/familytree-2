// tree-core-canvas.js - Enhanced with maiden name support and display preferences

import { CanvasRenderer } from './canvas-renderer.js';
import { openModalForEdit, closeModal, getSelectedGender } from './modal.js';
import { rebuildTableView } from './table.js';
import { exportTree } from './exporter.js';

class TreeCoreCanvas {
  constructor() {
    // Core state
    this.renderer = null;
    this.nodeRadius = 50;
    this.defaultColor = '#3498db';
    this.fontFamily = 'Inter';
    this.fontSize = 11;
    this.nameColor = '#ffffff';
    this.dateColor = '#f0f0f0';
    
    // Display preferences
    this.displayPreferences = {
      showMaidenName: true,
      showDateOfBirth: true,
      showFatherName: true
    };
    
    // Node style
    this.nodeStyle = 'circle'; // 'circle' or 'rectangle'
    
    // UI elements
    this.addPersonBtn = null;
    this.connectBtn = null;
    this.styleBtn = null;
    this.undoBtn = null;
    
    // State management
    this.selectedCircles = new Set();
    this.undoStack = [];
    this.redoStack = [];
    this.maxUndoSize = 50;
    
    // Connection state for modal
    this.connectionPersonA = null;
    this.connectionPersonB = null;
    
    // Line removal state
    this.currentConnectionToRemove = null;
    this.hiddenConnections = new Set();
    this.lineOnlyConnections = new Set();
    
    // ID counter
    this.nextId = 1;
  }

  initialize() {
    console.log('TreeCoreCanvas initializing...');
    
    // Get container
    const graphicView = document.getElementById('graphicView');
    if (!graphicView) {
      console.error('Graphic view container not found');
      return;
    }
    
    // Clear existing SVG content
    const existingSvg = document.getElementById('svgArea');
    if (existingSvg) {
      existingSvg.remove();
    }
    
    // Create canvas renderer
    this.renderer = new CanvasRenderer(graphicView);
    
    // Set up renderer callbacks
    this.renderer.onNodeClick = (nodeId, event) => {
      this.handleNodeClick(nodeId, event);
    };
    
    this.renderer.onNodeDoubleClick = (nodeId) => {
      console.log('Double-clicked node:', nodeId);
      openModalForEdit(nodeId);
    };
    
    this.renderer.onNodeDragEnd = (nodeId) => {
      this.regenerateConnections();
      this.pushUndoState();
    };
    
    this.renderer.onSelectionCleared = () => {
      this.handleSelectionCleared();
    };

    this.renderer.onConnectionClick = (connection, index) => {
      this.handleConnectionClick(connection, index);
    };
    
    // Apply settings to renderer
    this.updateRendererSettings();
    
    // Setup UI
    this.setupButtons();
    this.setupSettings();
    this.setupExport();
    this.setupKeyboard();
    this.setupStyleModal();
    this.setupLineRemovalModal();
    this.setupViewSwitching();
    this.setupDisplayPreferences(); // New method for display preferences
    
    // Setup form submit handler
    const personForm = document.getElementById('personForm');
    if (personForm) {
      personForm.addEventListener('submit', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.savePersonFromModal();
      });
    }
    
    // Initial state
    this.pushUndoState();
    
    console.log('TreeCoreCanvas initialization complete');
  }

  // New method to setup display preferences
  setupDisplayPreferences() {
    const preferences = ['showMaidenName', 'showDateOfBirth', 'showFatherName'];
    
    preferences.forEach(prefId => {
      const checkbox = document.getElementById(prefId);
      if (checkbox) {
        checkbox.addEventListener('change', () => {
          const prefKey = prefId; // e.g., 'showMaidenName'
          this.displayPreferences[prefKey] = checkbox.checked;
          console.log(`Display preference ${prefKey} changed to:`, checkbox.checked);
          
          // Update all existing nodes to reflect the preference change
          this.updateAllNodesDisplay();
          this.pushUndoState();
        });
      }
    });
  }

  // Update all nodes to reflect display preferences
  updateAllNodesDisplay() {
    if (!this.renderer) return;
    
    // Re-render all nodes with current display preferences
    for (const [id, node] of this.renderer.nodes) {
      const personData = this.getPersonData(id) || {};
      this.renderer.setNode(id, {
        ...node,
        // Force re-render by updating with current preferences
        displayPreferences: { ...this.displayPreferences }
      });
    }
    
    this.renderer.needsRedraw = true;
  }

  setupViewSwitching() {
    const viewToggle = document.getElementById('viewToggle');
    if (viewToggle) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const graphicView = document.getElementById('graphicView');
            const tableView = document.getElementById('tableView');
            
            if (graphicView && !graphicView.classList.contains('hidden') && 
                tableView && tableView.classList.contains('hidden')) {
              setTimeout(() => {
                if (this.renderer) {
                  console.log('Refreshing canvas after view switch');
                  this.renderer.resize();
                  this.renderer.needsRedraw = true;
                }
              }, 100);
            }
          }
        });
      });
      
      const graphicView = document.getElementById('graphicView');
      if (graphicView) {
        observer.observe(graphicView, { attributes: true, attributeFilter: ['class'] });
      }
    }
  }

  updateRendererSettings() {
    if (!this.renderer) return;
    
    this.renderer.settings.nodeRadius = this.nodeRadius;
    this.renderer.settings.nodeColor = this.defaultColor;
    this.renderer.settings.fontFamily = this.fontFamily;
    this.renderer.settings.nameFontSize = this.fontSize;
    this.renderer.settings.nameColor = this.nameColor;
    this.renderer.settings.dobColor = this.dateColor;
    this.renderer.needsRedraw = true;
  }

  handleNodeClick(nodeId, event) {
    this.selectedCircles = this.renderer.getSelectedNodes();
    this.updateActionButtons();
  }

  handleSelectionCleared() {
    this.selectedCircles.clear();
    this.updateActionButtons();
  }

  handleConnectionClick(connection, index) {
    console.log('Connection line clicked:', connection);
    this.currentConnectionToRemove = { connection, index };
    this.openLineRemovalModal(connection);
  }

  setupButtons() {
    this.addPersonBtn = document.getElementById('addPersonBtn');
    this.connectBtn = document.getElementById('connectBtn');
    this.styleBtn = document.getElementById('styleBtn');
    this.undoBtn = document.getElementById('undoBtn');

    if (this.addPersonBtn) {
      this.addPersonBtn.addEventListener('click', () => {
        const floatingButtons = document.querySelector('.floating-buttons');
        
        if (floatingButtons && floatingButtons.classList.contains('expanded')) {
          this.clearSelection();
        } else {
          console.log('Add person button clicked');
          openModalForEdit();
        }
      });
    }

    if (this.undoBtn) {
      this.undoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.undo();
      });
    }

    if (this.connectBtn) {
      this.connectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleConnectSelected();
      });
    }

    if (this.styleBtn) {
      this.styleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openStyleModal();
      });
    }
    
    this.setupConnectionModal();
  }

  setupStyleModal() {
    const styleModal = document.getElementById('styleModal');
    const cancelBtn = document.getElementById('cancelStyleModal');
    const applyBtn = document.getElementById('applySelectedStyle');

    if (cancelBtn) {
      cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.closeStyleModal();
      });
    }

    if (applyBtn) {
      applyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.applySelectedStyles();
      });
    }

    if (styleModal) {
      styleModal.addEventListener('click', (e) => {
        if (e.target === styleModal) {
          this.closeStyleModal();
        }
      });
    }

    const modalContent = styleModal?.querySelector('.modal-content');
    if (modalContent) {
      modalContent.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
  }

  setupLineRemovalModal() {
    this.createLineRemovalModal();
    
    const lineRemovalModal = document.getElementById('lineRemovalModal');
    const cancelBtn = document.getElementById('cancelLineRemoval');
    const confirmBtn = document.getElementById('confirmLineRemoval');

    if (cancelBtn) {
      cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.closeLineRemovalModal();
      });
    }

    if (confirmBtn) {
      confirmBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.confirmLineRemoval();
      });
    }

    if (lineRemovalModal) {
      lineRemovalModal.addEventListener('click', (e) => {
        if (e.target === lineRemovalModal) {
          this.closeLineRemovalModal();
        }
      });
    }

    const modalContent = lineRemovalModal?.querySelector('.modal-content');
    if (modalContent) {
      modalContent.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
  }

  createLineRemovalModal() {
    if (document.getElementById('lineRemovalModal')) {
      return;
    }

    const modal = document.createElement('div');
    modal.id = 'lineRemovalModal';
    modal.className = 'modal hidden';
    modal.style.display = 'none';

    modal.innerHTML = `
      <div class="modal-content">
        <h2>Remove the line</h2>
        <p style="margin-bottom: 20px; color: #666; font-size: 14px;">This does not remove the relation</p>
        <div class="form-actions">
          <button type="button" id="cancelLineRemoval">Cancel</button>
          <button type="button" id="confirmLineRemoval" style="background: #e74c3c;">Yes</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  openLineRemovalModal(connection) {
    const lineRemovalModal = document.getElementById('lineRemovalModal');
    if (!lineRemovalModal) return;
    
    lineRemovalModal.classList.remove('hidden');
    lineRemovalModal.style.display = 'flex';
  }

  closeLineRemovalModal() {
    const lineRemovalModal = document.getElementById('lineRemovalModal');
    if (lineRemovalModal) {
      lineRemovalModal.classList.add('hidden');
      lineRemovalModal.style.display = 'none';
    }
    
    this.currentConnectionToRemove = null;
  }

  confirmLineRemoval() {
    if (!this.currentConnectionToRemove) {
      this.closeLineRemovalModal();
      return;
    }

    const { connection, index } = this.currentConnectionToRemove;
    
    const connectionKey = this.getConnectionKey(connection.from, connection.to);
    this.hiddenConnections.add(connectionKey);
    
    this.renderer.removeConnection(index);
    
    console.log(`Hidden connection line between ${connection.from} and ${connection.to} (relationship data preserved)`);
    
    this.closeLineRemovalModal();
    this.pushUndoState();
  }

  setupConnectionModal() {
    const cancelBtn = document.getElementById('cancelConnectionModal');
    const motherBtn = document.getElementById('motherBtn');
    const fatherBtn = document.getElementById('fatherBtn');
    const childBtn = document.getElementById('childBtn');
    const spouseBtn = document.getElementById('spouseBtn');
    const lineOnlyBtn = document.getElementById('lineOnlyBtn');

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.closeConnectionModal());
    }

    if (motherBtn) {
      motherBtn.addEventListener('click', () => this.handleConnectionChoice('mother'));
    }

    if (fatherBtn) {
      fatherBtn.addEventListener('click', () => this.handleConnectionChoice('father'));
    }

    if (childBtn) {
      childBtn.addEventListener('click', () => this.handleConnectionChoice('child'));
    }

    if (spouseBtn) {
      spouseBtn.addEventListener('click', () => this.handleConnectionChoice('spouse'));
    }

    if (lineOnlyBtn) {
      lineOnlyBtn.addEventListener('click', () => this.handleConnectionChoice('line-only'));
    }
  }

  setupSettings() {
    const applyBtn = document.getElementById('applyNodeStyle');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        const color = document.getElementById('nodeColorPicker').value;
        const size = parseInt(document.getElementById('nodeSizeInput').value, 10);
        if (!isNaN(size) && size > 0) {
          this.nodeRadius = size;
          this.defaultColor = color;
          this.updateRendererSettings();
          this.pushUndoState();
        }
      });
    }

    const fontSelect = document.getElementById('fontSelect');
    if (fontSelect) {
      fontSelect.addEventListener('change', (e) => {
        this.fontFamily = e.target.value;
        this.updateRendererSettings();
        this.pushUndoState();
      });
    }

    const fontSizeInput = document.getElementById('fontSizeInput');
    if (fontSizeInput) {
      fontSizeInput.addEventListener('change', (e) => {
        this.fontSize = parseInt(e.target.value, 10) || this.fontSize;
        this.updateRendererSettings();
        this.pushUndoState();
      });
    }

    const nameColorPicker = document.getElementById('nameColorPicker');
    if (nameColorPicker) {
      nameColorPicker.addEventListener('change', (e) => {
        this.nameColor = e.target.value;
        this.updateRendererSettings();
        this.pushUndoState();
      });
    }

    const dateColorPicker = document.getElementById('dateColorPicker');
    if (dateColorPicker) {
      dateColorPicker.addEventListener('change', (e) => {
        this.dateColor = e.target.value;
        this.updateRendererSettings();
        this.pushUndoState();
      });
    }
  }

  setupExport() {
    document.getElementById('exportSvg')?.addEventListener('click', () => {
      alert('Canvas export not yet implemented');
    });
    document.getElementById('exportPng')?.addEventListener('click', () => {
      this.exportCanvasAsPNG();
    });
    document.getElementById('exportPdf')?.addEventListener('click', () => {
      alert('Canvas PDF export not yet implemented');
    });
    document.getElementById('saveData')?.addEventListener('click', () => this.saveToJSON());
    document.getElementById('loadData')?.addEventListener('change', (e) => this.loadFromJSON(e));
  }

  exportCanvasAsPNG() {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCanvas.width = this.renderer.canvas.width;
    tempCanvas.height = this.renderer.canvas.height;
    
    tempCtx.fillStyle = 'white';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    tempCtx.drawImage(this.renderer.canvas, 0, 0);
    
    tempCanvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'family-tree.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
      }
      
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.undo();
      } else if (e.ctrlKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        this.redo();
      } else if (e.key === 'Delete' && this.selectedCircles.size > 0) {
        this.deleteSelected();
      } else if (e.key === 'Escape') {
        this.clearSelection();
        this.closeStyleModal();
        this.closeConnectionModal();
        this.closeLineRemovalModal();
      }
    });
  }

  // Enhanced person management with maiden name support
  savePersonFromModal() {
    const nameInput = document.getElementById('personName').value.trim();
    const fatherNameInput = document.getElementById('personFatherName').value.trim();
    const surnameInput = document.getElementById('personSurname').value.trim();
    const maidenNameInput = document.getElementById('personMaidenName').value.trim(); // Changed from birthName
    const dobInput = document.getElementById('personDob').value.trim();
    const genderInput = getSelectedGender(); // Use the new function

    const motherId = document.querySelector('#motherSelect input[type="hidden"]')?.value || '';
    const fatherId = document.querySelector('#fatherSelect input[type="hidden"]')?.value || '';
    const spouseId = document.querySelector('#spouseSelect input[type="hidden"]')?.value || '';

    if (!nameInput || !genderInput) {
      alert('Name and Gender are required.');
      return;
    }

    const modal = document.getElementById('personModal');
    const editingId = modal?.dataset.editingId;
    
    const personData = {
      name: nameInput,
      fatherName: fatherNameInput,
      surname: surnameInput,
      maidenName: maidenNameInput, // Changed from birthName
      dob: dobInput,
      gender: genderInput,
      motherId,
      fatherId,
      spouseId
    };
    
    try {
      if (editingId) {
        this.updateExistingPerson(editingId, personData);
      } else {
        this.createNewPerson(personData);
      }

      closeModal();
      this.regenerateConnections();
      this.pushUndoState();
      
      import('./searchableSelect.js').then(mod => {
        if (mod.updateSearchableSelects) {
          mod.updateSearchableSelects();
        }
      });
      
    } catch (error) {
      console.error('Error saving person:', error);
      alert('Error saving person. Please try again.');
    }
  }

  createNewPerson(data) {
    const id = `p${this.nextId++}`;
    
    const centerX = this.renderer.canvas.width / 2 / this.renderer.dpr;
    const centerY = this.renderer.canvas.height / 2 / this.renderer.dpr;
    
    const nodeData = {
      x: centerX + (Math.random() - 0.5) * 200,
      y: centerY + (Math.random() - 0.5) * 200,
      ...data
    };
    
    if (!this.personData) {
      this.personData = new Map();
    }
    this.personData.set(id, { ...data });
    
    this.renderer.setNode(id, nodeData);
  }

  updateExistingPerson(id, data) {
    const existingNode = this.renderer.nodes.get(id);
    if (!existingNode) return;
    
    const nodeData = {
      ...existingNode,
      ...data
    };
    
    if (!this.personData) {
      this.personData = new Map();
    }
    this.personData.set(id, { ...data });
    
    this.renderer.setNode(id, nodeData);
  }

  getPersonData(id) {
    return this.personData?.get(id) || {};
  }

  // Connection management (unchanged methods)
  handleConnectSelected() {
    this.selectedCircles = this.renderer.getSelectedNodes();
    
    if (this.selectedCircles.size !== 2) {
      alert('Please select exactly 2 circles to connect.');
      return;
    }
    
    const [personId1, personId2] = Array.from(this.selectedCircles);
    this.connectionPersonA = personId1;
    this.connectionPersonB = personId2;
    
    this.openConnectionModal();
  }

  openConnectionModal() {
    const connectionModal = document.getElementById('connectionModal');
    const connectionText = document.getElementById('connectionText');
    
    if (!connectionModal || !connectionText) return;
    
    const person1Name = this.getPersonDisplayName(this.connectionPersonA);
    const person2Name = this.getPersonDisplayName(this.connectionPersonB);
    
    connectionText.textContent = `${person1Name} is __ to ${person2Name}`;
    
    connectionModal.classList.remove('hidden');
    connectionModal.style.display = 'flex';
  }

  closeConnectionModal() {
    const connectionModal = document.getElementById('connectionModal');
    if (connectionModal) {
      connectionModal.classList.add('hidden');
      connectionModal.style.display = 'none';
    }
    
    this.connectionPersonA = null;
    this.connectionPersonB = null;
  }

  handleConnectionChoice(relationship) {
    if (!this.connectionPersonA || !this.connectionPersonB) {
      this.closeConnectionModal();
      return;
    }
    
    const personAData = this.getPersonData(this.connectionPersonA);
    const personBData = this.getPersonData(this.connectionPersonB);
    
    const connectionKey = this.getConnectionKey(this.connectionPersonA, this.connectionPersonB);
    if (this.hiddenConnections.has(connectionKey)) {
      this.hiddenConnections.delete(connectionKey);
      console.log(`Removed hidden connection between ${this.connectionPersonA} and ${this.connectionPersonB} - new connection will be visible`);
    }
    
    if (relationship === 'line-only') {
      const connectionKey = this.getConnectionKey(this.connectionPersonA, this.connectionPersonB);
      this.lineOnlyConnections.add(connectionKey);
      console.log(`Added line-only connection: ${connectionKey}`);
      
      this.regenerateConnections();
      this.pushUndoState();
      console.log(`Created line-only connection between ${this.connectionPersonA} and ${this.connectionPersonB}`);
      this.closeConnectionModal();
      return;
    }
    
    switch (relationship) {
      case 'mother':
        this.clearExistingRelationships(this.connectionPersonA, this.connectionPersonB);
        if (personBData.motherId && personBData.motherId !== this.connectionPersonA) {
          console.log(`Removing previous mother relationship: ${personBData.motherId}`);
        }
        personBData.motherId = this.connectionPersonA;
        break;
        
      case 'father':
        this.clearExistingRelationships(this.connectionPersonA, this.connectionPersonB);
        if (personBData.fatherId && personBData.fatherId !== this.connectionPersonA) {
          console.log(`Removing previous father relationship: ${personBData.fatherId}`);
        }
        personBData.fatherId = this.connectionPersonA;
        break;
        
      case 'child':
        this.clearExistingRelationships(this.connectionPersonA, this.connectionPersonB);
        if (personBData.gender === 'male') {
          if (personAData.fatherId && personAData.fatherId !== this.connectionPersonB) {
            console.log(`Removing previous father relationship: ${personAData.fatherId}`);
          }
          personAData.fatherId = this.connectionPersonB;
        } else if (personBData.gender === 'female') {
          if (personAData.motherId && personAData.motherId !== this.connectionPersonB) {
            console.log(`Removing previous mother relationship: ${personAData.motherId}`);
          }
          personAData.motherId = this.connectionPersonB;
        } else {
          alert('Parent gender must be specified to create parent-child relationship.');
          return;
        }
        break;
        
      case 'spouse':
        this.clearExistingRelationships(this.connectionPersonA, this.connectionPersonB);
        if (personAData.spouseId && personAData.spouseId !== this.connectionPersonB) {
          console.log(`Removing previous spouse relationship for A: ${personAData.spouseId}`);
          const oldSpouseAData = this.getPersonData(personAData.spouseId);
          if (oldSpouseAData.spouseId === this.connectionPersonA) {
            oldSpouseAData.spouseId = '';
            this.personData.set(personAData.spouseId, oldSpouseAData);
          }
        }
        if (personBData.spouseId && personBData.spouseId !== this.connectionPersonA) {
          console.log(`Removing previous spouse relationship for B: ${personBData.spouseId}`);
          const oldSpouseBData = this.getPersonData(personBData.spouseId);
          if (oldSpouseBData.spouseId === this.connectionPersonB) {
            oldSpouseBData.spouseId = '';
            this.personData.set(personBData.spouseId, oldSpouseBData);
          }
        }
        
        personAData.spouseId = this.connectionPersonB;
        personBData.spouseId = this.connectionPersonA;
        break;
    }
    
    this.cleanupPersonData(personAData);
    this.cleanupPersonData(personBData);
    
    this.personData.set(this.connectionPersonA, personAData);
    this.personData.set(this.connectionPersonB, personBData);
    
    this.regenerateConnections();
    this.pushUndoState();
    
    console.log(`Connected ${this.connectionPersonA} and ${this.connectionPersonB} as ${relationship}`);
    
    this.closeConnectionModal();
  }

  clearExistingRelationships(personAId, personBId) {
    const personAData = this.getPersonData(personAId);
    const personBData = this.getPersonData(personBId);
    
    if (personAData.motherId === personBId) {
      delete personAData.motherId;
      console.log(`Cleared mother relationship: ${personAId} -> ${personBId}`);
    }
    if (personAData.fatherId === personBId) {
      delete personAData.fatherId;
      console.log(`Cleared father relationship: ${personAId} -> ${personBId}`);
    }
    if (personAData.spouseId === personBId) {
      delete personAData.spouseId;
      console.log(`Cleared spouse relationship: ${personAId} -> ${personBId}`);
    }
    
    if (personBData.motherId === personAId) {
      delete personBData.motherId;
      console.log(`Cleared mother relationship: ${personBId} -> ${personAId}`);
    }
    if (personBData.fatherId === personAId) {
      delete personBData.fatherId;
      console.log(`Cleared father relationship: ${personBId} -> ${personAId}`);
    }
    if (personBData.spouseId === personAId) {
      delete personBData.spouseId;
      console.log(`Cleared spouse relationship: ${personBId} -> ${personAId}`);
    }
    
    const connectionKey = this.getConnectionKey(personAId, personBId);
    if (this.lineOnlyConnections.has(connectionKey)) {
      this.lineOnlyConnections.delete(connectionKey);
      console.log(`Cleared line-only connection: ${connectionKey}`);
    }
    
    this.personData.set(personAId, personAData);
    this.personData.set(personBId, personBData);
  }

  cleanupPersonData(personData) {
    Object.keys(personData).forEach(key => {
      if (personData[key] === '' || personData[key] === null || personData[key] === undefined) {
        delete personData[key];
      }
    });
  }

  getPersonDisplayName(personId) {
    const data = this.getPersonData(personId);
    const node = this.renderer.nodes.get(personId);
    
    if (node) {
      return `${node.name} ${node.surname}`.trim();
    }
    
    return personId;
  }

  regenerateConnections() {
    this.renderer.clearConnections();
    
    for (const [childId, childData] of (this.personData || new Map())) {
      if (childData.motherId) {
        const connectionKey = this.getConnectionKey(childId, childData.motherId);
        if (!this.hiddenConnections.has(connectionKey)) {
          this.renderer.addConnection(childId, childData.motherId, 'parent');
        }
      }
      if (childData.fatherId) {
        const connectionKey = this.getConnectionKey(childId, childData.fatherId);
        if (!this.hiddenConnections.has(connectionKey)) {
          this.renderer.addConnection(childId, childData.fatherId, 'parent');
        }
      }
      if (childData.spouseId) {
        if (childId < childData.spouseId) {
          const connectionKey = this.getConnectionKey(childId, childData.spouseId);
          if (!this.hiddenConnections.has(connectionKey)) {
            this.renderer.addConnection(childId, childData.spouseId, 'spouse');
          }
        }
      }
    }
    
    for (const connectionKey of this.lineOnlyConnections) {
      if (!this.hiddenConnections.has(connectionKey)) {
        const [id1, id2] = connectionKey.split('-');
        this.renderer.addConnection(id1, id2, 'line-only');
      }
    }
  }

  getConnectionKey(id1, id2) {
    return id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;
  }

  // Selection management
  updateActionButtons() {
    this.selectedCircles = this.renderer.getSelectedNodes();
    
    const hasSelection = this.selectedCircles.size > 0;
    const canConnect = this.selectedCircles.size === 2;
    
    const floatingButtons = document.querySelector('.floating-buttons');
    if (!floatingButtons) return;
    
    if (hasSelection) {
      floatingButtons.classList.add('expanded');
      
      if (this.connectBtn) {
        if (canConnect) {
          this.connectBtn.classList.remove('hidden');
          this.connectBtn.style.display = 'flex';
        } else {
          this.connectBtn.classList.add('hidden');
          this.connectBtn.style.display = 'none';
        }
      }
      
      if (this.styleBtn) {
        this.styleBtn.classList.remove('hidden');
        this.styleBtn.style.display = 'flex';
      }
    } else {
      floatingButtons.classList.remove('expanded');
      
      if (this.connectBtn) {
        this.connectBtn.classList.add('hidden');
        this.connectBtn.style.display = 'none';
      }
      
      if (this.styleBtn) {
        this.styleBtn.classList.add('hidden');
        this.styleBtn.style.display = 'none';
      }
    }
  }

  clearSelection() {
    this.selectedCircles.clear();
    this.renderer.clearSelection();
    this.updateActionButtons();
    console.log('Selection cleared and UI updated');
  }

  deleteSelected() {
    this.selectedCircles = this.renderer.getSelectedNodes();
    
    if (this.selectedCircles.size === 0) return;
    
    const count = this.selectedCircles.size;
    if (!confirm(`Delete ${count} selected person(s)?`)) return;
    
    for (const id of this.selectedCircles) {
      this.renderer.removeNode(id);
      this.personData?.delete(id);
    }
    
    this.clearSelection();
    this.regenerateConnections();
    this.pushUndoState();
  }

  // Style modal methods
  openStyleModal() {
    this.selectedCircles = this.renderer.getSelectedNodes();
    
    if (this.selectedCircles.size === 0) {
      alert('Please select at least one circle to style.');
      return;
    }
    
    const styleModal = document.getElementById('styleModal');
    if (!styleModal) return;
    
    const firstSelectedId = Array.from(this.selectedCircles)[0];
    const firstNode = this.renderer.nodes.get(firstSelectedId);
    
    if (firstNode) {
      document.getElementById('selectedNodeColor').value = firstNode.color || this.defaultColor;
      document.getElementById('selectedNodeSize').value = firstNode.radius || this.nodeRadius;
    }
    
    styleModal.classList.remove('hidden');
    styleModal.style.display = 'flex';
  }

  applySelectedStyles() {
    this.selectedCircles = this.renderer.getSelectedNodes();
    
    const color = document.getElementById('selectedNodeColor').value;
    const size = parseInt(document.getElementById('selectedNodeSize').value, 10);
    
    if (isNaN(size) || size <= 0) {
      alert('Please enter a valid size.');
      return;
    }
    
    console.log('Applying styles to selected nodes:', Array.from(this.selectedCircles));
    console.log('New color:', color, 'New size:', size);
    
    for (const id of this.selectedCircles) {
      this.renderer.updateNodeStyle(id, {
        color: color,
        radius: size
      });
    }
    
    this.pushUndoState();
    this.closeStyleModal();
    
    console.log('Styles applied successfully');
  }

  closeStyleModal() {
    const styleModal = document.getElementById('styleModal');
    if (styleModal) {
      styleModal.classList.add('hidden');
      styleModal.style.display = 'none';
    }
  }

  // Undo/Redo
  pushUndoState() {
    const state = {
      nodes: new Map(),
      personData: new Map(this.personData || []),
      camera: this.renderer.getCamera(),
      hiddenConnections: new Set(this.hiddenConnections),
      lineOnlyConnections: new Set(this.lineOnlyConnections),
      displayPreferences: { ...this.displayPreferences }, // Include display preferences
      nodeStyle: this.nodeStyle // Include node style
    };
    
    for (const [id, node] of this.renderer.nodes) {
      state.nodes.set(id, { ...node });
    }
    
    this.undoStack.push(state);
    if (this.undoStack.length > this.maxUndoSize) {
      this.undoStack.shift();
    }
    
    this.redoStack = [];
  }

  undo() {
    if (this.undoStack.length < 2) return;
    
    const current = this.undoStack.pop();
    this.redoStack.push(current);
    
    const previous = this.undoStack[this.undoStack.length - 1];
    this.restoreState(previous);
  }

  redo() {
    if (this.redoStack.length === 0) return;
    
    const next = this.redoStack.pop();
    this.undoStack.push(next);
    this.restoreState(next);
  }

  restoreState(state) {
    this.renderer.nodes.clear();
    
    for (const [id, node] of state.nodes) {
      this.renderer.setNode(id, { ...node });
    }
    
    this.personData = new Map(state.personData);
    this.hiddenConnections = new Set(state.hiddenConnections || []);
    this.lineOnlyConnections = new Set(state.lineOnlyConnections || []);
    
    // Restore display preferences
    if (state.displayPreferences) {
      this.displayPreferences = { ...state.displayPreferences };
      // Update UI checkboxes
      Object.keys(this.displayPreferences).forEach(key => {
        const checkbox = document.getElementById(key);
        if (checkbox) {
          checkbox.checked = this.displayPreferences[key];
        }
      });
    }
    
    // Restore node style
    if (state.nodeStyle) {
      this.nodeStyle = state.nodeStyle;
    }
    
    if (state.camera) {
      this.renderer.setCamera(state.camera.x, state.camera.y, state.camera.scale);
    }
    
    this.regenerateConnections();
    this.clearSelection();
  }

  // Enhanced Save/Load JSON with maiden name and display preferences
  saveToJSON() {
    const data = {
      version: '2.3', // Increment version for maiden name feature
      settings: {
        nodeRadius: this.nodeRadius,
        defaultColor: this.defaultColor,
        fontFamily: this.fontFamily,
        fontSize: this.fontSize,
        nameColor: this.nameColor,
        dateColor: this.dateColor
      },
      displayPreferences: { ...this.displayPreferences }, // Include display preferences
      nodeStyle: this.nodeStyle, // Include node style
      camera: this.renderer.getCamera(),
      hiddenConnections: Array.from(this.hiddenConnections),
      lineOnlyConnections: Array.from(this.lineOnlyConnections),
      persons: []
    };
    
    for (const [id, node] of this.renderer.nodes) {
      const personData = this.personData?.get(id) || {};
      data.persons.push({
        id,
        x: node.x,
        y: node.y,
        color: node.color,
        radius: node.radius,
        ...personData
      });
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'family_tree_canvas.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  loadFromJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        this.processLoadedData(data);
      } catch (error) {
        console.error('Error parsing JSON:', error);
        alert('Error loading file: Invalid JSON format');
      }
    };
    reader.readAsText(file);
  }

  processLoadedData(data) {
    this.renderer.nodes.clear();
    this.renderer.clearConnections();
    this.personData = new Map();
    this.hiddenConnections = new Set();
    this.lineOnlyConnections = new Set();
    
    if (data.settings) {
      this.nodeRadius = data.settings.nodeRadius || this.nodeRadius;
      this.defaultColor = data.settings.defaultColor || this.defaultColor;
      this.fontFamily = data.settings.fontFamily || this.fontFamily;
      this.fontSize = data.settings.fontSize || this.fontSize;
      this.nameColor = data.settings.nameColor || this.nameColor;
      this.dateColor = data.settings.dateColor || this.dateColor;
      this.updateRendererSettings();
    }
    
    // Restore display preferences
    if (data.displayPreferences) {
      this.displayPreferences = { ...data.displayPreferences };
      // Update UI checkboxes
      Object.keys(this.displayPreferences).forEach(key => {
        const checkbox = document.getElementById(key);
        if (checkbox) {
          checkbox.checked = this.displayPreferences[key];
        }
      });
    }
    
    // Restore node style
    if (data.nodeStyle) {
      this.nodeStyle = data.nodeStyle;
    }
    
    if (data.camera) {
      this.renderer.setCamera(data.camera.x, data.camera.y, data.camera.scale);
    }
    
    if (data.hiddenConnections) {
      this.hiddenConnections = new Set(data.hiddenConnections);
    }
    
    if (data.lineOnlyConnections) {
      this.lineOnlyConnections = new Set(data.lineOnlyConnections);
    }
    
    let maxId = 0;
    for (const person of data.persons) {
      const nodeData = {
        x: person.x || person.cx || 0,
        y: person.y || person.cy || 0,
        name: person.name,
        fatherName: person.fatherName || '',
        surname: person.surname,
        maidenName: person.maidenName || person.birthName || '', // Support both for backward compatibility
        dob: person.dob,
        gender: person.gender,
        color: person.color || person.nodeColor || this.defaultColor,
        radius: person.radius || person.nodeSize || this.nodeRadius
      };
      
      this.renderer.setNode(person.id, nodeData);
      
      this.personData.set(person.id, {
        name: person.name,
        fatherName: person.fatherName || '',
        surname: person.surname,
        maidenName: person.maidenName || person.birthName || '', // Support both for backward compatibility
        dob: person.dob,
        gender: person.gender,
        motherId: person.motherId,
        fatherId: person.fatherId,
        spouseId: person.spouseId
      });
      
      const numId = parseInt(person.id.replace('p', ''));
      if (!isNaN(numId) && numId > maxId) {
        maxId = numId;
      }
    }
    
    this.nextId = maxId + 1;
    
    this.regenerateConnections();
    
    this.undoStack = [];
    this.redoStack = [];
    this.pushUndoState();
    
    alert('Family tree loaded successfully');
  }
}

// Create and export instance
export const treeCore = new TreeCoreCanvas();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  treeCore.initialize();
});

// Also export for compatibility
export function pushUndoState() {
  treeCore.pushUndoState();
}

export function generateAllConnections() {
  treeCore.regenerateConnections();
}
