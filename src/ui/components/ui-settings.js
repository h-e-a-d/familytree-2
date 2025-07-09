// ui-settings.js
// Settings and display preferences manager for family tree

import { notifications } from './notifications.js';

export function setupSettings(treeCore) {
  // --- Settings Panel ---
  const applyBtn = document.getElementById('applyNodeStyle');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const color = document.getElementById('nodeColorPicker').value;
      const size = parseInt(document.getElementById('nodeSizeInput').value, 10);
      if (!isNaN(size) && size > 0) {
        treeCore.nodeRadius = size;
        treeCore.defaultColor = color;
        treeCore.updateRendererSettings();
        treeCore.updateAllExistingNodes();
        notifications.success('Style Applied', 'Node appearance updated');
        treeCore.undoRedoManager.pushUndoState();
      } else {
        notifications.error('Invalid Size', 'Please enter a valid node size');
      }
    });
  }

  const fontSelect = document.getElementById('fontSelect');
  if (fontSelect) {
    fontSelect.addEventListener('change', (e) => {
      treeCore.fontFamily = e.target.value;
      treeCore.updateRendererSettings();
      treeCore.updateAllExistingNodes();
      notifications.success('Font Changed', `Font changed to ${e.target.value}`);
      treeCore.undoRedoManager.pushUndoState();
    });
  }

  const fontSizeInput = document.getElementById('fontSizeInput');
  if (fontSizeInput) {
    fontSizeInput.addEventListener('change', (e) => {
      const newSize = parseInt(e.target.value, 10);
      if (!isNaN(newSize) && newSize > 0) {
        treeCore.fontSize = newSize;
        treeCore.updateRendererSettings();
        treeCore.updateAllExistingNodes();
        notifications.success('Font Size Changed', `Font size changed to ${newSize}px`);
        treeCore.undoRedoManager.pushUndoState();
      }
    });
  }

  const nameColorPicker = document.getElementById('nameColorPicker');
  if (nameColorPicker) {
    nameColorPicker.addEventListener('change', (e) => {
      treeCore.nameColor = e.target.value;
      treeCore.updateRendererSettings();
      treeCore.updateAllExistingNodes();
      notifications.success('Name Color Changed', 'Name color updated');
      treeCore.undoRedoManager.pushUndoState();
    });
  }

  const dateColorPicker = document.getElementById('dateColorPicker');
  if (dateColorPicker) {
    dateColorPicker.addEventListener('change', (e) => {
      treeCore.dateColor = e.target.value;
      treeCore.updateRendererSettings();
      treeCore.updateAllExistingNodes();
      notifications.success('Date Color Changed', 'Date color updated');
      treeCore.undoRedoManager.pushUndoState();
    });
  }

  // --- Node Outline Settings ---
  const showNodeOutline = document.getElementById('showNodeOutline');
  if (showNodeOutline) {
    showNodeOutline.checked = treeCore.renderer?.settings.showNodeOutline ?? true;
    showNodeOutline.addEventListener('change', () => {
      if (treeCore.renderer) {
        treeCore.renderer.settings.showNodeOutline = showNodeOutline.checked;
        treeCore.renderer.needsRedraw = true;
      }
      notifications.info('Outline Toggle', `Node outline ${showNodeOutline.checked ? 'enabled' : 'disabled'}`);
      treeCore.undoRedoManager.pushUndoState();
    });
  }

  const outlineThicknessInput = document.getElementById('outlineThicknessInput');
  if (outlineThicknessInput) {
    outlineThicknessInput.value = treeCore.renderer?.settings.outlineThickness ?? 2;
  }

  const outlineColorPicker = document.getElementById('outlineColorPicker');
  if (outlineColorPicker) {
    outlineColorPicker.value = treeCore.renderer?.settings.outlineColor ?? '#2c3e50';
  }

  const applyOutlineStyle = document.getElementById('applyOutlineStyle');
  if (applyOutlineStyle) {
    applyOutlineStyle.addEventListener('click', () => {
      const thickness = parseInt(outlineThicknessInput.value, 10);
      const color = outlineColorPicker.value;
      
      if (!isNaN(thickness) && thickness >= 0) {
        if (treeCore.renderer) {
          treeCore.renderer.settings.outlineThickness = thickness;
          treeCore.renderer.settings.outlineColor = color;
          treeCore.renderer.needsRedraw = true;
        }
        notifications.success('Outline Applied', 'Node outline settings updated');
        treeCore.undoRedoManager.pushUndoState();
      } else {
        notifications.error('Invalid Thickness', 'Please enter a valid outline thickness');
      }
    });
  }

  // --- Connector Line Settings ---
  // Family connections
  const familyLineStyleSelect = document.getElementById('familyLineStyleSelect');
  const familyLineThicknessInput = document.getElementById('familyLineThicknessInput');
  const familyLineColorPicker = document.getElementById('familyLineColorPicker');
  
  if (familyLineStyleSelect) {
    familyLineStyleSelect.value = treeCore.renderer?.settings.familyLineStyle ?? 'solid';
  }
  if (familyLineThicknessInput) {
    familyLineThicknessInput.value = treeCore.renderer?.settings.familyLineThickness ?? 2;
  }
  if (familyLineColorPicker) {
    familyLineColorPicker.value = treeCore.renderer?.settings.familyLineColor ?? '#7f8c8d';
  }

  // Spouse connections
  const spouseLineStyleSelect = document.getElementById('spouseLineStyleSelect');
  const spouseLineThicknessInput = document.getElementById('spouseLineThicknessInput');
  const spouseLineColorPicker = document.getElementById('spouseLineColorPicker');
  
  if (spouseLineStyleSelect) {
    spouseLineStyleSelect.value = treeCore.renderer?.settings.spouseLineStyle ?? 'dashed';
  }
  if (spouseLineThicknessInput) {
    spouseLineThicknessInput.value = treeCore.renderer?.settings.spouseLineThickness ?? 2;
  }
  if (spouseLineColorPicker) {
    spouseLineColorPicker.value = treeCore.renderer?.settings.spouseLineColor ?? '#e74c3c';
  }

  // Line-only connections
  const lineOnlyStyleSelect = document.getElementById('lineOnlyStyleSelect');
  const lineOnlyThicknessInput = document.getElementById('lineOnlyThicknessInput');
  const lineOnlyColorPicker = document.getElementById('lineOnlyColorPicker');
  
  if (lineOnlyStyleSelect) {
    lineOnlyStyleSelect.value = treeCore.renderer?.settings.lineOnlyStyle ?? 'dash-dot';
  }
  if (lineOnlyThicknessInput) {
    lineOnlyThicknessInput.value = treeCore.renderer?.settings.lineOnlyThickness ?? 2;
  }
  if (lineOnlyColorPicker) {
    lineOnlyColorPicker.value = treeCore.renderer?.settings.lineOnlyColor ?? '#9b59b6';
  }

  const applyLineStyles = document.getElementById('applyLineStyles');
  if (applyLineStyles) {
    applyLineStyles.addEventListener('click', () => {
      if (treeCore.renderer) {
        // Family connections
        treeCore.renderer.settings.familyLineStyle = familyLineStyleSelect.value;
        treeCore.renderer.settings.familyLineThickness = parseInt(familyLineThicknessInput.value, 10);
        treeCore.renderer.settings.familyLineColor = familyLineColorPicker.value;
        
        // Spouse connections
        treeCore.renderer.settings.spouseLineStyle = spouseLineStyleSelect.value;
        treeCore.renderer.settings.spouseLineThickness = parseInt(spouseLineThicknessInput.value, 10);
        treeCore.renderer.settings.spouseLineColor = spouseLineColorPicker.value;
        
        // Line-only connections
        treeCore.renderer.settings.lineOnlyStyle = lineOnlyStyleSelect.value;
        treeCore.renderer.settings.lineOnlyThickness = parseInt(lineOnlyThicknessInput.value, 10);
        treeCore.renderer.settings.lineOnlyColor = lineOnlyColorPicker.value;
        
        treeCore.renderer.needsRedraw = true;
      }
      notifications.success('Line Styles Applied', 'Connector line styles updated');
      treeCore.undoRedoManager.pushUndoState();
    });
  }

  // --- Node Style Selection ---
  const nodeStyleOptions = document.querySelectorAll('.node-style-option');
  if (nodeStyleOptions.length > 0) {
    // Set initial selection based on current node style
    nodeStyleOptions.forEach(option => {
      option.classList.remove('selected');
      if (option.getAttribute('data-style') === treeCore.nodeStyle) {
        option.classList.add('selected');
      }
    });

    // Add click event listeners
    nodeStyleOptions.forEach(option => {
      option.addEventListener('click', () => {
        const selectedStyle = option.getAttribute('data-style');
        
        // Update visual selection
        nodeStyleOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        
        // Update tree core node style
        treeCore.nodeStyle = selectedStyle;
        
        // Update renderer settings
        if (treeCore.renderer) {
          treeCore.renderer.settings.nodeStyle = selectedStyle;
          treeCore.renderer.needsRedraw = true;
        }
        
        // Update all existing nodes
        treeCore.updateAllExistingNodes();
        
        // Show notification
        const styleName = selectedStyle === 'circle' ? 'Circle' : 'Rectangle';
        notifications.success('Node Style Changed', `Changed to ${styleName} style`);
        
        // Save state for undo
        treeCore.undoRedoManager.pushUndoState();
      });
    });
  }

  // --- Display Preferences ---
  const preferences = ['showMaidenName', 'showDateOfBirth', 'showFatherName'];
  preferences.forEach(prefId => {
    const checkbox = document.getElementById(prefId);
    if (checkbox) {
      checkbox.checked = treeCore.displayPreferences[prefId];
      checkbox.addEventListener('change', () => {
        const prefKey = prefId;
        const newValue = checkbox.checked;
        treeCore.displayPreferences[prefKey] = newValue;
        if (treeCore.renderer) {
          treeCore.renderer.updateDisplayPreferences(treeCore.displayPreferences);
        }
        const label = checkbox.parentNode.querySelector('label').textContent;
        notifications.info('Display Updated', `${label} ${newValue ? 'enabled' : 'disabled'}`);
        treeCore.undoRedoManager.pushUndoState();
      });
    }
  });

  // --- Load Default Tree Button ---
  const loadDefaultBtn = document.getElementById('loadDefaultBtn');
  if (loadDefaultBtn) {
    loadDefaultBtn.addEventListener('click', () => {
      openLoadDefaultModal();
    });
  }

  // Load Default Tree Modal handlers
  function openLoadDefaultModal() {
    const modal = document.getElementById('loadDefaultConfirmModal');
    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  function closeLoadDefaultModal() {
    const modal = document.getElementById('loadDefaultConfirmModal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  // Modal event listeners
  const cancelLoadDefaultBtn = document.getElementById('cancelLoadDefault');
  const confirmLoadDefaultBtn = document.getElementById('confirmLoadDefault');
  const loadDefaultModal = document.getElementById('loadDefaultConfirmModal');

  if (cancelLoadDefaultBtn) {
    cancelLoadDefaultBtn.addEventListener('click', closeLoadDefaultModal);
  }

  if (confirmLoadDefaultBtn) {
    confirmLoadDefaultBtn.addEventListener('click', () => {
      loadDefaultTemplate(treeCore);
      closeLoadDefaultModal();
    });
  }

  if (loadDefaultModal) {
    const closeBtn = loadDefaultModal.querySelector('.modal-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeLoadDefaultModal);
    }

    // Close on background click
    loadDefaultModal.addEventListener('click', (e) => {
      if (e.target === loadDefaultModal) {
        closeLoadDefaultModal();
      }
    });
  }

  // Load Default Template Function
  async function loadDefaultTemplate(treeCore) {
    try {
      notifications.info('Loading Template', 'Loading default family tree template...');
      
      const response = await fetch('./docs/templates/default.json');
      if (!response.ok) {
        throw new Error(`Failed to load template: ${response.status}`);
      }
      
      const defaultData = await response.json();
      
      // Process the template data
      treeCore.processLoadedData(defaultData);
      
      // Update cache indicator if available
      if (treeCore.enhancedCacheIndicator) {
        treeCore.enhancedCacheIndicator.updateStats();
        treeCore.enhancedCacheIndicator.updateSaveStatus('Template loaded');
      }
      
      // Auto-save the new data
      if (treeCore.cacheManager) {
        treeCore.cacheManager.autoSave();
      }
      
      // Update undo/redo state
      if (treeCore.undoRedoManager) {
        treeCore.undoRedoManager.clearStacks();
        treeCore.undoRedoManager.pushUndoState();
      }
      
      notifications.success('Template Loaded', 'Default family tree template loaded successfully');
      
    } catch (error) {
      console.error('Failed to load default template:', error);
      notifications.error('Load Failed', 'Failed to load default template. Please try again.');
    }
  }

  // Attach helpers to treeCore
  treeCore.updateRendererSettings = function() {
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
  };

  treeCore.updateAllExistingNodes = function() {
    if (!this.renderer) return;
    for (const [id, node] of this.renderer.nodes) {
      const personData = this.getPersonData(id) || {};
      this.renderer.setNode(id, {
        ...node,
        ...personData,
        color: node.color || this.defaultColor,
        radius: node.radius || this.nodeRadius
      });
    }
    this.renderer.needsRedraw = true;
  };
} 