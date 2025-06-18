// tree-core-canvas.js - Updated with search integration and advanced export functionality

import { CanvasRenderer } from './canvas-renderer.js';
import { openModalForEdit, closeModal, getSelectedGender } from './modal.js';
import { rebuildTableView } from './table.js';
import { exportTree, exportGEDCOM, exportPDFLayout, exportCanvasPDF } from './exporter.js';
import { notifications } from './notifications.js';

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
    
    // Caching
    this.cacheKey = 'familyTreeCanvas_state';
    this.autoSaveInterval = 30000; // Auto-save every 30 seconds
    this.autoSaveTimer = null;
    this.lastSaveTime = null;
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
      this.autoSave(); // Auto-save after drag
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
    this.setupAdvancedExport(); // New advanced export setup
    this.setupKeyboard();
    this.setupStyleModal();
    this.setupLineRemovalModal();
    this.setupViewSwitching();
    this.setupDisplayPreferences();
    this.setupNodeStyleSwitcher();
    this.setupCaching();
    
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
    
    // Try to load cached state first, then check for legacy format
    this.loadCachedState().then((loaded) => {
      if (!loaded) {
        // No cached state, check if there's a way to load legacy data
        this.checkForLegacyData();
      }
      
      // Initial state if nothing was loaded
      if (!this.personData || this.personData.size === 0) {
        this.pushUndoState();
      }
    });
    
    console.log('TreeCoreCanvas initialization complete');
  }

  // ================== CACHING FUNCTIONALITY ==================

  setupCaching() {
    console.log('Setting up caching functionality...');
    
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
    
    console.log('Caching setup complete');
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
      
      console.log('State saved to cache');
      return true;
    } catch (error) {
      console.error('Failed to save to cache:', error);
      return false;
    }
  }

  async loadCachedState() {
    try {
      const cachedState = localStorage.getItem(this.cacheKey);
      if (!cachedState) {
        console.log('No cached state found');
        return false;
      }
      
      const state = JSON.parse(cachedState);
      console.log('Loading cached state:', state);
      
      // Detect format and load accordingly
      if (state.version || state.persons) {
        // New format
        this.processLoadedData(state);
      } else if (state.people) {
        // Legacy format
        this.processLegacyData(state);
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

  getCurrentState() {
    return {
      version: '2.5', // Increment version for caching
      timestamp: Date.now(),
      settings: {
        nodeRadius: this.nodeRadius,
        defaultColor: this.defaultColor,
        fontFamily: this.fontFamily,
        fontSize: this.fontSize,
        nameColor: this.nameColor,
        dateColor: this.dateColor
      },
      displayPreferences: { ...this.displayPreferences },
      nodeStyle: this.nodeStyle,
      camera: this.renderer ? this.renderer.getCamera() : { x: 0, y: 0, scale: 1 },
      hiddenConnections: Array.from(this.hiddenConnections),
      lineOnlyConnections: Array.from(this.lineOnlyConnections),
      persons: this.getPersonsArray(),
      personData: this.personData ? Array.from(this.personData.entries()) : [],
      nextId: this.nextId
    };
  }

  getCompressedState() {
    // Return only essential data for large states
    return {
      version: '2.5',
      timestamp: Date.now(),
      persons: this.getPersonsArray(),
      personData: this.personData ? Array.from(this.personData.entries()) : [],
      nextId: this.nextId
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
      
      notifications.success('Cache Cleared', 'All cached progress has been cleared');
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
    `;
    
    // Insert before the last section
    settingsPanel.appendChild(cacheSection);
    
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
  }

  // ================== BACKWARDS COMPATIBILITY ==================

  checkForLegacyData() {
    // Check if there's any indication of legacy data to import
    console.log('Checking for legacy data...');
    
    // This could be extended to check for specific legacy cache keys
    // or offer to import from uploaded files
  }

  // Process legacy JSON format (from the uploaded file)
  processLegacyData(data) {
    console.log('Processing legacy data format:', data);
    
    try {
      // Clear current state
      this.renderer.nodes.clear();
      this.renderer.clearConnections();
      this.personData = new Map();
      this.hiddenConnections = new Set();
      this.lineOnlyConnections = new Set();
      
      // Process font settings if available
      if (data.fontSettings) {
        this.fontFamily = data.fontSettings.fontFamily || this.fontFamily;
        this.fontSize = data.fontSettings.fontSize || this.fontSize;
        this.nameColor = data.fontSettings.nameColor || this.nameColor;
        this.dateColor = data.fontSettings.dateColor || this.dateColor;
        this.updateRendererSettings();
      }
      
      // Convert legacy people format to new format
      let maxId = 0;
      for (const person of data.people) {
        const nodeData = {
          x: person.cx || 0,
          y: person.cy || 0,
          name: person.name || '',
          fatherName: person.father_name || '',
          surname: person.surname || '',
          maidenName: person.birth_name || '', // Convert birth_name to maidenName
          dob: person.dob || '',
          gender: person.gender || '',
          color: person.fill || this.defaultColor, // Convert fill to color
          radius: person.r || this.nodeRadius // Convert r to radius
        };
        
        this.renderer.setNode(person.id, nodeData);
        
        // Store person data with converted field names
        this.personData.set(person.id, {
          name: person.name || '',
          fatherName: person.father_name || '',
          surname: person.surname || '',
          maidenName: person.birth_name || '',
          dob: person.dob || '',
          gender: person.gender || '',
          motherId: person.mother_id || '',
          fatherId: person.father_id || '',
          spouseId: person.spouse_id || ''
        });
        
        // Track max ID for new person creation
        const numId = parseInt(person.id.replace('p', ''));
        if (!isNaN(numId) && numId > maxId) {
          maxId = numId;
        }
      }
      
      this.nextId = maxId + 1;
      
      // Process relations if available
      if (data.relations) {
        // Convert relations to connections
        for (const relation of data.relations) {
          if (relation.relationship === 'family') {
            this.renderer.addConnection(relation.source, relation.target, 'parent');
          }
        }
      } else {
        // Generate connections from family relationships
        this.regenerateConnections();
      }
      
      // Reset undo/redo
      this.undoStack = [];
      this.redoStack = [];
      this.pushUndoState();
      
      // Save the converted data to cache
      this.saveToCache();
      
      notifications.success('Legacy Data Loaded', 'Family tree imported and converted successfully');
      console.log('Legacy data processed successfully');
      
    } catch (error) {
      console.error('Error processing legacy data:', error);
      notifications.error('Import Failed', 'Could not process legacy family tree data');
      throw error;
    }
  }

  // Enhanced loadFromJSON to handle both formats
  processLoadedData(data) {
    console.log('Processing loaded data, version:', data.version);
    
    // Detect and handle different formats
    if (data.people && !data.persons) {
      // Legacy format
      return this.processLegacyData(data);
    }
    
    // New format processing (existing code with enhancements)
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
    
    // Restore camera
    if (data.camera && this.renderer) {
      this.renderer.setCamera(data.camera.x, data.camera.y, data.camera.scale);
    }
    
    // Restore hidden/line-only connections
    if (data.hiddenConnections) {
      this.hiddenConnections = new Set(data.hiddenConnections);
    }
    if (data.lineOnlyConnections) {
      this.lineOnlyConnections = new Set(data.lineOnlyConnections);
    }
    
    // Restore person data
    if (data.personData && Array.isArray(data.personData)) {
      // Handle array format (from cache)
      for (const [id, personData] of data.personData) {
        this.personData.set(id, personData);
      }
    }
    
    // Restore next ID
    if (data.nextId) {
      this.nextId = data.nextId;
    }
    
    // Process persons
    let maxId = 0;
    const persons = data.persons || [];
    for (const person of persons) {
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
      
      // Store/update person data
      if (!this.personData.has(person.id)) {
        this.personData.set(person.id, {
          name: person.name || '',
          fatherName: person.fatherName || person.father_name || '',
          surname: person.surname || '',
          maidenName: person.maidenName || person.birthName || person.birth_name || '',
          dob: person.dob || '',
          gender: person.gender || '',
          motherId: person.motherId || person.mother_id || '',
          fatherId: person.fatherId || person.father_id || '',
          spouseId: person.spouseId || person.spouse_id || ''
        });
      }
      
      const numId = parseInt(person.id.replace('p', ''));
      if (!isNaN(numId) && numId > maxId) {
        maxId = numId;
      }
    }
    
    if (maxId >= this.nextId) {
      this.nextId = maxId + 1;
    }
    
    this.regenerateConnections();
    
    this.undoStack = [];
    this.redoStack = [];
    this.pushUndoState();
    
    // Save to cache after successful load
    this.saveToCache();
  }

  // Enhanced JSON export with backwards compatibility markers
  saveToJSON() {
    const data = {
      version: '2.5',
      timestamp: Date.now(),
      format: 'MapMyRoots_Canvas',
      backwards_compatible: true,
      settings: {
        nodeRadius: this.nodeRadius,
        defaultColor: this.defaultColor,
        fontFamily: this.fontFamily,
        fontSize: this.fontSize,
        nameColor: this.nameColor,
        dateColor: this.dateColor
      },
      displayPreferences: { ...this.displayPreferences },
      nodeStyle: this.nodeStyle,
      camera: this.renderer.getCamera(),
      hiddenConnections: Array.from(this.hiddenConnections),
      lineOnlyConnections: Array.from(this.lineOnlyConnections),
      persons: this.getPersonsArray(),
      
      // Legacy compatibility section
      legacy_format: {
        people: this.convertToLegacyPeople(),
        relations: this.convertToLegacyRelations(),
        fontSettings: {
          fontFamily: this.fontFamily,
          fontSize: this.fontSize,
          nameColor: this.nameColor,
          dateColor: this.dateColor
        }
      }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `family_tree_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  convertToLegacyPeople() {
    const legacyPeople = [];
    if (this.renderer && this.renderer.nodes) {
      for (const [id, node] of this.renderer.nodes) {
        const personData = this.personData?.get(id) || {};
        legacyPeople.push({
          id: id,
          name: node.name || '',
          father_name: node.fatherName || '',
          surname: node.surname || '',
          birth_name: node.maidenName || '',
          dob: node.dob || '',
          gender: node.gender || '',
          mother_id: personData.motherId || '',
          father_id: personData.fatherId || '',
          spouse_id: personData.spouseId || '',
          cx: node.x,
          cy: node.y,
          r: node.radius || this.nodeRadius,
          fill: node.color || this.defaultColor
        });
      }
    }
    return legacyPeople;
  }

  convertToLegacyRelations() {
    const relations = [];
    
    // Convert family relationships to legacy relations format
    for (const [childId, childData] of (this.personData || new Map())) {
      if (childData.motherId) {
        relations.push({
          source: childData.motherId,
          target: childId,
          relationship: 'family'
        });
      }
      if (childData.fatherId) {
        relations.push({
          source: childData.fatherId,
          target: childId,
          relationship: 'family'
        });
      }
      if (childData.spouseId && childId < childData.spouseId) {
        relations.push({
          source: childId,
          target: childData.spouseId,
          relationship: 'spouse'
        });
      }
    }
    
    return relations;
  }

  // Enhanced loadFromJSON to detect and handle format
  loadFromJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        
        console.log('Loaded JSON data:', data);
        
        // Detect format
        if (data.people && !data.persons) {
          console.log('Detected legacy format');
          notifications.info('Legacy Format Detected', 'Converting legacy family tree format...');
          this.processLegacyData(data);
        } else if (data.persons || data.format === 'MapMyRoots_Canvas') {
          console.log('Detected new format');
          this.processLoadedData(data);
        } else {
          notifications.warning('Unknown Format', 'File format not recognized, attempting to import...');
          this.processLoadedData(data);
        }
        
        notifications.success('Import Complete', 'Family tree loaded successfully');
      } catch (error) {
        console.error('Error parsing JSON:', error);
        notifications.error('Import Failed', 'Invalid JSON format or corrupted file');
      }
    };
    reader.readAsText(file);
  }

  // Setup node style switcher
  setupNodeStyleSwitcher() {
    console.log('Setting up node style switcher...');
    
    document.querySelectorAll('.node-style-option').forEach(option => {
      option.addEventListener('click', () => {
        console.log('Node style option clicked:', option);
        
        document.querySelectorAll('.node-style-option').forEach(opt => {
          opt.classList.remove('selected');
        });
        
        option.classList.add('selected');
        
        const style = option.getAttribute('data-style');
        console.log('Node style changed to:', style);
        
        this.nodeStyle = style;
        if (this.renderer) {
          this.renderer.setNodeStyle(style);
        }
        
        notifications.success('Style Updated', `Node style changed to ${style}`);
        this.pushUndoState();
        this.autoSave(); // Auto-save after style change
      });
    });
    
    console.log('Node style switcher setup complete');
  }

  // Setup display preferences
  setupDisplayPreferences() {
    console.log('Setting up display preferences...');
    
    const preferences = ['showMaidenName', 'showDateOfBirth', 'showFatherName'];
    
    preferences.forEach(prefId => {
      const checkbox = document.getElementById(prefId);
      if (checkbox) {
        console.log(`Setting up checkbox: ${prefId}`);
        
        // Set initial value
        checkbox.checked = this.displayPreferences[prefId];
        
        checkbox.addEventListener('change', () => {
          const prefKey = prefId;
          const newValue = checkbox.checked;
          
          console.log(`Display preference ${prefKey} changed to:`, newValue);
          
          // Update the preference
          this.displayPreferences[prefKey] = newValue;
          
          // Update renderer
          if (this.renderer) {
            this.renderer.updateDisplayPreferences(this.displayPreferences);
          }
          
          // Show notification
          const label = checkbox.parentNode.querySelector('label').textContent;
          notifications.info('Display Updated', `${label} ${newValue ? 'enabled' : 'disabled'}`);
          
          // Save state and auto-save
          this.pushUndoState();
        });
        
        console.log(`Checkbox ${prefId} setup complete`);
      } else {
        console.warn(`Checkbox ${prefId} not found`);
      }
    });
    
    console.log('Display preferences setup complete');
  }

  // Handle save person from modal event
  handleSavePersonFromModal(data) {
    console.log('Handling save person from modal:', data);
    
    const personData = {
      name: data.name,
      fatherName: data.fatherName,
      surname: data.surname,
      maidenName: data.maidenName,
      dob: data.dob,
      gender: data.gender,
      motherId: data.motherId,
      fatherId: data.fatherId,
      spouseId: data.spouseId
    };
    
    try {
      if (data.editingId) {
        console.log('Updating existing person:', data.editingId);
        this.updateExistingPerson(data.editingId, personData);
        notifications.success('Person Updated', `${data.name} has been updated`);
      } else {
        console.log('Creating new person');
        this.createNewPerson(personData);
        notifications.success('Person Added', `${data.name} has been added to the tree`);
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
      
      console.log('Person saved successfully');
      
    } catch (error) {
      console.error('Error saving person:', error);
      notifications.error('Save Failed', 'Error saving person. Please try again.');
    }
  }

  // Update all nodes to reflect display preferences
  updateAllNodesDisplay() {
    if (!this.renderer) return;
    
    console.log('Updating all nodes display with preferences:', this.displayPreferences);
    
    // Update renderer display preferences
    this.renderer.updateDisplayPreferences(this.displayPreferences);
    
    // Re-render all nodes
    for (const [id, node] of this.renderer.nodes) {
      const personData = this.getPersonData(id) || {};
      this.renderer.setNode(id, {
        ...node,
        ...personData
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
    this.renderer.settings.nodeStyle = this.nodeStyle;
    this.renderer.updateDisplayPreferences(this.displayPreferences);
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
    
    notifications.info('Line Hidden', 'Connection line hidden (relationship data preserved)');
    
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
    console.log('Setting up settings panel...');
    
    // Apply node style button
    const applyBtn = document.getElementById('applyNodeStyle');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        const color = document.getElementById('nodeColorPicker').value;
        const size = parseInt(document.getElementById('nodeSizeInput').value, 10);
        
        console.log('Applying node style:', { color, size });
        
        if (!isNaN(size) && size > 0) {
          this.nodeRadius = size;
          this.defaultColor = color;
          this.updateRendererSettings();
          this.updateAllExistingNodes();
          notifications.success('Style Applied', 'Node appearance updated');
          this.pushUndoState();
        } else {
          notifications.error('Invalid Size', 'Please enter a valid node size');
        }
      });
      console.log('Apply node style button setup complete');
    }

    // Font settings
    const fontSelect = document.getElementById('fontSelect');
    if (fontSelect) {
      fontSelect.addEventListener('change', (e) => {
        this.fontFamily = e.target.value;
        this.updateRendererSettings();
        this.updateAllExistingNodes();
        notifications.success('Font Changed', `Font changed to ${e.target.value}`);
        this.pushUndoState();
      });
      console.log('Font select setup complete');
    }

    const fontSizeInput = document.getElementById('fontSizeInput');
    if (fontSizeInput) {
      fontSizeInput.addEventListener('change', (e) => {
        const newSize = parseInt(e.target.value, 10);
        if (!isNaN(newSize) && newSize > 0) {
          this.fontSize = newSize;
          this.updateRendererSettings();
          this.updateAllExistingNodes();
          notifications.success('Font Size Changed', `Font size changed to ${newSize}px`);
          this.pushUndoState();
        }
      });
      console.log('Font size input setup complete');
    }

    const nameColorPicker = document.getElementById('nameColorPicker');
    if (nameColorPicker) {
      nameColorPicker.addEventListener('change', (e) => {
        this.nameColor = e.target.value;
        this.updateRendererSettings();
        this.updateAllExistingNodes();
        notifications.success('Name Color Changed', 'Name color updated');
        this.pushUndoState();
      });
      console.log('Name color picker setup complete');
    }

    const dateColorPicker = document.getElementById('dateColorPicker');
    if (dateColorPicker) {
      dateColorPicker.addEventListener('change', (e) => {
        this.dateColor = e.target.value;
        this.updateRendererSettings();
        this.updateAllExistingNodes();
        notifications.success('Date Color Changed', 'Date color updated');
        this.pushUndoState();
      });
      console.log('Date color picker setup complete');
    }
    
    console.log('Settings panel setup complete');
  }

  // Update all existing nodes with new settings
  updateAllExistingNodes() {
    if (!this.renderer) return;
    
    console.log('Updating all existing nodes with new settings');
    
    for (const [id, node] of this.renderer.nodes) {
      const personData = this.getPersonData(id) || {};
      this.renderer.setNode(id, {
        ...node,
        ...personData,
        // Apply current default settings to nodes that don't have custom settings
        color: node.color || this.defaultColor,
        radius: node.radius || this.nodeRadius
      });
    }
    
    this.renderer.needsRedraw = true;
  }

  setupExport() {
    // SVG Export
    document.getElementById('exportSvg')?.addEventListener('click', () => {
      const loadingId = notifications.loading('Exporting...', 'Generating SVG file');
      
      try {
        setTimeout(() => {
          this.exportCanvasAsSVG();
          notifications.remove(loadingId);
          notifications.success('Export Complete', 'SVG file has been downloaded');
        }, 100);
      } catch (error) {
        notifications.remove(loadingId);
        notifications.error('Export Failed', 'Error generating SVG file');
        console.error('SVG export error:', error);
      }
    });
    
    // PNG Export
    document.getElementById('exportPng')?.addEventListener('click', () => {
      const loadingId = notifications.loading('Exporting...', 'Generating PNG file');
      
      try {
        setTimeout(() => {
          this.exportCanvasAsPNG();
          notifications.remove(loadingId);
          notifications.success('Export Complete', 'PNG file has been downloaded');
        }, 100);
      } catch (error) {
        notifications.remove(loadingId);
        notifications.error('Export Failed', 'Error generating PNG file');
        console.error('PNG export error:', error);
      }
    });
    
    // PDF Export - FIXED: Now implemented for canvas renderer
    document.getElementById('exportPdf')?.addEventListener('click', () => {
      const loadingId = notifications.loading('Exporting...', 'Generating PDF file');
      
      try {
        setTimeout(() => {
          this.exportCanvasAsPDF();
          notifications.remove(loadingId);
        }, 100);
      } catch (error) {
        notifications.remove(loadingId);
        notifications.error('Export Failed', 'Error generating PDF file');
        console.error('PDF export error:', error);
      }
    });
    
    // JSON Save
    document.getElementById('saveData')?.addEventListener('click', () => {
      const loadingId = notifications.loading('Saving...', 'Generating JSON file');
      
      try {
        setTimeout(() => {
          this.saveToJSON();
          notifications.remove(loadingId);
          notifications.success('Save Complete', 'Family tree saved to JSON file');
        }, 100);
      } catch (error) {
        notifications.remove(loadingId);
        notifications.error('Save Failed', 'Error saving family tree');
        console.error('Save error:', error);
      }
    });
    
    // JSON Load
    document.getElementById('loadData')?.addEventListener('change', (e) => {
      const loadingId = notifications.loading('Loading...', 'Processing JSON file');
      
      try {
        setTimeout(() => {
          this.loadFromJSON(e);
          notifications.remove(loadingId);
        }, 100);
      } catch (error) {
        notifications.remove(loadingId);
        notifications.error('Load Failed', 'Error loading family tree');
        console.error('Load error:', error);
      }
    });
  }

  // ================== ADVANCED EXPORT FUNCTIONALITY ==================
  
  setupAdvancedExport() {
    console.log('Setting up advanced export functionality...');
    
    // GEDCOM Export
    document.getElementById('exportGedcom')?.addEventListener('click', () => {
      console.log('GEDCOM export button clicked');
      exportGEDCOM().catch(error => {
        console.error('GEDCOM export error:', error);
        notifications.error('GEDCOM Export Failed', 'Error exporting GEDCOM file');
      });
    });
    
    // PDF Layout Export
    document.getElementById('exportPdfLayout')?.addEventListener('click', () => {
      console.log('PDF Layout export button clicked');
      exportPDFLayout().catch(error => {
        console.error('PDF Layout export error:', error);
        notifications.error('PDF Layout Export Failed', 'Error exporting PDF layout');
      });
    });
    
    console.log('Advanced export setup complete');
  }

  // FIXED: Implement basic PDF export for canvas
  async exportCanvasAsPDF() {
    try {
      // Import the enhanced PDF export function
      const { exportCanvasPDF } = await import('./exporter.js');
      await exportCanvasPDF();
    } catch (error) {
      console.error('Error exporting PDF:', error);
      notifications.error('Export Failed', 'Could not export PDF: ' + error.message);
    }
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
    const maidenNameInput = document.getElementById('personMaidenName').value.trim();
    const dobInput = document.getElementById('personDob').value.trim();
    const genderInput = getSelectedGender();

    const motherId = document.querySelector('#motherSelect input[type="hidden"]')?.value || '';
    const fatherId = document.querySelector('#fatherSelect input[type="hidden"]')?.value || '';
    const spouseId = document.querySelector('#spouseSelect input[type="hidden"]')?.value || '';

    if (!nameInput || !genderInput) {
      notifications.error('Validation Error', 'Name and Gender are required.');
      return;
    }

    const modal = document.getElementById('personModal');
    const editingId = modal?.dataset.editingId;
    
    const personData = {
      name: nameInput,
      fatherName: fatherNameInput,
      surname: surnameInput,
      maidenName: maidenNameInput,
      dob: dobInput,
      gender: genderInput,
      motherId,
      fatherId,
      spouseId
    };
    
    try {
      if (editingId) {
        this.updateExistingPerson(editingId, personData);
        notifications.success('Person Updated', `${nameInput} has been updated`);
      } else {
        this.createNewPerson(personData);
        notifications.success('Person Added', `${nameInput} has been added to the tree`);
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
      notifications.error('Save Failed', 'Error saving person. Please try again.');
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

  // Connection management methods
  handleConnectSelected() {
    this.selectedCircles = this.renderer.getSelectedNodes();
    
    if (this.selectedCircles.size !== 2) {
      notifications.warning('Selection Error', 'Please select exactly 2 circles to connect.');
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
      notifications.success('Connection Added', 'Line-only connection created');
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
          notifications.error('Connection Error', 'Parent gender must be specified to create parent-child relationship.');
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
    
    notifications.success('Connection Added', `Connected as ${relationship}`);
    
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
    
    notifications.success('Deleted', `${count} person(s) deleted`);
  }

  // Style modal methods
  openStyleModal() {
    this.selectedCircles = this.renderer.getSelectedNodes();
    
    if (this.selectedCircles.size === 0) {
      notifications.warning('No Selection', 'Please select at least one circle to style.');
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
      notifications.error('Invalid Size', 'Please enter a valid size.');
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
    
    notifications.success('Styles Applied', `Updated ${this.selectedCircles.size} node(s)`);
    
    console.log('Styles applied successfully');
  }

  closeStyleModal() {
    const styleModal = document.getElementById('styleModal');
    if (styleModal) {
      styleModal.classList.add('hidden');
      styleModal.style.display = 'none';
    }
  }

  // Undo/Redo functionality
  undo() {
    if (this.undoStack.length < 2) {
      notifications.info('Undo', 'Nothing to undo');
      return;
    }
    
    const current = this.undoStack.pop();
    this.redoStack.push(current);
    
    const previous = this.undoStack[this.undoStack.length - 1];
    this.restoreState(previous);
    
    notifications.info('Undo', 'Action undone');
  }

  redo() {
    if (this.redoStack.length === 0) {
      notifications.info('Redo', 'Nothing to redo');
      return;
    }
    
    const next = this.redoStack.pop();
    this.undoStack.push(next);
    this.restoreState(next);
    
    notifications.info('Redo', 'Action redone');
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
      // Update UI selection
      document.querySelectorAll('.node-style-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.getAttribute('data-style') === this.nodeStyle) {
          opt.classList.add('selected');
        }
      });
    }
    
    // Restore settings
    if (state.settings) {
      this.nodeRadius = state.settings.nodeRadius || this.nodeRadius;
      this.defaultColor = state.settings.defaultColor || this.defaultColor;
      this.fontFamily = state.settings.fontFamily || this.fontFamily;
      this.fontSize = state.settings.fontSize || this.fontSize;
      this.nameColor = state.settings.nameColor || this.nameColor;
      this.dateColor = state.settings.dateColor || this.dateColor;
      
      // Update UI inputs
      document.getElementById('nodeColorPicker').value = this.defaultColor;
      document.getElementById('nodeSizeInput').value = this.nodeRadius;
      document.getElementById('fontSelect').value = this.fontFamily;
      document.getElementById('fontSizeInput').value = this.fontSize;
      document.getElementById('nameColorPicker').value = this.nameColor;
      document.getElementById('dateColorPicker').value = this.dateColor;
    }
    
    if (state.camera) {
      this.renderer.setCamera(state.camera.x, state.camera.y, state.camera.scale);
    }
    
    this.updateRendererSettings();
    this.regenerateConnections();
    this.clearSelection();
  }

  // Enhanced pushUndoState with auto-save
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
        dateColor: this.dateColor
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

  // Cleanup method
  destroy() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    
    // Final save before destroy
    this.saveToCache();
    
    if (this.renderer) {
      this.renderer.destroy();
    }
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
