// app.js
// Enhanced main application logic with sidebar functionality and optimizations

import { rebuildTableView } from './table.js';

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
  if (svgArea) {
    // Create a synthetic wheel event
    const rect = svgArea.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const wheelEvent = new WheelEvent('wheel', {
      deltaY: deltaY,
      clientX: centerX,
      clientY: centerY,
      bubbles: true,
      cancelable: true
    });
    
    svgArea.dispatchEvent(wheelEvent);
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
  }
  
  console.log('Switched to view:', currentView);
}

function initializeEnhancedSettings() {
  console.log('Initializing enhanced settings...');
  
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
  
  // Node style selection
  document.querySelectorAll('.node-style-option').forEach(option => {
    option.addEventListener('click', () => {
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
        if (treeCore.renderer) {
          treeCore.renderer.settings.nodeStyle = style;
          treeCore.renderer.needsRedraw = true;
          treeCore.pushUndoState();
        }
      });
    });
  });
  
  // Display preferences checkboxes
  const preferences = ['showMaidenName', 'showDateOfBirth', 'showFatherName'];
  preferences.forEach(prefId => {
    const checkbox = document.getElementById(prefId);
    if (checkbox) {
      checkbox.addEventListener('change', () => {
        console.log(`${prefId} changed to:`, checkbox.checked);
        
        // Update the tree core with new display preferences
        import('./tree-core-canvas.js').then(({ treeCore }) => {
          if (treeCore.renderer) {
            const prefKey = prefId; // e.g., 'showMaidenName'
            treeCore.displayPreferences[prefKey] = checkbox.checked;
            treeCore.renderer.displayPreferences[prefKey] = checkbox.checked;
            treeCore.renderer.needsRedraw = true;
            treeCore.pushUndoState();
          }
        });
      });
    }
  });
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
