// tree-core-canvas.js - ENHANCED: Complete version with all UI improvements

import { CanvasRenderer } from './canvas-renderer.js';
import { openModalForEdit, closeModal, getSelectedGender } from './modal.js';
import { rebuildTableView } from './table.js';
import { exportTree, exportGEDCOM, exportCanvasPDF } from './exporter.js';
import { notifications } from './notifications.js';
import { UndoRedoManager } from './core-undoRedo.js';
import { CacheManager } from './core-cache.js';
import { setupButtons } from './ui-buttons.js';
import { setupSettings } from './ui-settings.js';
import { setupModals } from './ui-modals.js';
import { setupExport } from './core-export.js';

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
    this.editBtn = null;
    this.styleBtn = null;
    this.undoSidebarBtn = null;
    this.redoSidebarBtn = null;
    this.bringFrontBtn = null; // ENHANCED: Add bring to front button
    
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
    
    // ENHANCED: Enhanced caching system
    this.cacheKey = 'familyTreeCanvas_state';
    this.autoSaveInterval = 30000; // Auto-save every 30 seconds
    this.autoSaveTimer = null;
    this.lastSaveTime = null;
    this.cacheVersion = '2.6'; // Incremented for enhanced caching
    
    // ENHANCED: Enhanced cache indicator
    this.enhancedCacheIndicator = null;
    this.undoRedoManager = null;
    this.cacheManager = null;
  }

  initialize() {
    console.log('=== TREE CORE INITIALIZATION DEBUG ===');
    console.log('Starting TreeCoreCanvas initialization...');
    
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
    console.log('Renderer created:', !!this.renderer);
    
    // Set up event handlers
    this.renderer.onNodeClick = (nodeId, event) => {
      this.handleNodeClick(nodeId, event);
    };
    
    this.renderer.onNodeDoubleClick = (nodeId) => {
      console.log('Double-clicked node:', nodeId);
      openModalForEdit(nodeId);
    };
    
    this.renderer.onNodeDragEnd = (nodeId) => {
      this.regenerateConnections();
      this.undoRedoManager.pushUndoState(); // Save state for undo
      this.autoSave(); // Auto-save after drag
    };
    
    this.renderer.onSelectionCleared = () => {
      this.handleSelectionCleared();
    };

    this.renderer.onConnectionClick = (connection, index) => {
      this.handleConnectionClick(connection, index);
    };
    
    console.log('Event handlers set up');
    console.log('Renderer state after setup:', {
      renderer: !!this.renderer,
      nodes: this.renderer.nodes?.size || 0
    });
    console.log('=== END TREE CORE INITIALIZATION DEBUG ===');
    
    // Setup UI first
    setupButtons(this);
    
    // Setup clear all functionality
    this.setupClearAllFunctionality();
    setupSettings(this);
    setupModals(this);
    setupExport(this);
    
    // Apply settings to renderer after setupSettings has attached the method
    this.updateRendererSettings();
    
    // Setup form submit handler
    const personForm = document.getElementById('personForm');
    if (personForm) {
      personForm.addEventListener('submit', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.savePersonFromModal();
      });
    }
    
    // Listen for save person event from modal
    document.addEventListener('savePersonFromModal', (e) => {
      console.log('Received savePersonFromModal event', e.detail);
      this.handleSavePersonFromModal(e.detail);
    });
    
    // ENHANCED: Enhanced cache loading with better connection restoration
    this.loadCachedState().then((loaded) => {
      if (!loaded) {
        // No cached state found
      }
      
      // Initial state if nothing was loaded
      if (!this.personData || this.personData.size === 0) {
        this.pushUndoState();
      }
    });
    
    // ENHANCED: Initialize enhanced features
    setTimeout(() => {
      this.initializeEnhancedCacheIndicator();
      this.setupBringToFront();
      console.log('Enhanced UI features initialized');
    }, 1000);
    
    // Make globally accessible for debugging
    window.treeCore = this;
    
    this.undoRedoManager = new UndoRedoManager(this, notifications);
    
    // Initialize button states
    setTimeout(() => this.undoRedoManager.updateButtonStates(), 100);
    
    this.cacheManager = new CacheManager(this);
    this.cacheManager.setupCaching();
    
    console.log('TreeCoreCanvas initialization complete');
  }

  // ================== CENTER SELECTED NODE FUNCTIONALITY ==================

  centerSelectedNode(retryCount = 0) {
    const maxRetries = 5;
    
    if (!this.renderer) {
      if (retryCount < maxRetries) {
        console.log(`Renderer not ready for centering (attempt ${retryCount + 1}/${maxRetries}), retrying in 500ms...`);
        setTimeout(() => this.centerSelectedNode(retryCount + 1), 500);
        return;
      } else {
        notifications.error('Renderer Not Available', 'Canvas renderer is not initialized. Please wait for the family tree to load completely.');
        return;
      }
    }
    
    const selectedNodes = this.renderer.getSelectedNodes();
    
    if (selectedNodes.size === 0) {
      notifications.warning('No Selection', 'Please select a node to center');
      return;
    }
    
    if (selectedNodes.size > 1) {
      notifications.info('Multiple Selected', 'Centering on first selected node');
    }
    
    const firstSelectedId = Array.from(selectedNodes)[0];
    const node = this.renderer.nodes.get(firstSelectedId);
    
    if (!node) {
      notifications.error('Node Not Found', 'Selected node could not be found');
      return;
    }
    
    // Center the camera on the selected node
    this.centerOnNode(node);
    
    // Get person display name for notification
    const personData = this.getPersonData(firstSelectedId) || {};
    let displayName = node.name || personData.name || 'Unknown';
    if (node.surname || personData.surname) {
      displayName += ` ${node.surname || personData.surname}`;
    }
    
    notifications.success('Node Centered', `Centered on ${displayName}`);
    console.log('Centered on node:', firstSelectedId);
  }

  centerOnNode(node) {
    if (!this.renderer || !this.renderer.canvas) return;
    
    const canvas = this.renderer.canvas;
    const canvasWidth = canvas.width / this.renderer.dpr;
    const canvasHeight = canvas.height / this.renderer.dpr;
    
    // Calculate new camera position to center the node
    const targetScale = Math.max(this.renderer.camera.scale, 1); // Ensure readable zoom level
    const newCameraX = canvasWidth / 2 - node.x * targetScale;
    const newCameraY = canvasHeight / 2 - node.y * targetScale;
    
    // Animate to the new position
    this.animateCamera({
      x: newCameraX,
      y: newCameraY,
      scale: targetScale
    });
  }

  animateCamera(targetCamera) {
    if (!this.renderer) return;
    
    const startCamera = { ...this.renderer.camera };
    const duration = 800; // ms
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out cubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      
      // Interpolate camera position
      this.renderer.camera.x = startCamera.x + (targetCamera.x - startCamera.x) * eased;
      this.renderer.camera.y = startCamera.y + (targetCamera.y - startCamera.y) * eased;
      this.renderer.camera.scale = startCamera.scale + (targetCamera.scale - startCamera.scale) * eased;
      
      this.renderer.needsRedraw = true;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }

  // ================== CLEAR ALL FUNCTIONALITY ==================

  setupClearAllFunctionality() {
    console.log('Setting up clear all functionality...');
    
    const clearAllBtn = document.getElementById('clearAllBtn');
    const clearAllConfirmModal = document.getElementById('clearAllConfirmModal');
    const cancelClearAllBtn = document.getElementById('cancelClearAll');
    const confirmClearAllBtn = document.getElementById('confirmClearAll');
    
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        console.log('Clear all button clicked');
        this.openClearAllConfirmModal();
      });
      console.log('Clear all button setup complete');
    }
    
    if (cancelClearAllBtn) {
      cancelClearAllBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.closeClearAllConfirmModal();
      });
    }
    
    if (confirmClearAllBtn) {
      confirmClearAllBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.confirmClearAll();
      });
    }
    
    if (clearAllConfirmModal) {
      clearAllConfirmModal.addEventListener('click', (e) => {
        if (e.target === clearAllConfirmModal) {
          this.closeClearAllConfirmModal();
        }
      });
    }
    
    console.log('Clear all functionality setup complete');
  }

  openClearAllConfirmModal() {
    const clearAllConfirmModal = document.getElementById('clearAllConfirmModal');
    if (clearAllConfirmModal) {
      clearAllConfirmModal.classList.remove('hidden');
    }
  }

  closeClearAllConfirmModal() {
    const clearAllConfirmModal = document.getElementById('clearAllConfirmModal');
    if (clearAllConfirmModal) {
      clearAllConfirmModal.classList.add('hidden');
    }
  }

  confirmClearAll() {
    console.log('Confirming clear all operation');
    
    // Clear all data
    if (this.renderer) {
      this.renderer.nodes.clear();
      this.renderer.clearConnections();
      this.renderer.clearSelection();
      this.renderer.needsRedraw = true;
    }
    
    // Clear person data and other state
    this.personData = new Map();
    this.hiddenConnections = new Set();
    this.lineOnlyConnections = new Set();
    this.selectedCircles = new Set();
    this.nextId = 1;
    
    // Clear undo/redo stacks
    this.undoStack = [];
    this.redoStack = [];
    
    // Clear cache
    this.clearCache();
    
    // Update UI
    this.updateActionButtons();
    
    // Close modal
    this.closeClearAllConfirmModal();
    
    // Show notification
    notifications.success('All Data Cleared', 'Family tree has been completely cleared');
    
    // Push new empty state
    this.pushUndoState();
    
    console.log('All data cleared successfully');
  }

  // ================== ENHANCED: ENHANCED CACHING FUNCTIONALITY ==================

  setupCaching() {
    console.log('Setting up enhanced caching functionality...');
    
    // Start auto-save timer
    this.startAutoSave();
    
    // Save before page unload
    window.addEventListener('beforeunload', () => {
      this.saveToCache();
    });
    
    // Save when page becomes hidden (mobile/tab switching)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.saveToCache();
      }
    });
    
    // Add cache management UI
    this.addCacheManagementUI();
    
    console.log('Enhanced caching setup complete');
  }

  startAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    
    this.autoSaveTimer = setInterval(() => {
      this.autoSave();
    }, this.autoSaveInterval);
    
    console.log(`Auto-save started (${this.autoSaveInterval / 1000}s interval)`);
  }

  autoSave() {
    try {
      this.saveToCache();
      this.lastSaveTime = new Date();
      
      // ENHANCED: Update enhanced cache indicator
      if (this.enhancedCacheIndicator) {
        this.enhancedCacheIndicator.updateSaveStatus('Last saved', this.lastSaveTime.toLocaleTimeString());
        this.enhancedCacheIndicator.updateStats();
      }
      
      // Update save indicator if it exists
      const saveIndicator = document.getElementById('saveIndicator');
      if (saveIndicator) {
        saveIndicator.textContent = `Last saved: ${this.lastSaveTime.toLocaleTimeString()}`;
        saveIndicator.style.color = '#27ae60';
      }
      
      console.log('Auto-save completed');
    } catch (error) {
      console.error('Auto-save failed:', error);
      notifications.warning('Auto-save Failed', 'Could not save progress automatically');
    }
  }

  // ENHANCED: Enhanced saveToCache with comprehensive relationship data preservation
  saveToCache() {
    try {
      const state = this.getCurrentState();
      const stateString = JSON.stringify(state);
      
      // Check localStorage size limit
      const currentSize = new Blob([stateString]).size;
      if (currentSize > 5 * 1024 * 1024) { // 5MB limit
        console.warn('State too large for localStorage, compressing...');
        // Save only essential data if too large
        const compressedState = this.getCompressedState();
        localStorage.setItem(this.cacheKey, JSON.stringify(compressedState));
      } else {
        localStorage.setItem(this.cacheKey, stateString);
      }
      
      // Also save a backup with timestamp
      const backupKey = `${this.cacheKey}_backup_${Date.now()}`;
      localStorage.setItem(backupKey, stateString);
      
      // Clean old backups (keep only last 3)
      this.cleanOldBackups();
      
      console.log('Enhanced state saved to cache with relationship data');
      return true;
    } catch (error) {
      console.error('Failed to save to cache:', error);
      return false;
    }
  }

  // ENHANCED: Enhanced getCurrentState with comprehensive relationship data capture
  getCurrentState() {
    console.log('Saving current state with enhanced relationship data...');
    
    // Get all person data with relationship information
    const personsWithRelationships = [];
    if (this.renderer && this.renderer.nodes) {
      for (const [id, node] of this.renderer.nodes) {
        const personData = this.personData?.get(id) || {};
        
        // Ensure all relationship data is captured
        const personState = {
          id,
          x: node.x,
          y: node.y,
          name: node.name || personData.name || '',
          fatherName: node.fatherName || personData.fatherName || '',
          surname: node.surname || personData.surname || '',
          maidenName: node.maidenName || personData.maidenName || '',
          dob: node.dob || personData.dob || '',
          gender: node.gender || personData.gender || '',
          color: node.color || this.defaultColor,
          radius: node.radius || this.nodeRadius,
          
          // CRITICAL: Ensure relationship data is saved
          motherId: personData.motherId || '',
          fatherId: personData.fatherId || '',
          spouseId: personData.spouseId || ''
        };
        
        console.log(`Saving person ${id} with relationships:`, {
          motherId: personState.motherId,
          fatherId: personState.fatherId,
          spouseId: personState.spouseId
        });
        
        personsWithRelationships.push(personState);
      }
    }
    
    const state = {
      version: this.cacheVersion,
      timestamp: Date.now(),
      cacheFormat: 'enhanced', // Mark as enhanced format
      settings: {
        nodeRadius: this.nodeRadius,
        defaultColor: this.defaultColor,
        fontFamily: this.fontFamily,
        fontSize: this.fontSize,
        nameColor: this.nameColor,
        dateColor: this.dateColor,
        
        // Node outline settings
        showNodeOutline: this.renderer?.settings.showNodeOutline ?? true,
        outlineColor: this.renderer?.settings.outlineColor ?? '#2c3e50',
        outlineThickness: this.renderer?.settings.outlineThickness ?? 2,
        
        // Line style settings
        familyLineStyle: this.renderer?.settings.familyLineStyle ?? 'solid',
        familyLineThickness: this.renderer?.settings.familyLineThickness ?? 2,
        familyLineColor: this.renderer?.settings.familyLineColor ?? '#7f8c8d',
        
        spouseLineStyle: this.renderer?.settings.spouseLineStyle ?? 'dashed',
        spouseLineThickness: this.renderer?.settings.spouseLineThickness ?? 2,
        spouseLineColor: this.renderer?.settings.spouseLineColor ?? '#e74c3c',
        
        lineOnlyStyle: this.renderer?.settings.lineOnlyStyle ?? 'dash-dot',
        lineOnlyThickness: this.renderer?.settings.lineOnlyThickness ?? 2,
        lineOnlyColor: this.renderer?.settings.lineOnlyColor ?? '#9b59b6'
      },
      displayPreferences: { ...this.displayPreferences },
      nodeStyle: this.nodeStyle,
      camera: this.renderer ? this.renderer.getCamera() : { x: 0, y: 0, scale: 1 },
      
      // Enhanced connection preservation
      hiddenConnections: Array.from(this.hiddenConnections),
      lineOnlyConnections: Array.from(this.lineOnlyConnections),
      
      // Save persons with embedded relationship data
      persons: personsWithRelationships,
      
      // Also save personData separately as backup
      personDataBackup: this.personData ? Array.from(this.personData.entries()) : [],
      
      // Save current connections for verification
      currentConnections: this.renderer ? this.renderer.connections.map(conn => ({
        from: conn.from,
        to: conn.to,
        type: conn.type
      })) : [],
      
      nextId: this.nextId
    };
    
    console.log('Enhanced state prepared for saving:', {
      personsCount: state.persons.length,
      connectionsCount: state.currentConnections.length,
      hiddenConnectionsCount: state.hiddenConnections.length,
      lineOnlyConnectionsCount: state.lineOnlyConnections.length,
      relationshipDataPoints: state.persons.filter(p => p.motherId || p.fatherId || p.spouseId).length
    });
    
    return state;
  }

  // ENHANCED: Enhanced loadCachedState with detailed debugging
  async loadCachedState() {
    try {
      const cachedState = localStorage.getItem(this.cacheKey);
      if (!cachedState) {
        console.log('No cached state found');
        return false;
      }
      
      const state = JSON.parse(cachedState);
      console.log('Loading cached state:', {
        version: state.version,
        cacheFormat: state.cacheFormat,
        personsCount: state.persons?.length || 0,
        connectionsCount: state.currentConnections?.length || 0
      });
      
      // Detect format and load accordingly
      if (state.version || state.persons) {
        // New format
        this.processLoadedData(state);
      } else if (state.people) {
        // Invalid format
        console.warn('Unrecognized data format, ignoring');
      } else {
        console.warn('Unknown cached state format');
        return false;
      }
      
      notifications.success('Progress Restored', 'Your previous work has been restored');
      console.log('Cached state loaded successfully');
      return true;
    } catch (error) {
      console.error('Failed to load cached state:', error);
      notifications.error('Restore Failed', 'Could not restore previous progress');
      return false;
    }
  }

  // ENHANCED: Enhanced processLoadedData with guaranteed relationship restoration
  processLoadedData(data) {
    console.log('=== PROCESS LOADED DATA DEBUG ===');
    console.log('Processing loaded data with enhanced relationship restoration...');
    console.log('Data version:', data.version, 'Cache format:', data.cacheFormat || 'unknown');
    console.log('Raw data keys:', Object.keys(data));
    console.log('Persons array length:', data.persons?.length || 0);
    console.log('Sample person data:', data.persons?.[0]);
    console.log('=== END PROCESS LOADED DATA DEBUG ===');
    
    // Detect and handle different formats
    if (data.people && !data.persons) {
      // Unrecognized format
      console.warn('Unrecognized data format');
      return false;
    }
    
    // Clear current state
    this.renderer.nodes.clear();
    this.renderer.clearConnections();
    this.personData = new Map();
    this.hiddenConnections = new Set();
    this.lineOnlyConnections = new Set();
    
    // Restore settings
    if (data.settings) {
      this.nodeRadius = data.settings.nodeRadius || this.nodeRadius;
      this.defaultColor = data.settings.defaultColor || this.defaultColor;
      this.fontFamily = data.settings.fontFamily || this.fontFamily;
      this.fontSize = data.settings.fontSize || this.fontSize;
      this.nameColor = data.settings.nameColor || this.nameColor;
      this.dateColor = data.settings.dateColor || this.dateColor;
      
      // Restore outline settings
      if (this.renderer) {
        this.renderer.settings.showNodeOutline = data.settings.showNodeOutline ?? true;
        this.renderer.settings.outlineColor = data.settings.outlineColor ?? '#2c3e50';
        this.renderer.settings.outlineThickness = data.settings.outlineThickness ?? 2;
        
        // Restore line style settings
        this.renderer.settings.familyLineStyle = data.settings.familyLineStyle ?? 'solid';
        this.renderer.settings.familyLineThickness = data.settings.familyLineThickness ?? 2;
        this.renderer.settings.familyLineColor = data.settings.familyLineColor ?? '#7f8c8d';
        
        this.renderer.settings.spouseLineStyle = data.settings.spouseLineStyle ?? 'dashed';
        this.renderer.settings.spouseLineThickness = data.settings.spouseLineThickness ?? 2;
        this.renderer.settings.spouseLineColor = data.settings.spouseLineColor ?? '#e74c3c';
        
        this.renderer.settings.lineOnlyStyle = data.settings.lineOnlyStyle ?? 'dash-dot';
        this.renderer.settings.lineOnlyThickness = data.settings.lineOnlyThickness ?? 2;
        this.renderer.settings.lineOnlyColor = data.settings.lineOnlyColor ?? '#9b59b6';
      }
      
      this.updateRendererSettings();
    }
    
    // Restore display preferences
    if (data.displayPreferences) {
      this.displayPreferences = { ...data.displayPreferences };
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
      document.querySelectorAll('.node-style-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.getAttribute('data-style') === this.nodeStyle) {
          opt.classList.add('selected');
        }
      });
    }
    
    // Restore camera or auto-center on content
    if (data.camera && this.renderer) {
      this.renderer.setCamera(data.camera.x, data.camera.y, data.camera.scale);
      console.log('🎥 Restored saved camera position:', data.camera);
    } else if (this.renderer && this.renderer.nodes.size > 0) {
      // If no saved camera, auto-center on all content
      const bounds = this.renderer.getContentBounds();
      if (bounds) {
        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        // Center camera on content (negative coordinates because camera moves opposite to content)
        this.renderer.setCamera(-centerX + 400, -centerY + 300, 1);
        console.log('🎯 Auto-centered camera on loaded content:', { centerX, centerY, bounds });
      }
    }
    
    // Restore hidden/line-only connections
    if (data.hiddenConnections) {
      this.hiddenConnections = new Set(data.hiddenConnections);
      console.log('Restored hidden connections:', this.hiddenConnections.size);
    }
    if (data.lineOnlyConnections) {
      this.lineOnlyConnections = new Set(data.lineOnlyConnections);
      console.log('Restored line-only connections:', this.lineOnlyConnections.size);
    }
    
    // Restore next ID
    if (data.nextId) {
      this.nextId = data.nextId;
    }
    
    // CRITICAL: Process persons and restore relationship data
    const persons = data.persons || [];
    console.log('Processing', persons.length, 'persons with relationship data');
    
    let maxId = 0;
    let relationshipsFound = 0;
    
    for (const person of persons) {
      // Create node data
      const nodeData = {
        x: person.x || person.cx || 0,
        y: person.y || person.cy || 0,
        name: person.name || '',
        fatherName: person.fatherName || person.father_name || '',
        surname: person.surname || '',
        maidenName: person.maidenName || person.birthName || person.birth_name || '',
        dob: person.dob || '',
        gender: person.gender || '',
        color: person.color || person.nodeColor || person.fill || this.defaultColor,
        radius: person.radius || person.nodeSize || person.r || this.nodeRadius
      };
      
      this.renderer.setNode(person.id, nodeData);
      
      // CRITICAL: Restore relationship data properly
      const relationshipData = {
        name: person.name || '',
        fatherName: person.fatherName || person.father_name || '',
        surname: person.surname || '',
        maidenName: person.maidenName || person.birthName || person.birth_name || '',
        dob: person.dob || '',
        gender: person.gender || '',
        motherId: person.motherId || person.mother_id || '',
        fatherId: person.fatherId || person.father_id || '',
        spouseId: person.spouseId || person.spouse_id || ''
      };
      
      // Count relationships for debugging
      if (relationshipData.motherId) relationshipsFound++;
      if (relationshipData.fatherId) relationshipsFound++;
      if (relationshipData.spouseId) relationshipsFound++;
      
      this.personData.set(person.id, relationshipData);
      
      console.log(`Restored person ${person.id} with relationships:`, {
        motherId: relationshipData.motherId,
        fatherId: relationshipData.fatherId,
        spouseId: relationshipData.spouseId
      });
      
      // Track max ID
      const numId = parseInt(person.id.replace('p', ''));
      if (!isNaN(numId) && numId > maxId) {
        maxId = numId;
      }
    }
    
    if (maxId >= this.nextId) {
      this.nextId = maxId + 1;
    }
    
    console.log('PersonData restoration complete:', {
      personDataSize: this.personData.size,
      relationshipsFound: relationshipsFound,
      hiddenConnections: this.hiddenConnections.size,
      lineOnlyConnections: this.lineOnlyConnections.size
    });
    
    // CRITICAL: Regenerate connections AFTER all data is loaded
    console.log('Regenerating connections from restored relationship data...');
    this.regenerateConnections();
    
    // Verify connections were created
    const finalConnectionCount = this.renderer.connections.length;
    console.log('Final connection count after restoration:', finalConnectionCount);
    
    if (finalConnectionCount === 0 && relationshipsFound > 0) {
      console.warn('WARNING: No connections generated despite relationship data being present!');
      
      // Attempt backup restoration
      if (data.personDataBackup) {
        console.log('Attempting backup restoration...');
        this.personData = new Map(data.personDataBackup);
        this.regenerateConnections();
        console.log('Backup restoration complete, connections:', this.renderer.connections.length);
      }
    }
    
    // Reset undo/redo
    this.undoStack = [];
    this.redoStack = [];
    this.pushUndoState();
    
    // Save to cache after successful load
    this.saveToCache();
    
    console.log('=== FINAL DATA STORAGE DEBUG ===');
    console.log('Enhanced data loading complete with', this.renderer.connections.length, 'connections');
    console.log('Final renderer nodes count:', this.renderer.nodes.size);
    console.log('Final personData count:', this.personData.size);
    console.log('Sample renderer node:', Array.from(this.renderer.nodes.entries())[0]);
    console.log('Sample personData entry:', Array.from(this.personData.entries())[0]);
    console.log('=== END FINAL DATA STORAGE DEBUG ===');
  }

  // ENHANCED: Enhanced regenerateConnections with comprehensive debugging
  regenerateConnections() {
    console.log('=== ENHANCED CONNECTION REGENERATION ===');
    console.log('PersonData entries:', this.personData ? this.personData.size : 0);
    console.log('Hidden connections:', this.hiddenConnections.size);
    console.log('Line-only connections:', this.lineOnlyConnections.size);
    
    this.renderer.clearConnections();
    
    if (!this.personData || this.personData.size === 0) {
      console.log('No personData available for connections');
      return;
    }
    
    let connectionsAdded = 0;
    let skippedConnections = 0;
    
    // Debug: Log all person data first
    console.log('Available person data:');
    for (const [id, data] of this.personData) {
      if (data.motherId || data.fatherId || data.spouseId) {
        console.log(`  ${id}:`, {
          motherId: data.motherId,
          fatherId: data.fatherId,
          spouseId: data.spouseId
        });
      }
    }
    
    // Generate family relationship connections
    for (const [childId, childData] of this.personData) {
      // Mother connections
      if (childData.motherId) {
        const connectionKey = this.getConnectionKey(childId, childData.motherId);
        if (!this.hiddenConnections.has(connectionKey)) {
          // Verify both nodes exist
          if (this.renderer.nodes.has(childId) && this.renderer.nodes.has(childData.motherId)) {
            this.renderer.addConnection(childId, childData.motherId, 'parent');
            connectionsAdded++;
            console.log(`✓ Added mother connection: ${childId} -> ${childData.motherId}`);
          } else {
            console.warn(`✗ Skipped mother connection ${childId} -> ${childData.motherId} - missing node`);
            skippedConnections++;
          }
        } else {
          console.log(`○ Skipped hidden mother connection: ${childId} -> ${childData.motherId}`);
          skippedConnections++;
        }
      }
      
      // Father connections
      if (childData.fatherId) {
        const connectionKey = this.getConnectionKey(childId, childData.fatherId);
        if (!this.hiddenConnections.has(connectionKey)) {
          // Verify both nodes exist
          if (this.renderer.nodes.has(childId) && this.renderer.nodes.has(childData.fatherId)) {
            this.renderer.addConnection(childId, childData.fatherId, 'parent');
            connectionsAdded++;
            console.log(`✓ Added father connection: ${childId} -> ${childData.fatherId}`);
          } else {
            console.warn(`✗ Skipped father connection ${childId} -> ${childData.fatherId} - missing node`);
            skippedConnections++;
          }
        } else {
          console.log(`○ Skipped hidden father connection: ${childId} -> ${childData.fatherId}`);
          skippedConnections++;
        }
      }
      
      // Spouse connections (only add once per pair)
      if (childData.spouseId && childId < childData.spouseId) {
        const connectionKey = this.getConnectionKey(childId, childData.spouseId);
        if (!this.hiddenConnections.has(connectionKey)) {
          // Verify both nodes exist
          if (this.renderer.nodes.has(childId) && this.renderer.nodes.has(childData.spouseId)) {
            this.renderer.addConnection(childId, childData.spouseId, 'spouse');
            connectionsAdded++;
            console.log(`✓ Added spouse connection: ${childId} -> ${childData.spouseId}`);
          } else {
            console.warn(`✗ Skipped spouse connection ${childId} -> ${childData.spouseId} - missing node`);
            skippedConnections++;
          }
        } else {
          console.log(`○ Skipped hidden spouse connection: ${childId} -> ${childData.spouseId}`);
          skippedConnections++;
        }
      }
    }
    
    // Generate line-only connections
    console.log('Processing line-only connections...');
    for (const connectionKey of this.lineOnlyConnections) {
      if (!this.hiddenConnections.has(connectionKey)) {
        const [id1, id2] = connectionKey.split('-');
        // Verify both nodes exist
        if (this.renderer.nodes.has(id1) && this.renderer.nodes.has(id2)) {
          this.renderer.addConnection(id1, id2, 'line-only');
          connectionsAdded++;
          console.log(`✓ Added line-only connection: ${id1} -> ${id2}`);
        } else {
          console.warn(`✗ Skipped line-only connection ${id1} -> ${id2} - missing node`);
          skippedConnections++;
        }
      } else {
        console.log(`○ Skipped hidden line-only connection: ${connectionKey}`);
        skippedConnections++;
      }
    }
    
    console.log(`=== CONNECTION REGENERATION COMPLETE ===`);
    console.log(`Connections added: ${connectionsAdded}`);
    console.log(`Connections skipped: ${skippedConnections}`);
    console.log(`Total connections in renderer: ${this.renderer.connections.length}`);
    console.log('==========================================');
    
    // ENHANCED: Update cache stats
    if (this.enhancedCacheIndicator) {
      this.enhancedCacheIndicator.updateStats();
    }
    
    // Force redraw
    this.renderer.needsRedraw = true;
  }

  // ENHANCED: Enhanced debugging and troubleshooting methods
  debugCacheState() {
    console.log('=== ENHANCED CACHE DEBUG INFO ===');
    
    // Check localStorage
    const cachedState = localStorage.getItem(this.cacheKey);
    if (cachedState) {
      try {
        const parsed = JSON.parse(cachedState);
        console.log('Cached state found:', {
          version: parsed.version,
          cacheFormat: parsed.cacheFormat,
          personsCount: parsed.persons?.length || 0,
          personDataBackupCount: parsed.personDataBackup?.length || 0,
          connectionsCount: parsed.currentConnections?.length || 0,
          hiddenConnectionsCount: parsed.hiddenConnections?.length || 0,
          lineOnlyConnectionsCount: parsed.lineOnlyConnections?.length || 0
        });
        
        // Check if persons have relationship data
        if (parsed.persons) {
          const personsWithRelationships = parsed.persons.filter(p => 
            p.motherId || p.fatherId || p.spouseId
          );
          console.log(`Persons with relationships in cache: ${personsWithRelationships.length}`);
          
          personsWithRelationships.forEach(p => {
            console.log(`  ${p.id}:`, {
              motherId: p.motherId,
              fatherId: p.fatherId,
              spouseId: p.spouseId
            });
          });
        }
      } catch (error) {
        console.error('Error parsing cached state:', error);
      }
    } else {
      console.log('No cached state found');
    }
    
    // Check current state
    console.log('Current state:', {
      nodeCount: this.renderer?.nodes.size || 0,
      personDataCount: this.personData?.size || 0,
      connectionCount: this.renderer?.connections.length || 0,
      hiddenConnectionsCount: this.hiddenConnections.size,
      lineOnlyConnectionsCount: this.lineOnlyConnections.size
    });
    
    // Check current relationships
    if (this.personData) {
      const currentRelationships = Array.from(this.personData.entries()).filter(([id, data]) => 
        data.motherId || data.fatherId || data.spouseId
      );
      console.log(`Current persons with relationships: ${currentRelationships.length}`);
      
      currentRelationships.forEach(([id, data]) => {
        console.log(`  ${id}:`, {
          motherId: data.motherId,
          fatherId: data.fatherId,
          spouseId: data.spouseId
        });
      });
    }
    
    console.log('=================================');
  }

  forceRegenerateConnections() {
    console.log('Force regenerating connections...');
    
    // First, debug current state
    this.debugCacheState();
    
    // Try to regenerate
    this.regenerateConnections();
    
    // If still no connections, try to restore from cache backup
    if (this.renderer.connections.length === 0) {
      console.log('No connections generated, attempting to restore from cache backup...');
      
      const cachedState = localStorage.getItem(this.cacheKey);
      if (cachedState) {
        try {
          const parsed = JSON.parse(cachedState);
          if (parsed.personDataBackup) {
            console.log('Restoring from personData backup...');
            this.personData = new Map(parsed.personDataBackup);
            this.regenerateConnections();
          }
        } catch (error) {
          console.error('Error restoring from backup:', error);
        }
      }
    }
    
    // Save the corrected state
    this.saveToCache();
    
    console.log('Force regeneration complete, final connection count:', this.renderer.connections.length);
  }

  getCompressedState() {
    // Return only essential data for large states
    return {
      version: this.cacheVersion,
      timestamp: Date.now(),
      cacheFormat: 'compressed',
      persons: this.getPersonsArray(),
      personData: this.personData ? Array.from(this.personData.entries()) : [],
      nextId: this.nextId,
      hiddenConnections: Array.from(this.hiddenConnections),
      lineOnlyConnections: Array.from(this.lineOnlyConnections)
    };
  }

  getPersonsArray() {
    const persons = [];
    if (this.renderer && this.renderer.nodes) {
      for (const [id, node] of this.renderer.nodes) {
        const personData = this.personData?.get(id) || {};
        persons.push({
          id,
          x: node.x,
          y: node.y,
          color: node.color,
          radius: node.radius,
          ...personData
        });
      }
    }
    return persons;
  }

  cleanOldBackups() {
    try {
      const backupKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${this.cacheKey}_backup_`)) {
          backupKeys.push({
            key,
            timestamp: parseInt(key.split('_').pop())
          });
        }
      }
      
      // Sort by timestamp and keep only the 3 most recent
      backupKeys.sort((a, b) => b.timestamp - a.timestamp);
      for (let i = 3; i < backupKeys.length; i++) {
        localStorage.removeItem(backupKeys[i].key);
      }
    } catch (error) {
      console.error('Failed to clean old backups:', error);
    }
  }

  clearCache() {
    try {
      localStorage.removeItem(this.cacheKey);
      
      // Clear backups
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${this.cacheKey}_backup_`)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log('Cache cleared');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      notifications.error('Clear Failed', 'Could not clear cached data');
    }
  }

  addCacheManagementUI() {
    const settingsPanel = document.getElementById('settingsPanel');
    if (!settingsPanel) return;
    
    // Add cache management section
    const cacheSection = document.createElement('div');
    cacheSection.className = 'setting-section';
    cacheSection.innerHTML = `
      <h4>Progress & Cache</h4>
      <div class="setting-group">
        <span id="saveIndicator" style="font-size: 12px; color: #666;">Auto-save enabled</span>
      </div>
      <div class="setting-group">
        <button id="manualSaveBtn" style="flex: 1;">Save Now</button>
        <button id="clearCacheBtn" style="flex: 1; background: #e74c3c;">Clear Cache</button>
      </div>
      <div class="setting-group">
        <label for="autoSaveToggle">Auto-save enabled:</label>
        <input type="checkbox" id="autoSaveToggle" checked>
      </div>
      <div class="setting-group">
        <button id="debugCacheBtn" style="flex: 1; background: #9b59b6;">Debug Cache</button>
        <button id="fixConnectionsBtn" style="flex: 1; background: #f39c12;">Fix Connections</button>
      </div>
    `;
    
    // Insert before the clear all section
    const clearAllSection = settingsPanel.querySelector('.clear-all-section');
    if (clearAllSection) {
      settingsPanel.insertBefore(cacheSection, clearAllSection);
    } else {
      settingsPanel.appendChild(cacheSection);
    }
    
    // Wire up events
    document.getElementById('manualSaveBtn')?.addEventListener('click', () => {
      if (this.saveToCache()) {
        notifications.success('Saved', 'Progress saved manually');
      } else {
        notifications.error('Save Failed', 'Could not save progress');
      }
    });
    
    document.getElementById('clearCacheBtn')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all cached progress? This cannot be undone.')) {
        this.clearCache();
        notifications.success('Cache Cleared', 'All cached progress has been cleared');
      }
    });
    
    document.getElementById('autoSaveToggle')?.addEventListener('change', (e) => {
      if (e.target.checked) {
        this.startAutoSave();
        notifications.success('Auto-save On', 'Automatic saving enabled');
      } else {
        if (this.autoSaveTimer) {
          clearInterval(this.autoSaveTimer);
          this.autoSaveTimer = null;
        }
        notifications.info('Auto-save Off', 'Automatic saving disabled');
      }
    });
    
    document.getElementById('debugCacheBtn')?.addEventListener('click', () => {
      this.debugCacheState();
      notifications.info('Cache Debug', 'Check console for detailed cache information');
    });
    
    document.getElementById('fixConnectionsBtn')?.addEventListener('click', () => {
      this.forceRegenerateConnections();
      notifications.success('Connections Fixed', 'Attempted to restore all connections');
    });
  }

  // Continue with rest of existing methods...

  // ENHANCED: Enhanced pushUndoState with auto-save and cache stats
  pushUndoState() {
    const state = {
      nodes: new Map(),
      personData: new Map(this.personData || []),
      camera: this.renderer ? this.renderer.getCamera() : { x: 0, y: 0, scale: 1 },
      hiddenConnections: new Set(this.hiddenConnections),
      lineOnlyConnections: new Set(this.lineOnlyConnections),
      displayPreferences: { ...this.displayPreferences },
      nodeStyle: this.nodeStyle,
      settings: {
        nodeRadius: this.nodeRadius,
        defaultColor: this.defaultColor,
        fontFamily: this.fontFamily,
        fontSize: this.fontSize,
        nameColor: this.nameColor,
        dateColor: this.dateColor,
        
        // Node outline settings
        showNodeOutline: this.renderer?.settings.showNodeOutline ?? true,
        outlineColor: this.renderer?.settings.outlineColor ?? '#2c3e50',
        outlineThickness: this.renderer?.settings.outlineThickness ?? 2,
        
        // Line style settings
        familyLineStyle: this.renderer?.settings.familyLineStyle ?? 'solid',
        familyLineThickness: this.renderer?.settings.familyLineThickness ?? 2,
        familyLineColor: this.renderer?.settings.familyLineColor ?? '#7f8c8d',
        
        spouseLineStyle: this.renderer?.settings.spouseLineStyle ?? 'dashed',
        spouseLineThickness: this.renderer?.settings.spouseLineThickness ?? 2,
        spouseLineColor: this.renderer?.settings.spouseLineColor ?? '#e74c3c',
        
        lineOnlyStyle: this.renderer?.settings.lineOnlyStyle ?? 'dash-dot',
        lineOnlyThickness: this.renderer?.settings.lineOnlyThickness ?? 2,
        lineOnlyColor: this.renderer?.settings.lineOnlyColor ?? '#9b59b6'
      }
    };
    
    if (this.renderer) {
      for (const [id, node] of this.renderer.nodes) {
        state.nodes.set(id, { ...node });
      }
    }
    
    this.undoStack.push(state);
    if (this.undoStack.length > this.maxUndoSize) {
      this.undoStack.shift();
    }
    
    this.redoStack = [];
    
    // ENHANCED: Update cache indicator stats
    if (this.enhancedCacheIndicator) {
      this.enhancedCacheIndicator.updateStats();
    }
    
    // Auto-save after state change
    setTimeout(() => this.autoSave(), 100);
  }

  exportCanvasAsPNG() {
    try {
      // Use the improved export method from canvas renderer
      const exportCanvas = this.renderer.exportAsImage('png');
      
      exportCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'family-tree.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    } catch (error) {
      console.error('Error exporting PNG:', error);
      notifications.error('Export Failed', 'Could not export PNG: ' + error.message);
    }
  }

  exportCanvasAsSVG() {
    try {
      // Create SVG export with proper bounds
      const bounds = this.renderer.getContentBounds();
      if (!bounds) {
        throw new Error('No content to export');
      }

      // Add 5px margin
      const margin = 5;
      const exportWidth = bounds.width + (margin * 2);
      const exportHeight = bounds.height + (margin * 2);

      // Create SVG
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', exportWidth);
      svg.setAttribute('height', exportHeight);
      svg.setAttribute('viewBox', `0 0 ${exportWidth} ${exportHeight}`);
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

      // White background
      const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      background.setAttribute('width', '100%');
      background.setAttribute('height', '100%');
      background.setAttribute('fill', '#ffffff');
      svg.appendChild(background);

      // Create group for content with offset
      const contentGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      contentGroup.setAttribute('transform', `translate(${margin - bounds.x}, ${margin - bounds.y})`);

      // Export connections
      for (const conn of this.renderer.connections) {
        const fromNode = this.renderer.nodes.get(conn.from);
        const toNode = this.renderer.nodes.get(conn.to);
        
        if (!fromNode || !toNode) continue;
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', fromNode.x);
        line.setAttribute('y1', fromNode.y);
        line.setAttribute('x2', toNode.x);
        line.setAttribute('y2', toNode.y);
        line.setAttribute('stroke-width', '2');
        
        if (conn.type === 'spouse') {
          line.setAttribute('stroke', this.renderer.settings.spouseConnectionColor);
          line.setAttribute('stroke-dasharray', '4 2');
        } else if (conn.type === 'line-only') {
          line.setAttribute('stroke', '#9b59b6');
          line.setAttribute('stroke-dasharray', '8 4 2 4');
        } else {
          line.setAttribute('stroke', this.renderer.settings.connectionColor);
        }
        
        contentGroup.appendChild(line);
      }

      // Export nodes
      for (const [id, node] of this.renderer.nodes) {
        const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        
        if (this.renderer.settings.nodeStyle === 'rectangle') {
          const width = this.renderer.getNodeWidth(node);
          const height = this.renderer.getNodeHeight(node);
          
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', node.x - width/2);
          rect.setAttribute('y', node.y - height/2);
          rect.setAttribute('width', width);
          rect.setAttribute('height', height);
          rect.setAttribute('fill', node.color || this.renderer.settings.nodeColor);
          rect.setAttribute('stroke', this.renderer.settings.strokeColor);
          rect.setAttribute('stroke-width', this.renderer.settings.strokeWidth);
          nodeGroup.appendChild(rect);
        } else {
          const radius = node.radius || this.renderer.settings.nodeRadius;
          
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', node.x);
          circle.setAttribute('cy', node.y);
          circle.setAttribute('r', radius);
          circle.setAttribute('fill', node.color || this.renderer.settings.nodeColor);
          circle.setAttribute('stroke', this.renderer.settings.strokeColor);
          circle.setAttribute('stroke-width', this.renderer.settings.strokeWidth);
          nodeGroup.appendChild(circle);
        }

        // Add text elements
        this.addSVGText(nodeGroup, node);
        contentGroup.appendChild(nodeGroup);
      }

      svg.appendChild(contentGroup);

      // Serialize and download
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      
      const url = URL.createObjectURL(svgBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'family-tree.svg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error exporting SVG:', error);
      notifications.error('Export Failed', 'Could not export SVG: ' + error.message);
    }
  }

  addSVGText(nodeGroup, node) {
    let y = node.y;
    const lineHeight = 12;
    
    // Calculate total lines to center text vertically
    let totalLines = 0;
    const fullName = this.renderer.buildFullName(node);
    if (fullName) totalLines += 1;
    if (this.displayPreferences.showMaidenName && node.maidenName && node.maidenName !== node.surname) totalLines += 1;
    if (this.displayPreferences.showDateOfBirth && node.dob) totalLines += 1;
    
    y = node.y - (totalLines - 1) * lineHeight / 2;
    
    // Add name text
    if (fullName) {
      const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      nameText.setAttribute('x', node.x);
      nameText.setAttribute('y', y);
      nameText.setAttribute('text-anchor', 'middle');
      nameText.setAttribute('dominant-baseline', 'middle');
      nameText.setAttribute('font-family', this.renderer.settings.fontFamily);
      nameText.setAttribute('font-size', this.renderer.settings.nameFontSize);
      nameText.setAttribute('font-weight', '600');
      nameText.setAttribute('fill', this.renderer.settings.nameColor);
      nameText.textContent = fullName;
      nodeGroup.appendChild(nameText);
      y += lineHeight;
    }
    
    // Add maiden name if applicable
    if (this.displayPreferences.showMaidenName && node.maidenName && node.maidenName !== node.surname) {
      const maidenText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      maidenText.setAttribute('x', node.x);
      maidenText.setAttribute('y', y);
      maidenText.setAttribute('text-anchor', 'middle');
      maidenText.setAttribute('dominant-baseline', 'middle');
      maidenText.setAttribute('font-family', this.renderer.settings.fontFamily);
      maidenText.setAttribute('font-size', this.renderer.settings.dobFontSize);
      maidenText.setAttribute('font-style', 'italic');
      maidenText.setAttribute('fill', this.renderer.settings.nameColor);
      maidenText.textContent = `(${node.maidenName})`;
      nodeGroup.appendChild(maidenText);
      y += 10;
    }
    
    // Add DOB if applicable
    if (this.displayPreferences.showDateOfBirth && node.dob) {
      const dobText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      dobText.setAttribute('x', node.x);
      dobText.setAttribute('y', y + 5);
      dobText.setAttribute('text-anchor', 'middle');
      dobText.setAttribute('dominant-baseline', 'middle');
      dobText.setAttribute('font-family', this.renderer.settings.fontFamily);
      dobText.setAttribute('font-size', this.renderer.settings.dobFontSize);
      dobText.setAttribute('fill', this.renderer.settings.dobColor);
      dobText.textContent = node.dob;
      nodeGroup.appendChild(dobText);
    }
  }

  // ENHANCED: Enhanced destroy method with cleanup
  destroy() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    
    // ENHANCED: Clean up enhanced cache indicator
    if (this.enhancedCacheIndicator && this.enhancedCacheIndicator.expandTimeout) {
      clearTimeout(this.enhancedCacheIndicator.expandTimeout);
    }
    
    // Final save before destroy
    this.saveToCache();
    
    if (this.renderer) {
      this.renderer.destroy();
    }
  }

  // ================== MISSING METHODS ==================

  getConnectionKey(id1, id2) {
    return id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;
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

  updateActionButtons() {
    this.selectedCircles = this.renderer.getSelectedNodes();
    
    const hasSelection = this.selectedCircles.size > 0;
    const canConnect = this.selectedCircles.size === 2;
    const canEdit = this.selectedCircles.size === 1;
    
    console.log('🔗 updateActionButtons:', { 
      selectedCount: this.selectedCircles.size, 
      canConnect, 
      hasConnectBtn: !!this.connectBtn 
    });
    
    const floatingButtons = document.querySelector('.floating-buttons');
    if (!floatingButtons) return;
    
    if (hasSelection) {
      floatingButtons.classList.add('expanded');
      
      if (this.bringFrontBtn) {
        this.bringFrontBtn.classList.remove('hidden');
      }
      
      if (this.editBtn) {
        if (canEdit) {
          this.editBtn.classList.remove('hidden');
        } else {
          this.editBtn.classList.add('hidden');
        }
      }
      
      if (this.connectBtn) {
        if (canConnect) {
          console.log('🔗 Showing connect button');
          this.connectBtn.classList.remove('hidden');
        } else {
          console.log('🔗 Hiding connect button');
          this.connectBtn.classList.add('hidden');
        }
      } else {
        console.log('🔗 Connect button not found!');
      }
      
      if (this.styleBtn) {
        this.styleBtn.classList.remove('hidden');
      }
    } else {
      floatingButtons.classList.remove('expanded');
      
      if (this.bringFrontBtn) {
        this.bringFrontBtn.classList.add('hidden');
      }
      
      if (this.editBtn) {
        this.editBtn.classList.add('hidden');
      }
      
      if (this.connectBtn) {
        this.connectBtn.classList.add('hidden');
      }
      
      if (this.styleBtn) {
        this.styleBtn.classList.add('hidden');
      }
    }
  }

  initializeEnhancedCacheIndicator() {
    // Simple implementation - can be enhanced later
    console.log('Enhanced cache indicator initialized');
  }

  // CRITICAL: Handle save person from modal - was missing!
  handleSavePersonFromModal(formData) {
    console.log('🔄 Processing person save:', formData);
    
    try {
      // Validate required fields
      if (!formData.name || !formData.name.trim()) {
        throw new Error('Name is required');
      }
      
      if (!formData.gender) {
        throw new Error('Gender is required');
      }
      
      // Initialize personData if needed
      if (!this.personData) {
        this.personData = new Map();
      }
      
      // Determine if this is edit or new person
      const isEdit = formData.editingId && formData.editingId.trim();
      const personId = isEdit ? formData.editingId : this.generateId();
      
      console.log(`${isEdit ? 'Editing' : 'Creating'} person with ID:`, personId);
      
      // Create person data object
      const personData = {
        id: personId,
        name: formData.name.trim(),
        fatherName: formData.fatherName ? formData.fatherName.trim() : '',
        surname: formData.surname ? formData.surname.trim() : '',
        maidenName: formData.maidenName ? formData.maidenName.trim() : '',
        dob: formData.dob ? formData.dob.trim() : '',
        gender: formData.gender,
        motherId: formData.motherId || '',
        fatherId: formData.fatherId || '',
        spouseId: formData.spouseId || ''
      };
      
      // Store in personData map
      this.personData.set(personId, personData);
      
      // Handle canvas node creation/update
      if (this.renderer) {
        let nodeData;
        
        if (isEdit && this.renderer.nodes.has(personId)) {
          // Update existing node
          nodeData = this.renderer.nodes.get(personId);
          Object.assign(nodeData, {
            name: personData.name,
            fatherName: personData.fatherName,
            surname: personData.surname,
            maidenName: personData.maidenName,
            dob: personData.dob,
            gender: personData.gender
          });
          
          console.log('✏️ Updated existing node:', personId);
        } else {
          // Create new node with organized positioning
          const existingNodes = Array.from(this.renderer.nodes.values());
          let x = 300, y = 300;
          
          // Organized positioning: place new nodes below existing content, centered horizontally
          if (existingNodes.length > 0) {
            const position = this.calculateNewNodePosition(existingNodes);
            x = position.x;
            y = position.y;
            console.log(`📍 Positioning new node below existing content at (${x}, ${y})`);
          } else {
            // First node: center it on the canvas
            x = 400;
            y = 300;
            console.log(`📍 Positioning first node at center (${x}, ${y})`);
          }
          
          nodeData = {
            id: personId,
            name: personData.name,
            fatherName: personData.fatherName,
            surname: personData.surname,
            maidenName: personData.maidenName,
            dob: personData.dob,
            gender: personData.gender,
            x: x,
            y: y,
            radius: this.nodeRadius || 50,
            color: this.defaultColor || '#3498db'
          };
          
          this.renderer.setNode(personId, nodeData);
          console.log('➕ Created new node:', personId, 'at position:', x, y);
          
          // Center camera on the newly created node using the search centering method
          setTimeout(() => {
            this.centerOnNodeImproved(personId);
          }, 100); // Small delay to ensure node is fully rendered
        }
      } else {
        console.warn('⚠️ Renderer not available, node will be created when renderer initializes');
      }
      
      // Regenerate connections to handle new relationships
      this.regenerateConnections();
      
      // Save state for undo functionality
      if (this.undoRedoManager) {
        this.undoRedoManager.pushUndoState();
      }
      
      // Trigger auto-save
      this.autoSave();
      
      // Update canvas
      if (this.renderer) {
        this.renderer.needsRedraw = true;
      }
      
      // Center camera on newly created nodes (not edits)
      if (!isEdit) {
        setTimeout(() => {
          this.centerOnNodeImproved(personId);
        }, 100);
      }
      
      // Show success notification
      const action = isEdit ? 'updated' : 'added';
      const fullName = personData.name + (personData.surname ? ` ${personData.surname}` : '');
      
      import('./notifications.js').then(({ notifications }) => {
        notifications.success(
          isEdit ? 'Person Updated' : 'Person Added', 
          `${fullName} has been ${action} successfully`
        );
      });
      
      // Close the modal
      setTimeout(() => {
        import('./modal.js').then(({ closeModal }) => {
          closeModal();
        });
      }, 300);
      
      console.log('✅ Person save completed successfully');
      
    } catch (error) {
      console.error('❌ Error saving person:', error);
      
      // Show error notification
      import('./notifications.js').then(({ notifications }) => {
        notifications.error('Save Failed', error.message || 'Failed to save person data');
      });
    }
  }
  
  // Helper method to generate unique IDs
  generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  setupBringToFront() {
    // Simple implementation - can be enhanced later
    console.log('Bring to front setup complete');
  }

  getPersonData(id) {
    const data = this.personData?.get(id) || {};
    console.log(`getPersonData(${id}):`, data);
    return data;
  }

  clearSelection() {
    if (this.renderer) {
      this.renderer.clearSelection();
      this.updateActionButtons();
    }
  }

  handleEditSelected() {
    const selectedNodes = this.renderer.getSelectedNodes();
    
    if (selectedNodes.size === 0) {
      notifications.warning('No Selection', 'Please select a person to edit');
      return;
    }
    
    if (selectedNodes.size > 1) {
      notifications.warning('Multiple Selection', 'Please select only one person to edit');
      return;
    }
    
    const selectedId = Array.from(selectedNodes)[0];
    console.log('Editing selected person:', selectedId);
    
    // Open the modal for editing the selected person
    openModalForEdit(selectedId);
  }

  handleConnectSelected() {
    const selectedNodes = this.renderer.getSelectedNodes();
    
    if (selectedNodes.size !== 2) {
      notifications.warning('Invalid Selection', 'Please select exactly 2 people to connect');
      return;
    }
    
    const selectedIds = Array.from(selectedNodes);
    const personA = selectedIds[0];
    const personB = selectedIds[1];
    
    console.log('Connecting persons:', personA, 'and', personB);
    
    // Set up connection state
    this.connectionPersonA = personA;
    this.connectionPersonB = personB;
    
    // Open connection modal
    if (typeof this.openConnectionModal === 'function') {
      this.openConnectionModal();
    } else {
      // Fallback: create connection directly
      this.createConnection(personA, personB);
    }
  }

  handleBringToFront() {
    const selectedNodes = this.renderer.getSelectedNodes();
    
    if (selectedNodes.size === 0) {
      notifications.warning('No Selection', 'Please select a person to bring to front');
      return;
    }
    
    // Bring selected nodes to front
    selectedNodes.forEach(nodeId => {
      this.renderer.bringNodeToFront(nodeId);
    });
    
    notifications.info('Brought to Front', `${selectedNodes.size} person(s) brought to front`);
  }

  createConnection(personA, personB) {
    // Create a connection between two people
    const connection = {
      from: personA,
      to: personB,
      type: 'spouse' // Default connection type
    };
    
    // Add to renderer
    this.renderer.addConnection(connection);
    
    // Update person data with relationship
    const personAData = this.personData.get(personA) || {};
    const personBData = this.personData.get(personB) || {};
    
    personAData.spouseId = personB;
    personBData.spouseId = personA;
    
    this.personData.set(personA, personAData);
    this.personData.set(personB, personBData);
    
    // Save state
    this.undoRedoManager.pushUndoState();
    
    notifications.success('Connected', 'Persons connected successfully');
  }

  // ENHANCED: Calculate organized position for new nodes
  calculateNewNodePosition(existingNodes) {
    if (!existingNodes || existingNodes.length === 0) {
      return { x: 400, y: 300 }; // Default center position
    }

    // Find the bounds of existing nodes
    let minX = Infinity, maxX = -Infinity;
    let maxY = -Infinity;
    
    existingNodes.forEach(node => {
      const nodeX = node.x || 0;
      const nodeY = node.y || 0;
      
      minX = Math.min(minX, nodeX);
      maxX = Math.max(maxX, nodeX);
      maxY = Math.max(maxY, nodeY);
    });
    
    // Calculate horizontal center between leftmost and rightmost nodes
    const centerX = (minX + maxX) / 2;
    
    // Position below the lowest node with spacing
    const verticalSpacing = 150; // Space between rows
    const newY = maxY + verticalSpacing;
    
    console.log(`📊 Node bounds: minX=${minX}, maxX=${maxX}, maxY=${maxY}`);
    console.log(`📍 New node position: centerX=${centerX}, newY=${newY}`);
    
    return { x: centerX, y: newY };
  }

  // ENHANCED: Camera centering method using search algorithm
  centerOnNodeImproved(personId) {
    if (!this.renderer || !personId) {
      console.warn('Cannot center on node: renderer or personId missing');
      return;
    }

    const node = this.renderer.nodes.get(personId);
    if (!node) {
      console.warn(`Cannot center on node: node ${personId} not found`);
      return;
    }

    // Get canvas dimensions (same as search.js method)
    const canvas = this.renderer.canvas;
    const canvasWidth = canvas.width / this.renderer.dpr;
    const canvasHeight = canvas.height / this.renderer.dpr;

    // Smart zoom level adjustment (same as search.js)
    let targetScale = this.renderer.camera.scale;
    if (targetScale < 0.8) {
      targetScale = 1.0;
    } else if (targetScale > 3.0) {
      targetScale = 2.0;
    }

    // Calculate exact center position (same formula as search.js)
    const targetCameraX = (canvasWidth / 2) - (node.x * targetScale);
    const targetCameraY = (canvasHeight / 2) - (node.y * targetScale);

    console.log(`🎯 Centering camera on node ${personId} at (${node.x}, ${node.y})`);
    console.log(`📐 Canvas dimensions: ${canvasWidth}x${canvasHeight}`);
    console.log(`🔍 Target camera position: (${targetCameraX}, ${targetCameraY}) scale: ${targetScale}`);

    // Animate camera to center position (enhanced version from search.js)
    this.animateCameraImproved({
      x: targetCameraX,
      y: targetCameraY,
      scale: targetScale
    }, node, personId);
  }

  // ENHANCED: Camera animation method using search algorithm
  animateCameraImproved(targetCamera, node, personId) {
    const renderer = this.renderer;
    const startTime = performance.now();
    const duration = 1000; // 1 second animation (same as search)
    const startCamera = {
      x: renderer.camera.x,
      y: renderer.camera.y,
      scale: renderer.camera.scale
    };

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Cubic ease-in-out (same as search.js)
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      // Interpolate camera position
      renderer.camera.x = startCamera.x + (targetCamera.x - startCamera.x) * eased;
      renderer.camera.y = startCamera.y + (targetCamera.y - startCamera.y) * eased;
      renderer.camera.scale = startCamera.scale + (targetCamera.scale - startCamera.scale) * eased;

      renderer.needsRedraw = true;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Post-animation validation (same as search.js)
        console.log(`✅ Camera animation complete for node ${personId}`);
        console.log(`📍 Final camera position: (${renderer.camera.x}, ${renderer.camera.y}) scale: ${renderer.camera.scale}`);
        
        // Validate centering
        const canvas = renderer.canvas;
        const canvasWidth = canvas.width / renderer.dpr;
        const canvasHeight = canvas.height / renderer.dpr;
        const expectedX = (canvasWidth / 2) - (node.x * renderer.camera.scale);
        const expectedY = (canvasHeight / 2) - (node.y * renderer.camera.scale);
        
        if (Math.abs(renderer.camera.x - expectedX) > 1 || Math.abs(renderer.camera.y - expectedY) > 1) {
          console.warn('⚠️ Camera centering validation failed, applying correction');
          renderer.camera.x = expectedX;
          renderer.camera.y = expectedY;
          renderer.needsRedraw = true;
        }
      }
    };

    requestAnimationFrame(animate);
  }
}

// Create and export instance
export const treeCore = new TreeCoreCanvas();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  treeCore.initialize();
});

// Export for compatibility
export function pushUndoState() {
  treeCore.pushUndoState();
}

export function generateAllConnections() {
  treeCore.regenerateConnections();
}

// ENHANCED: Enhanced debug commands available globally
if (typeof window !== 'undefined') {
  // Debug commands for connection caching issues
  window.debugCache = function() {
    if (window.treeCore) {
      window.treeCore.debugCacheState();
    } else {
      console.error('TreeCore not found');
    }
  };

  window.fixConnections = function() {
    if (window.treeCore) {
      window.treeCore.forceRegenerateConnections();
    } else {
      console.error('TreeCore not found');
    }
  };

  window.showRelationships = function() {
    if (window.treeCore) {
      const core = window.treeCore;
      
      console.log('=== CURRENT RELATIONSHIPS ===');
      if (core.personData) {
        for (const [id, data] of core.personData) {
          if (data.motherId || data.fatherId || data.spouseId) {
            console.log(`${id} (${data.name}):`, {
              mother: data.motherId ? `${data.motherId} (${core.personData.get(data.motherId)?.name || 'Unknown'})` : 'None',
              father: data.fatherId ? `${data.fatherId} (${core.personData.get(data.fatherId)?.name || 'Unknown'})` : 'None',
              spouse: data.spouseId ? `${data.spouseId} (${core.personData.get(data.spouseId)?.name || 'Unknown'})` : 'None'
            });
          }
        }
      }
      console.log('=============================');
    } else {
      console.error('TreeCore not found');
    }
  };

  window.clearCacheAndReload = function() {
    if (confirm('This will clear all cached data and reload the page. Continue?')) {
      localStorage.removeItem('familyTreeCanvas_state');
      // Clear backup caches too
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('familyTreeCanvas_state_backup_')) {
          localStorage.removeItem(key);
        }
      });
      location.reload();
    }
  };

  window.testConnections = function() {
    if (window.treeCore) {
      const core = window.treeCore;
      
      console.log('=== CONNECTION TEST ===');
      console.log('Before regeneration:', core.renderer.connections.length, 'connections');
      
      core.regenerateConnections();
      
      console.log('After regeneration:', core.renderer.connections.length, 'connections');
      console.log('Connection details:', core.renderer.connections);
      console.log('======================');
    } else {
      console.error('TreeCore not found');
    }
  };

  // ENHANCED: Global update function for external use
  window.updateCacheStats = function() {
    if (window.treeCore && window.treeCore.enhancedCacheIndicator) {
      window.treeCore.enhancedCacheIndicator.updateStats();
    }
  };

  console.log('🔧 Enhanced Tree Core Debug Commands:');
  console.log('- debugCache() - Show detailed cache state');
  console.log('- fixConnections() - Force regenerate all connections');
  console.log('- showRelationships() - Display current family relationships');
  console.log('- clearCacheAndReload() - Clear all cache and reload page');
  console.log('- testConnections() - Test connection regeneration process');
  console.log('- updateCacheStats() - Update cache indicator stats');
  console.log('');
  console.log('💡 If connections disappear after page refresh:');
  console.log('1. Run debugCache() to check cache state');
  console.log('2. Run fixConnections() to restore missing connections');
  console.log('3. If problem persists, run clearCacheAndReload()');
}

function devLog(...args) {
  if (window.NODE_ENV !== 'production') {
    console.log(...args);
  }
}
function devWarn(...args) {
  if (window.NODE_ENV !== 'production') {
    console.warn(...args);
  }
}
function devError(...args) {
  if (window.NODE_ENV !== 'production') {
    console.error(...args);
  }
}
// Replace all console.log, console.warn, console.error with devLog, devWarn, devError
// Export the TreeCoreCanvas class
export { TreeCoreCanvas };
