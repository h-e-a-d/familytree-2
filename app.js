// app.js
// -------
// Main application logic for view switching, settings panel toggle,
// and other UI interactions

import { rebuildTableView } from './table.js';

let currentView = 'graphic'; // 'graphic' or 'table'

document.addEventListener('DOMContentLoaded', () => {
  console.log('App.js initializing...');
  initializeViewToggle();
  initializeSettingsPanel();
  initializeKeyboardShortcuts();
  console.log('App.js initialization complete');
});

function initializeViewToggle() {
  const viewToggle = document.getElementById('viewToggle');
  const graphicView = document.getElementById('graphicView');
  const tableView = document.getElementById('tableView');

  if (!viewToggle || !graphicView || !tableView) {
    console.error('View toggle elements not found');
    return;
  }

  // Set initial state
  currentView = 'graphic';
  graphicView.classList.remove('hidden');
  tableView.classList.add('hidden');

  viewToggle.addEventListener('click', () => {
    console.log('View toggle clicked, current view:', currentView);
    
    if (currentView === 'graphic') {
      // Switch to table view
      currentView = 'table';
      tableView.classList.remove('hidden');
      graphicView.classList.add('hidden');
      
      // Update icon to show table icon (grid)
      const icon = viewToggle.querySelector('.icon.toggle');
      if (icon) {
        icon.innerHTML = `
          <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" fill="currentColor" stroke="none"></path>
        `;
      }
      
      // Rebuild table data when switching to table view
      rebuildTableView();
    } else {
      // Switch to graphic view
      currentView = 'graphic';
      graphicView.classList.remove('hidden');
      tableView.classList.add('hidden');
      
      // Update icon to show graphic icon (circles)
      const icon = viewToggle.querySelector('.icon.toggle');
      if (icon) {
        icon.innerHTML = `
          <rect x="3" y="3" width="7" height="7" fill="none" stroke="currentColor" stroke-width="2"></rect>
          <rect x="14" y="3" width="7" height="7" fill="none" stroke="currentColor" stroke-width="2"></rect>
          <rect x="14" y="14" width="7" height="7" fill="none" stroke="currentColor" stroke-width="2"></rect>
          <rect x="3" y="14" width="7" height="7" fill="none" stroke="currentColor" stroke-width="2"></rect>
        `;
      }
    }
    
    console.log('Switched to view:', currentView);
  });
}

function initializeSettingsPanel() {
  const settingsToggle = document.getElementById('settingsToggle');
  const settingsPanel = document.getElementById('settingsPanel');

  if (!settingsToggle || !settingsPanel) {
    console.error('Settings elements not found');
    return;
  }

  // Ensure settings panel starts hidden
  settingsPanel.classList.add('hidden');

  settingsToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    console.log('Settings toggle clicked');
    settingsPanel.classList.toggle('hidden');
  });

  // Close settings panel when clicking outside
  document.addEventListener('click', (e) => {
    if (!settingsPanel.contains(e.target) && !settingsToggle.contains(e.target)) {
      if (!settingsPanel.classList.contains('hidden')) {
        console.log('Closing settings panel (clicked outside)');
        settingsPanel.classList.add('hidden');
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
      const viewToggle = document.getElementById('viewToggle');
      if (viewToggle) {
        viewToggle.click();
      }
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
    
    // Undo with 'U' key (in addition to Ctrl+Z handled in tree.js)
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
    
    // Close modal with Escape key
    else if (e.key === 'Escape') {
      const personModal = document.getElementById('personModal');
      const styleModal = document.getElementById('styleModal');
      const connectionModal = document.getElementById('connectionModal');
      const settingsPanel = document.getElementById('settingsPanel');
      
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
      }
    }
    
    // Note: Delete key and Ctrl+Z are handled in tree.js
  });
}

// Export functions that might be needed by other modules
export { initializeViewToggle, initializeSettingsPanel, currentView };