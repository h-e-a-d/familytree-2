// core-undoRedo.js
// Undo/Redo manager for family tree

export class UndoRedoManager {
  constructor(treeCore, notifications) {
    this.treeCore = treeCore;
    this.notifications = notifications;
    this.undoStack = [];
    this.redoStack = [];
    this.maxUndoSize = 50;
  }

  undo() {
    if (this.undoStack.length < 2) {
      this.notifications.info('Undo', 'Nothing to undo');
      return;
    }
    const current = this.undoStack.pop();
    this.redoStack.push(current);
    const previous = this.undoStack[this.undoStack.length - 1];
    this.restoreState(previous);
    this.notifications.info('Undo', 'Action undone');
    this.updateButtonStates();
  }

  redo() {
    if (this.redoStack.length === 0) {
      this.notifications.info('Redo', 'Nothing to redo');
      return;
    }
    const next = this.redoStack.pop();
    this.undoStack.push(next);
    this.restoreState(next);
    this.notifications.info('Redo', 'Action redone');
    this.updateButtonStates();
  }

  pushUndoState() {
    const tc = this.treeCore;
    const state = {
      nodes: new Map(),
      personData: new Map(tc.personData || []),
      camera: tc.renderer ? tc.renderer.getCamera() : { x: 0, y: 0, scale: 1 },
      hiddenConnections: new Set(tc.hiddenConnections),
      lineOnlyConnections: new Set(tc.lineOnlyConnections),
      displayPreferences: { ...tc.displayPreferences },
      nodeStyle: tc.nodeStyle,
      settings: {
        nodeRadius: tc.nodeRadius,
        defaultColor: tc.defaultColor,
        fontFamily: tc.fontFamily,
        fontSize: tc.fontSize,
        nameColor: tc.nameColor,
        dateColor: tc.dateColor,
        
        // Node outline settings
        showNodeOutline: tc.renderer?.settings.showNodeOutline ?? true,
        outlineColor: tc.renderer?.settings.outlineColor ?? '#2c3e50',
        outlineThickness: tc.renderer?.settings.outlineThickness ?? 2,
        
        // Line style settings
        familyLineStyle: tc.renderer?.settings.familyLineStyle ?? 'solid',
        familyLineThickness: tc.renderer?.settings.familyLineThickness ?? 2,
        familyLineColor: tc.renderer?.settings.familyLineColor ?? '#7f8c8d',
        
        spouseLineStyle: tc.renderer?.settings.spouseLineStyle ?? 'dashed',
        spouseLineThickness: tc.renderer?.settings.spouseLineThickness ?? 2,
        spouseLineColor: tc.renderer?.settings.spouseLineColor ?? '#e74c3c',
        
        lineOnlyStyle: tc.renderer?.settings.lineOnlyStyle ?? 'dash-dot',
        lineOnlyThickness: tc.renderer?.settings.lineOnlyThickness ?? 2,
        lineOnlyColor: tc.renderer?.settings.lineOnlyColor ?? '#9b59b6'
      }
    };
    if (tc.renderer) {
      for (const [id, node] of tc.renderer.nodes) {
        state.nodes.set(id, { ...node });
      }
    }
    this.undoStack.push(state);
    if (this.undoStack.length > this.maxUndoSize) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    if (tc.enhancedCacheIndicator) {
      tc.enhancedCacheIndicator.updateStats();
    }
    this.updateButtonStates();
    setTimeout(() => tc.autoSave(), 100);
  }

  restoreState(state) {
    const tc = this.treeCore;
    tc.renderer.nodes.clear();
    for (const [id, node] of state.nodes) {
      tc.renderer.setNode(id, { ...node });
    }
    tc.personData = new Map(state.personData);
    tc.hiddenConnections = new Set(state.hiddenConnections || []);
    tc.lineOnlyConnections = new Set(state.lineOnlyConnections || []);
    if (state.displayPreferences) {
      tc.displayPreferences = { ...state.displayPreferences };
      Object.keys(tc.displayPreferences).forEach(key => {
        const checkbox = document.getElementById(key);
        if (checkbox) {
          checkbox.checked = tc.displayPreferences[key];
        }
      });
    }
    if (state.nodeStyle) {
      tc.nodeStyle = state.nodeStyle;
      document.querySelectorAll('.node-style-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.getAttribute('data-style') === tc.nodeStyle) {
          opt.classList.add('selected');
        }
      });
    }
    if (state.settings) {
      tc.nodeRadius = state.settings.nodeRadius || tc.nodeRadius;
      tc.defaultColor = state.settings.defaultColor || tc.defaultColor;
      tc.fontFamily = state.settings.fontFamily || tc.fontFamily;
      tc.fontSize = state.settings.fontSize || tc.fontSize;
      tc.nameColor = state.settings.nameColor || tc.nameColor;
      tc.dateColor = state.settings.dateColor || tc.dateColor;
      
      // Restore node outline settings
      if (tc.renderer && state.settings.showNodeOutline !== undefined) {
        tc.renderer.settings.showNodeOutline = state.settings.showNodeOutline;
        const outlineCheckbox = document.getElementById('showNodeOutline');
        if (outlineCheckbox) {
          outlineCheckbox.checked = state.settings.showNodeOutline;
        }
      }
      if (tc.renderer && state.settings.outlineColor) {
        tc.renderer.settings.outlineColor = state.settings.outlineColor;
        const outlineColorPicker = document.getElementById('outlineColorPicker');
        if (outlineColorPicker) {
          outlineColorPicker.value = state.settings.outlineColor;
        }
      }
      if (tc.renderer && state.settings.outlineThickness !== undefined) {
        tc.renderer.settings.outlineThickness = state.settings.outlineThickness;
        const outlineThicknessInput = document.getElementById('outlineThicknessInput');
        if (outlineThicknessInput) {
          outlineThicknessInput.value = state.settings.outlineThickness;
        }
      }
      
      // Restore line style settings
      if (tc.renderer) {
        // Family line settings
        if (state.settings.familyLineStyle) {
          tc.renderer.settings.familyLineStyle = state.settings.familyLineStyle;
          const familyLineStyleSelect = document.getElementById('familyLineStyleSelect');
          if (familyLineStyleSelect) {
            familyLineStyleSelect.value = state.settings.familyLineStyle;
          }
        }
        if (state.settings.familyLineThickness !== undefined) {
          tc.renderer.settings.familyLineThickness = state.settings.familyLineThickness;
          const familyLineThicknessInput = document.getElementById('familyLineThicknessInput');
          if (familyLineThicknessInput) {
            familyLineThicknessInput.value = state.settings.familyLineThickness;
          }
        }
        if (state.settings.familyLineColor) {
          tc.renderer.settings.familyLineColor = state.settings.familyLineColor;
          const familyLineColorPicker = document.getElementById('familyLineColorPicker');
          if (familyLineColorPicker) {
            familyLineColorPicker.value = state.settings.familyLineColor;
          }
        }
        
        // Spouse line settings
        if (state.settings.spouseLineStyle) {
          tc.renderer.settings.spouseLineStyle = state.settings.spouseLineStyle;
          const spouseLineStyleSelect = document.getElementById('spouseLineStyleSelect');
          if (spouseLineStyleSelect) {
            spouseLineStyleSelect.value = state.settings.spouseLineStyle;
          }
        }
        if (state.settings.spouseLineThickness !== undefined) {
          tc.renderer.settings.spouseLineThickness = state.settings.spouseLineThickness;
          const spouseLineThicknessInput = document.getElementById('spouseLineThicknessInput');
          if (spouseLineThicknessInput) {
            spouseLineThicknessInput.value = state.settings.spouseLineThickness;
          }
        }
        if (state.settings.spouseLineColor) {
          tc.renderer.settings.spouseLineColor = state.settings.spouseLineColor;
          const spouseLineColorPicker = document.getElementById('spouseLineColorPicker');
          if (spouseLineColorPicker) {
            spouseLineColorPicker.value = state.settings.spouseLineColor;
          }
        }
        
        // Line-only settings
        if (state.settings.lineOnlyStyle) {
          tc.renderer.settings.lineOnlyStyle = state.settings.lineOnlyStyle;
          const lineOnlyStyleSelect = document.getElementById('lineOnlyStyleSelect');
          if (lineOnlyStyleSelect) {
            lineOnlyStyleSelect.value = state.settings.lineOnlyStyle;
          }
        }
        if (state.settings.lineOnlyThickness !== undefined) {
          tc.renderer.settings.lineOnlyThickness = state.settings.lineOnlyThickness;
          const lineOnlyThicknessInput = document.getElementById('lineOnlyThicknessInput');
          if (lineOnlyThicknessInput) {
            lineOnlyThicknessInput.value = state.settings.lineOnlyThickness;
          }
        }
        if (state.settings.lineOnlyColor) {
          tc.renderer.settings.lineOnlyColor = state.settings.lineOnlyColor;
          const lineOnlyColorPicker = document.getElementById('lineOnlyColorPicker');
          if (lineOnlyColorPicker) {
            lineOnlyColorPicker.value = state.settings.lineOnlyColor;
          }
        }
      }
      
      // Update UI elements
      document.getElementById('nodeColorPicker').value = tc.defaultColor;
      document.getElementById('nodeSizeInput').value = tc.nodeRadius;
      document.getElementById('fontSelect').value = tc.fontFamily;
      document.getElementById('fontSizeInput').value = tc.fontSize;
      document.getElementById('nameColorPicker').value = tc.nameColor;
      document.getElementById('dateColorPicker').value = tc.dateColor;
    }
    if (state.camera) {
      tc.renderer.setCamera(state.camera.x, state.camera.y, state.camera.scale);
    }
    tc.updateRendererSettings();
    tc.regenerateConnections();
    tc.clearSelection();
  }

  // Update the state of undo/redo buttons based on available actions
  updateButtonStates() {
    const undoBtn = document.getElementById('undoSidebarBtn');
    const redoBtn = document.getElementById('redoSidebarBtn');
    
    if (undoBtn) {
      const canUndo = this.undoStack.length >= 2;
      undoBtn.disabled = !canUndo;
      undoBtn.classList.toggle('available', canUndo);
      undoBtn.title = canUndo ? 'Undo Last Action (Ctrl+Z)' : 'Nothing to undo';
    }
    
    if (redoBtn) {
      const canRedo = this.redoStack.length > 0;
      redoBtn.disabled = !canRedo;
      redoBtn.classList.toggle('available', canRedo);
      redoBtn.title = canRedo ? 'Redo Last Action (Ctrl+Y)' : 'Nothing to redo';
    }
  }

  // Check if undo is available
  canUndo() {
    return this.undoStack.length >= 2;
  }

  // Check if redo is available
  canRedo() {
    return this.redoStack.length > 0;
  }
} 