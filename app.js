// app.js
// Enhanced main application logic with fixed sidebar functionality and settings integration

import { rebuildTableView } from './table.js';
import { notifications } from './notifications.js';

let currentView = 'graphic'; // 'graphic' or 'table'

document.addEventListener('DOMContentLoaded', () => {
  console.log('Enhanced App.js initializing...');
  initializeSidebar();
  initializeEnhancedSettings();
  initializeViewToggle();
  initializeSettingsPanel();
  initializeKeyboardShortcuts();
  console.log('Enhanced App.js initialization complete');
});

function initializeSidebar() {
  console.log('Initializing sidebar...');
  
  // Home button
  const homeBtn = document.getElementById('homeBtn');
  if (homeBtn) {
    homeBtn.addEventListener('click', () => {
      console.log('Home button clicked');
      window.location.href = 'index.html';
    });
  }
  
  // Zoom in button
  const zoomInBtn = document.getElementById('zoomInBtn');
  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      console.log('Zoom in button clicked');
      triggerZoom(-100); // Negative for zoom in
    });
  }
  
  // Zoom out button
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      console.log('Zoom out button clicked');
      triggerZoom(100); // Positive for zoom out
    });
  }
  
  // Settings toggle (enhanced)
  const settingsToggle = document.getElementById('settingsToggle');
  const settingsPanel = document.getElementById('settingsPanel');
  
  if (settingsToggle && settingsPanel) {
    settingsToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('Settings toggle clicked');
      settingsPanel.classList.toggle('hidden');
      settingsToggle.classList.toggle('active');
    });
  }
  
  // View toggle (enhanced)
  const viewToggle = document.getElementById('viewToggle');
  if (viewToggle) {
    viewToggle.addEventListener('click', () => {
      console.log('View toggle clicked from sidebar');
      toggleView();
    });
  }
}

function triggerZoom(deltaY) {
  const svgArea = document.getElementById('svgArea');
  const graphicView = document.getElementById('graphicView');
  const canvas = graphicView?.querySelector('canvas');
  
  // Try canvas first (for new implementation), then fall back to SVG
  const target = canvas || svgArea;
  
  if (target) {
    // Create a synthetic wheel event
    const rect = target.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const wheelEvent = new WheelEvent('wheel', {
      deltaY: deltaY,
      clientX: centerX,
      clientY: centerY,
      bubbles: true,
      cancelable: true
    });
    
    target.dispatchEvent(wheelEvent);
  }
}

function toggleView() {
  const graphicView = document.getElementById('graphicView');
  const tableView = document.getElementById('tableView');
  const viewToggle = document.getElementById('viewToggle');
  
  if (!graphicView || !tableView || !viewToggle) return;
  
  const icon = viewToggle.querySelector('svg');
  
  if (currentView === 'graphic') {
    // Switch to table view
    currentView = 'table';
    tableView.classList.remove('hidden');
    graphicView.classList.add('hidden');
    viewToggle.classList.add('active');
    
    // Update icon to show table icon
    if (icon) {
      icon.innerHTML = `
        <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" fill="currentColor" stroke="none"/>
      `;
    }
    
    // Rebuild table data when switching to table view
    rebuildTableView();
    notifications.info('View Changed', 'Switched to table view');
  } else {
    // Switch to graphic view
    currentView = 'graphic';
    graphicView.classList.remove('hidden');
    tableView.classList.add('hidden');
    viewToggle.classList.remove('active');
    
    // Update icon to show graphic icon
    if (icon) {
      icon.innerHTML = `
        <rect x="3" y="3" width="7" height="7"/>
        <rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/>
      `;
    }
    
    // Trigger canvas refresh when switching back to graphic view
    setTimeout(() => {
      import('./tree-core-canvas.js').then(({ treeCore }) => {
        if (treeCore.renderer) {
          console.log('Refreshing canvas after view switch');
          treeCore.renderer.resize();
          treeCore.renderer.needsRedraw = true;
        }
      });
    }, 100);
    
    notifications.info('View Changed', 'Switched to graphic view');
  }
  
  console.log('Switched to view:', currentView);
}

function initializeEnhancedSettings() {
  console.log('Initializing enhanced settings...');
  
  // Wait for tree core to be available
  setTimeout(() => {
    setupCollapsibleSections();
    setupNodeStyleSelection();
    setupDisplayPreferences();
    setupNodeAppearance();
  }, 1500); // Increased delay to ensure tree core is ready
}

function setupCollapsibleSections() {
  // Collapsible sections
  document.querySelectorAll('.collapsible-header').forEach(header => {
    header.addEventListener('click', () => {
      const targetId = header.getAttribute('data-target');
      const content = document.getElementById(targetId);
      
      if (content) {
        const isExpanded = content.classList.contains('expanded');
        content.classList.toggle('expanded');
        header.classList.toggle('expanded');
        
        console.log(`Toggled collapsible section: ${targetId}, expanded: ${!isExpanded}`);
      }
    });
  });
}

function setupNodeStyleSelection() {
  console.log('Setting up node style selection...');
  
  // Node style selection (FIXED)
  document.querySelectorAll('.node-style-option').forEach(option => {
    option.addEventListener('click', () => {
      console.log('Node style option clicked:', option.getAttribute('data-style'));
      
      // Remove selected from all options
      document.querySelectorAll('.node-style-option').forEach(opt => 
        opt.classList.remove('selected')
      );
      // Add selected to clicked option
      option.classList.add('selected');
      
      const style = option.getAttribute('data-style');
      console.log('Node style changed to:', style);
      
      // Update the tree core with new style
      import('./tree-core-canvas.js').then(({ treeCore }) => {
        if (treeCore && treeCore.renderer) {
          console.log('Updating tree core node style to:', style);
          treeCore.nodeStyle = style;
          treeCore.renderer.setNodeStyle(style);
          treeCore.updateRendererSettings();
          treeCore.pushUndoState();
          
          // Show success notification
          notifications.success('Style Updated', `Node style changed to ${style}`);
        } else {
          console.warn('Tree core or renderer not available');
          notifications.warning('Style Update', 'Tree core not ready, style will be applied when loaded');
        }
      }).catch(error => {
        console.error('Error importing tree core:', error);
        notifications.error('Style Update Failed', 'Could not update node style');
      });
    });
  });
  
  console.log('Node style selection setup complete');
}

function setupDisplayPreferences() {
  console.log('Setting up display preferences...');
  
  // Display preferences checkboxes (FIXED)
  const preferences = ['showMaidenName', 'showDateOfBirth', 'showFatherName'];
  preferences.forEach(prefId => {
    const checkbox = document.getElementById(prefId);
    if (checkbox) {
      console.log(`Setting up preference: ${prefId}`);
      
      checkbox.addEventListener('change', () => {
        console.log(`${prefId} changed to:`, checkbox.checked);
        
        // Update the tree core with new display preferences
        import('./tree-core-canvas.js').then(({ treeCore }) => {
          if (treeCore && treeCore.displayPreferences) {
            const prefKey = prefId; // e.g., 'showMaidenName'
            treeCore.displayPreferences[prefKey] = checkbox.checked;
            
            if (treeCore.renderer) {
              treeCore.renderer.updateDisplayPreferences(treeCore.displayPreferences);
              treeCore.updateAllNodesDisplay();
            }
            
            treeCore.pushUndoState();
            
            // Show notification
            const label = checkbox.parentNode.querySelector('label').textContent;
            notifications.info('Display Updated', `${label} ${checkbox.checked ? 'enabled' : 'disabled'}`);
          } else {
            console.warn('Tree core not available for display preferences');
            notifications.warning('Display Update', 'Tree core not ready, preference will be applied when loaded');
          }
        }).catch(error => {
          console.error('Error importing tree core for display preferences:', error);
          notifications.error('Display Update Failed', 'Could not update display preference');
        });
      });
      
      console.log(`Preference ${prefId} setup complete`);
    } else {
      console.warn(`Preference checkbox ${prefId} not found`);
    }
  });
  
  console.log('Display preferences setup complete');
}

function setupNodeAppearance() {
  console.log('Setting up node appearance...');
  
  // Apply node style button (FIXED)
  const applyBtn = document.getElementById('applyNodeStyle');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const colorPicker = document.getElementById('nodeColorPicker');
      const sizeInput = document.getElementById('nodeSizeInput');
      
      if (!colorPicker || !sizeInput) {
        notifications.error('Settings Error', 'Could not find color or size controls');
        return;
      }
      
      const color = colorPicker.value;
      const size = parseInt(sizeInput.value, 10);
      
      console.log('Applying node appearance:', { color, size });
      
      if (isNaN(size) || size <= 0) {
        notifications.error('Invalid Input', 'Please enter a valid node size');
        return;
      }
      
      // Update the tree core with new appearance settings
      import('./tree-core-canvas.js').then(({ treeCore }) => {
        if (treeCore) {
          treeCore.nodeRadius = size;
          treeCore.defaultColor = color;
          treeCore.updateRendererSettings();
          treeCore.updateAllExistingNodes();
          treeCore.pushUndoState();
          
          notifications.success('Appearance Updated', 'Node appearance settings applied');
        } else {
          console.warn('Tree core not available for appearance update');
          notifications.warning('Appearance Update', 'Tree core not ready, settings will be applied when loaded');
        }
      }).catch(error => {
        console.error('Error importing tree core for appearance:', error);
        notifications.error('Appearance Update Failed', 'Could not update node appearance');
      });
    });
    
    console.log('Apply node style button setup complete');
  } else {
    console.warn('Apply node style button not found');
  }
  
  console.log('Node appearance setup complete');
}

function initializeViewToggle() {
  // This is now handled by the sidebar, but keep for compatibility
  console.log('View toggle initialization handled by sidebar');
}

function initializeSettingsPanel() {
  const settingsPanel = document.getElementById('settingsPanel');

  if (!settingsPanel) {
    console.error('Settings panel not found');
    return;
  }

  // Ensure settings panel starts hidden
  settingsPanel.classList.add('hidden');

  // Close settings panel when clicking outside
  document.addEventListener('click', (e) => {
    const settingsToggle = document.getElementById('settingsToggle');
    if (!settingsPanel.contains(e.target) && !settingsToggle?.contains(e.target)) {
      if (!settingsPanel.classList.contains('hidden')) {
        console.log('Closing settings panel (clicked outside)');
        settingsPanel.classList.add('hidden');
        settingsToggle?.classList.remove('active');
      }
    }
  });

  // Prevent settings panel from closing when clicking inside it
  settingsPanel.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

function initializeKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Don't interfere with input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      return;
    }
    
    // Toggle between views with Tab key
    if (e.key === 'Tab' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      toggleView();
    }
    
    // Open add person modal with 'A' key
    else if (e.key === 'a' || e.key === 'A') {
      if (!e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const addPersonBtn = document.getElementById('addPersonBtn');
        if (addPersonBtn) addPersonBtn.click();
      }
    }
    
    // Toggle settings with 'S' key
    else if (e.key === 's' || e.key === 'S') {
      if (!e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const settingsToggle = document.getElementById('settingsToggle');
        if (settingsToggle) settingsToggle.click();
      }
    }
    
    // Undo with 'U' key (in addition to Ctrl+Z handled in tree-core-canvas.js)
    else if (e.key === 'u' || e.key === 'U') {
      if (!e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const undoBtn = document.getElementById('undoBtn');
        if (undoBtn) undoBtn.click();
      }
    }
    
    // Connect selected circles with 'C' key
    else if (e.key === 'c' || e.key === 'C') {
      if (!e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const connectBtn = document.getElementById('connectBtn');
        const floatingButtons = document.querySelector('.floating-buttons');
        if (connectBtn && floatingButtons && floatingButtons.classList.contains('expanded') && !connectBtn.classList.contains('hidden')) {
          connectBtn.click();
        }
      }
    }
    
    // Style selected circles with 'T' key (for sTyle)
    else if (e.key === 't' || e.key === 'T') {
      if (!e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const styleBtn = document.getElementById('styleBtn');
        const floatingButtons = document.querySelector('.floating-buttons');
        if (styleBtn && floatingButtons && floatingButtons.classList.contains('expanded') && !styleBtn.classList.contains('hidden')) {
          styleBtn.click();
        }
      }
    }
    
    // Zoom in with '+' key
    else if (e.key === '+' || e.key === '=') {
      if (!e.ctrlKey && !e.altKey) {
        e.preventDefault();
        triggerZoom(-100);
      }
    }
    
    // Zoom out with '-' key
    else if (e.key === '-' || e.key === '_') {
      if (!e.ctrlKey && !e.altKey) {
        e.preventDefault();
        triggerZoom(100);
      }
    }
    
    // Close modal with Escape key
    else if (e.key === 'Escape') {
      const personModal = document.getElementById('personModal');
      const styleModal = document.getElementById('styleModal');
      const connectionModal = document.getElementById('connectionModal');
      const settingsPanel = document.getElementById('settingsPanel');
      const settingsToggle = document.getElementById('settingsToggle');
      
      if (personModal && !personModal.classList.contains('hidden')) {
        import('./modal.js').then(mod => {
          if (typeof mod.closeModal === 'function') {
            mod.closeModal();
          }
        });
      } else if (styleModal && !styleModal.classList.contains('hidden')) {
        styleModal.classList.add('hidden');
        styleModal.style.display = 'none';
      } else if (connectionModal && !connectionModal.classList.contains('hidden')) {
        connectionModal.classList.add('hidden');
        connectionModal.style.display = 'none';
      } else if (settingsPanel && !settingsPanel.classList.contains('hidden')) {
        settingsPanel.classList.add('hidden');
        settingsToggle?.classList.remove('active');
      }
    }
    
    // Note: Delete key and Ctrl+Z are handled in tree-core-canvas.js
  });
}

// Export functions that might be needed by other modules
export { initializeViewToggle, initializeSettingsPanel, currentView, toggleView };
