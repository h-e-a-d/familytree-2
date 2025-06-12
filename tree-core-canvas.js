// tree-core-canvas.js - Fixed style modal and button issues

import { CanvasRenderer } from './canvas-renderer.js';
import { openModalForEdit, closeModal } from './modal.js';
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
    this.hiddenConnections = new Set(); // Track hidden connections
    this.lineOnlyConnections = new Set(); // Track line-only connections
    
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
    
    // FIXED: Add callback for when selection is cleared
    this.renderer.onSelectionCleared = () => {
      this.handleSelectionCleared();
    };

    // Add callback for connection line clicks
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
    this.setupStyleModal(); // FIXED: Add style modal setup
    this.setupLineRemovalModal(); // Add line removal modal setup
    this.setupViewSwitching(); // FIXED: Add view switching handler
    
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

  // FIXED: Add view switching handler to ensure canvas redraws properly
  setupViewSwitching() {
    const viewToggle = document.getElementById('viewToggle');
    if (viewToggle) {
      // Listen for the app.js view switching and handle canvas redraw
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const graphicView = document.getElementById('graphicView');
            const tableView = document.getElementById('tableView');
            
            // Check if we switched to graphic view
            if (graphicView && !graphicView.classList.contains('hidden') && 
                tableView && tableView.classList.contains('hidden')) {
              // Delay to ensure the view is fully visible
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
      
      // Observe changes to the graphic view
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
    // The canvas renderer now handles selection directly
    // We just need to sync our selectedCircles set with the renderer's selection
    this.selectedCircles = this.renderer.getSelectedNodes();
    this.updateActionButtons();
  }

  // FIXED: Handle when selection is cleared by clicking empty space
  handleSelectionCleared() {
    this.selectedCircles.clear();
    this.updateActionButtons();
  }

  // Handle connection line clicks
  handleConnectionClick(connection, index) {
    console.log('Connection line clicked:', connection);
    this.currentConnectionToRemove = { connection, index };
    this.openLineRemovalModal(connection);
  }

  setupButtons() {
    // Get buttons
    this.addPersonBtn = document.getElementById('addPersonBtn');
    this.connectBtn = document.getElementById('connectBtn');
    this.styleBtn = document.getElementById('styleBtn');
    this.undoBtn = document.getElementById('undoBtn');

    // Add person button
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

    // Undo button
    if (this.undoBtn) {
      this.undoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.undo();
      });
    }

    // Connect button
    if (this.connectBtn) {
      this.connectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleConnectSelected();
      });
    }

    // Style button
    if (this.styleBtn) {
      this.styleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openStyleModal();
      });
    }
    
    // Connection modal buttons
    this.setupConnectionModal();
  }

  // FIXED: Add style modal setup with proper event listeners
  setupStyleModal() {
    const styleModal = document.getElementById('styleModal');
    const cancelBtn = document.getElementById('cancelStyleModal');
    const applyBtn = document.getElementById('applySelectedStyle');

    // Cancel button event listener
    if (cancelBtn) {
      cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.closeStyleModal();
      });
    }

    // Apply button event listener
    if (applyBtn) {
      applyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.applySelectedStyles();
      });
    }

    // Close modal when clicking outside
    if (styleModal) {
      styleModal.addEventListener('click', (e) => {
        if (e.target === styleModal) {
          this.closeStyleModal();
        }
      });
    }

    // Prevent modal content clicks from closing modal
    const modalContent = styleModal?.querySelector('.modal-content');
    if (modalContent) {
      modalContent.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
  }

  // Setup line removal modal
  setupLineRemovalModal() {
    // Create modal if it doesn't exist
    this.createLineRemovalModal();
    
    const lineRemovalModal = document.getElementById('lineRemovalModal');
    const cancelBtn = document.getElementById('cancelLineRemoval');
    const confirmBtn = document.getElementById('confirmLineRemoval');

    // Cancel button event listener
    if (cancelBtn) {
      cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.closeLineRemovalModal();
      });
    }

    // Confirm button event listener
    if (confirmBtn) {
      confirmBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.confirmLineRemoval();
      });
    }

    // Close modal when clicking outside
    if (lineRemovalModal) {
      lineRemovalModal.addEventListener('click', (e) => {
        if (e.target === lineRemovalModal) {
          this.closeLineRemovalModal();
        }
      });
    }

    // Prevent modal content clicks from closing modal
    const modalContent = lineRemovalModal?.querySelector('.modal-content');
    if (modalContent) {
      modalContent.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
  }

  // Create line removal modal dynamically
  createLineRemovalModal() {
    // Check if modal already exists
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

  // Open line removal modal
  openLineRemovalModal(connection) {
    const lineRemovalModal = document.getElementById('lineRemovalModal');
    if (!lineRemovalModal) return;
    
    lineRemovalModal.classList.remove('hidden');
    lineRemovalModal.style.display = 'flex';
  }

  // Close line removal modal
  closeLineRemovalModal() {
    const lineRemovalModal = document.getElementById('lineRemovalModal');
    if (lineRemovalModal) {
      lineRemovalModal.classList.add('hidden');
      lineRemovalModal.style.display = 'none';
    }
    
    this.currentConnectionToRemove = null;
  }

  // Confirm line removal
  confirmLineRemoval() {
    if (!this.currentConnectionToRemove) {
      this.closeLineRemovalModal();
      return;
    }

    const { connection, index } = this.currentConnectionToRemove;
    
    // Add this connection to the hidden connections set
    const connectionKey = this.getConnectionKey(connection.from, connection.to);
    this.hiddenConnections.add(connectionKey);
    
    // Remove the visual connection line
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
    const lineOnlyBtn = document.getElementById('lineOnlyBtn'); // FIXED: Add line only button

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

    // FIXED: Add event listener for "Line only" button
    if (lineOnlyBtn) {
      lineOnlyBtn.addEventListener('click', () => this.handleConnectionChoice('line-only'));
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
    // For now, export will create a temporary SVG for compatibility
    // In production, you'd implement direct canvas export
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
    // Create a temporary canvas with white background
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCanvas.width = this.renderer.canvas.width;
    tempCanvas.height = this.renderer.canvas.height;
    
    // White background
    tempCtx.fillStyle = 'white';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Copy the renderer canvas
    tempCtx.drawImage(this.renderer.canvas, 0, 0);
    
    // Download
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

  // Person management
  savePersonFromModal() {
    const nameInput = document.getElementById('personName').value.trim();
    const fatherNameInput = document.getElementById('personFatherName').value.trim();
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
    
    const personData = {
      name: nameInput,
      fatherName: fatherNameInput,
      surname: surnameInput,
      birthName: birthNameInput,
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
      
      // Update searchable selects
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
    
    // Random position near center
    const centerX = this.renderer.canvas.width / 2 / this.renderer.dpr;
    const centerY = this.renderer.canvas.height / 2 / this.renderer.dpr;
    
    const nodeData = {
      x: centerX + (Math.random() - 0.5) * 200,
      y: centerY + (Math.random() - 0.5) * 200,
      ...data
    };
    
    // Store additional data separately
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
    
    // Update stored data
    if (!this.personData) {
      this.personData = new Map();
    }
    this.personData.set(id, { ...data });
    
    this.renderer.setNode(id, nodeData);
  }

  getPersonData(id) {
    return this.personData?.get(id) || {};
  }

  // Connection management
  handleConnectSelected() {
    // Sync with renderer's selection
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
    
    // FIXED: Remove any hidden connection between these people when creating new connections
    const connectionKey = this.getConnectionKey(this.connectionPersonA, this.connectionPersonB);
    if (this.hiddenConnections.has(connectionKey)) {
      this.hiddenConnections.delete(connectionKey);
      console.log(`Removed hidden connection between ${this.connectionPersonA} and ${this.connectionPersonB} - new connection will be visible`);
    }
    
    // FIXED: Handle "Line only" option
    if (relationship === 'line-only') {
      // Create a line-only connection without any relationship data
      const connectionKey = this.getConnectionKey(this.connectionPersonA, this.connectionPersonB);
      this.lineOnlyConnections.add(connectionKey);
      console.log(`Added line-only connection: ${connectionKey}`);
      
      this.regenerateConnections();
      this.pushUndoState();
      console.log(`Created line-only connection between ${this.connectionPersonA} and ${this.connectionPersonB}`);
      this.closeConnectionModal();
      return;
    }
    
    // FIXED: Clear ALL conflicting relationships before setting new ones
    switch (relationship) {
      case 'mother':
        // FIXED: Clear any existing relationships between these two people first
        this.clearExistingRelationships(this.connectionPersonA, this.connectionPersonB);
        
        // Remove any existing mother relationship for personB
        if (personBData.motherId && personBData.motherId !== this.connectionPersonA) {
          console.log(`Removing previous mother relationship: ${personBData.motherId}`);
        }
        personBData.motherId = this.connectionPersonA;
        break;
        
      case 'father':
        // FIXED: Clear any existing relationships between these two people first
        this.clearExistingRelationships(this.connectionPersonA, this.connectionPersonB);
        
        // Remove any existing father relationship for personB
        if (personBData.fatherId && personBData.fatherId !== this.connectionPersonA) {
          console.log(`Removing previous father relationship: ${personBData.fatherId}`);
        }
        personBData.fatherId = this.connectionPersonA;
        break;
        
      case 'child':
        // FIXED: Clear any existing relationships between these two people first
        this.clearExistingRelationships(this.connectionPersonA, this.connectionPersonB);
        
        if (personBData.gender === 'male') {
          // PersonB is male, so becomes father of personA
          // Remove any existing father relationship for personA
          if (personAData.fatherId && personAData.fatherId !== this.connectionPersonB) {
            console.log(`Removing previous father relationship: ${personAData.fatherId}`);
          }
          personAData.fatherId = this.connectionPersonB;
        } else if (personBData.gender === 'female') {
          // PersonB is female, so becomes mother of personA
          // Remove any existing mother relationship for personA
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
        // FIXED: Clear any existing relationships between these two people first
        this.clearExistingRelationships(this.connectionPersonA, this.connectionPersonB);
        
        // Remove any existing spouse relationships for both persons
        if (personAData.spouseId && personAData.spouseId !== this.connectionPersonB) {
          console.log(`Removing previous spouse relationship for A: ${personAData.spouseId}`);
          // Also remove the reverse relationship
          const oldSpouseAData = this.getPersonData(personAData.spouseId);
          if (oldSpouseAData.spouseId === this.connectionPersonA) {
            oldSpouseAData.spouseId = '';
            this.personData.set(personAData.spouseId, oldSpouseAData);
          }
        }
        if (personBData.spouseId && personBData.spouseId !== this.connectionPersonA) {
          console.log(`Removing previous spouse relationship for B: ${personBData.spouseId}`);
          // Also remove the reverse relationship
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
    
    // FIXED: Clean up empty relationship fields
    this.cleanupPersonData(personAData);
    this.cleanupPersonData(personBData);
    
    // Update stored data
    this.personData.set(this.connectionPersonA, personAData);
    this.personData.set(this.connectionPersonB, personBData);
    
    this.regenerateConnections();
    this.pushUndoState();
    
    console.log(`Connected ${this.connectionPersonA} and ${this.connectionPersonB} as ${relationship}`);
    
    this.closeConnectionModal();
  }

  // FIXED: Helper method to clear existing relationships between two specific people
  clearExistingRelationships(personAId, personBId) {
    const personAData = this.getPersonData(personAId);
    const personBData = this.getPersonData(personBId);
    
    // Clear A -> B relationships
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
    
    // Clear B -> A relationships
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
    
    // FIXED: Also remove any line-only connections between these people
    const connectionKey = this.getConnectionKey(personAId, personBId);
    if (this.lineOnlyConnections.has(connectionKey)) {
      this.lineOnlyConnections.delete(connectionKey);
      console.log(`Cleared line-only connection: ${connectionKey}`);
    }
    
    // Update the data
    this.personData.set(personAId, personAData);
    this.personData.set(personBId, personBData);
  }

  // FIXED: Helper method to clean up empty relationship fields
  cleanupPersonData(personData) {
    // Remove empty string values to keep data clean
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
    
    // Regenerate all connections based on stored data, but respect hidden connections
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
        // Only add spouse connection once
        if (childId < childData.spouseId) {
          const connectionKey = this.getConnectionKey(childId, childData.spouseId);
          if (!this.hiddenConnections.has(connectionKey)) {
            this.renderer.addConnection(childId, childData.spouseId, 'spouse');
          }
        }
      }
    }
    
    // FIXED: Add line-only connections
    for (const connectionKey of this.lineOnlyConnections) {
      if (!this.hiddenConnections.has(connectionKey)) {
        const [id1, id2] = connectionKey.split('-');
        // Add as a generic connection (will be drawn as a regular line)
        this.renderer.addConnection(id1, id2, 'line-only');
      }
    }
  }

  // Generate a unique key for a connection (order-independent)
  getConnectionKey(id1, id2) {
    return id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;
  }

  // Selection management
  updateActionButtons() {
    // Sync with renderer's selection
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
    // Sync with renderer's selection
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

  // FIXED: Style modal methods
  openStyleModal() {
    // Sync with renderer's selection
    this.selectedCircles = this.renderer.getSelectedNodes();
    
    if (this.selectedCircles.size === 0) {
      alert('Please select at least one circle to style.');
      return;
    }
    
    const styleModal = document.getElementById('styleModal');
    if (!styleModal) return;
    
    // Pre-populate with current values from first selected
    const firstSelectedId = Array.from(this.selectedCircles)[0];
    const firstNode = this.renderer.nodes.get(firstSelectedId);
    
    if (firstNode) {
      document.getElementById('selectedNodeColor').value = firstNode.color || this.defaultColor;
      document.getElementById('selectedNodeSize').value = firstNode.radius || this.nodeRadius;
    }
    
    styleModal.classList.remove('hidden');
    styleModal.style.display = 'flex';
  }

  // FIXED: Use updateNodeStyle instead of setNode to prevent data loss
  applySelectedStyles() {
    // Sync with renderer's selection
    this.selectedCircles = this.renderer.getSelectedNodes();
    
    const color = document.getElementById('selectedNodeColor').value;
    const size = parseInt(document.getElementById('selectedNodeSize').value, 10);
    
    if (isNaN(size) || size <= 0) {
      alert('Please enter a valid size.');
      return;
    }
    
    console.log('Applying styles to selected nodes:', Array.from(this.selectedCircles));
    console.log('New color:', color, 'New size:', size);
    
    // FIXED: Use the new updateNodeStyle method instead of setNode
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

  // FIXED: Add closeStyleModal method
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
      hiddenConnections: new Set(this.hiddenConnections), // Include hidden connections
      lineOnlyConnections: new Set(this.lineOnlyConnections) // Include line-only connections
    };
    
    // Deep copy nodes
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
    // Clear current nodes
    this.renderer.nodes.clear();
    
    // Restore nodes
    for (const [id, node] of state.nodes) {
      this.renderer.setNode(id, { ...node });
    }
    
    // Restore person data
    this.personData = new Map(state.personData);
    
    // Restore hidden connections
    this.hiddenConnections = new Set(state.hiddenConnections || []);
    
    // Restore line-only connections
    this.lineOnlyConnections = new Set(state.lineOnlyConnections || []);
    
    // Restore camera
    if (state.camera) {
      this.renderer.setCamera(state.camera.x, state.camera.y, state.camera.scale);
    }
    
    // Regenerate connections
    this.regenerateConnections();
    
    // Clear selection
    this.clearSelection();
  }

  // Save/Load JSON
  saveToJSON() {
    const data = {
      version: '2.2', // Increment version for line-only connections feature
      settings: {
        nodeRadius: this.nodeRadius,
        defaultColor: this.defaultColor,
        fontFamily: this.fontFamily,
        fontSize: this.fontSize,
        nameColor: this.nameColor,
        dateColor: this.dateColor
      },
      camera: this.renderer.getCamera(),
      hiddenConnections: Array.from(this.hiddenConnections), // Include hidden connections
      lineOnlyConnections: Array.from(this.lineOnlyConnections), // Include line-only connections
      persons: []
    };
    
    // Export person data
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
    // Clear current data
    this.renderer.nodes.clear();
    this.renderer.clearConnections();
    this.personData = new Map();
    this.hiddenConnections = new Set(); // Clear hidden connections
    this.lineOnlyConnections = new Set(); // Clear line-only connections
    
    // Restore settings
    if (data.settings) {
      this.nodeRadius = data.settings.nodeRadius || this.nodeRadius;
      this.defaultColor = data.settings.defaultColor || this.defaultColor;
      this.fontFamily = data.settings.fontFamily || this.fontFamily;
      this.fontSize = data.settings.fontSize || this.fontSize;
      this.nameColor = data.settings.nameColor || this.nameColor;
      this.dateColor = data.settings.dateColor || this.dateColor;
      this.updateRendererSettings();
    }
    
    // Restore camera
    if (data.camera) {
      this.renderer.setCamera(data.camera.x, data.camera.y, data.camera.scale);
    }
    
    // Restore hidden connections
    if (data.hiddenConnections) {
      this.hiddenConnections = new Set(data.hiddenConnections);
    }
    
    // Restore line-only connections
    if (data.lineOnlyConnections) {
      this.lineOnlyConnections = new Set(data.lineOnlyConnections);
    }
    
    // Restore persons
    let maxId = 0;
    for (const person of data.persons) {
      const nodeData = {
        x: person.x || person.cx || 0, // Support old format
        y: person.y || person.cy || 0,
        name: person.name,
        fatherName: person.fatherName || '',
        surname: person.surname,
        birthName: person.birthName,
        dob: person.dob,
        gender: person.gender,
        color: person.color || person.nodeColor || this.defaultColor,
        radius: person.radius || person.nodeSize || this.nodeRadius
      };
      
      this.renderer.setNode(person.id, nodeData);
      
      // Store person data
      this.personData.set(person.id, {
        name: person.name,
        fatherName: person.fatherName || '',
        surname: person.surname,
        birthName: person.birthName,
        dob: person.dob,
        gender: person.gender,
        motherId: person.motherId,
        fatherId: person.fatherId,
        spouseId: person.spouseId
      });
      
      // Track max ID
      const numId = parseInt(person.id.replace('p', ''));
      if (!isNaN(numId) && numId > maxId) {
        maxId = numId;
      }
    }
    
    this.nextId = maxId + 1;
    
    // Regenerate connections (will respect hidden connections and include line-only connections)
    this.regenerateConnections();
    
    // Clear history
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