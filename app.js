// app.js
// -------
// Main application logic for view switching, settings panel toggle,
// and other UI interactions

import { rebuildTableView } from './table.js';

document.addEventListener('DOMContentLoaded', () => {
  initializeViewToggle();
  initializeSettingsPanel();
  initializeKeyboardShortcuts();
});

function initializeViewToggle() {
  const graphicViewBtn = document.getElementById('graphicViewBtn');
  const tableViewBtn = document.getElementById('tableViewBtn');
  const graphicView = document.getElementById('graphicView');
  const tableView = document.getElementById('tableView');

  if (!graphicViewBtn || !tableViewBtn || !graphicView || !tableView) {
    console.error('View toggle elements not found');
    return;
  }

  graphicViewBtn.addEventListener('click', () => {
    // Show graphic view, hide table view
    graphicView.classList.remove('hidden');
    tableView.classList.add('hidden');
    
    // Update button states
    graphicViewBtn.classList.add('active');
    tableViewBtn.classList.remove('active');
  });

  tableViewBtn.addEventListener('click', () => {
    // Show table view, hide graphic view
    tableView.classList.remove('hidden');
    graphicView.classList.add('hidden');
    
    // Update button states
    tableViewBtn.classList.add('active');
    graphicViewBtn.classList.remove('active');
    
    // Rebuild table data when switching to table view
    rebuildTableView();
  });
}

function initializeSettingsPanel() {
  const settingsToggle = document.getElementById('settingsToggle');
  const settingsPanel = document.getElementById('settingsPanel');

  if (!settingsToggle || !settingsPanel) {
    console.error('Settings elements not found');
    return;
  }

  settingsToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    settingsPanel.classList.toggle('hidden');
  });

  // Close settings panel when clicking outside
  document.addEventListener('click', (e) => {
    if (!settingsPanel.contains(e.target) && !settingsToggle.contains(e.target)) {
      settingsPanel.classList.add('hidden');
    }
  });

  // Prevent settings panel from closing when clicking inside it
  settingsPanel.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

function initializeKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Toggle between views with Tab key
    if (e.key === 'Tab' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
      const graphicViewBtn = document.getElementById('graphicViewBtn');
      const tableViewBtn = document.getElementById('tableViewBtn');
      
      if (graphicViewBtn && tableViewBtn) {
        e.preventDefault();
        if (graphicViewBtn.classList.contains('active')) {
          tableViewBtn.click();
        } else {
          graphicViewBtn.click();
        }
      }
    }
    
    // Open add person modal with 'A' key
    if (e.key === 'a' || e.key === 'A') {
      if (!e.ctrlKey && !e.altKey && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const addPersonBtn = document.getElementById('addPersonBtn');
        if (addPersonBtn) addPersonBtn.click();
      }
    }
    
    // Toggle settings with 'S' key
    if (e.key === 's' || e.key === 'S') {
      if (!e.ctrlKey && !e.altKey && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const settingsToggle = document.getElementById('settingsToggle');
        if (settingsToggle) settingsToggle.click();
      }
    }
    
    // Close modal with Escape key
    if (e.key === 'Escape') {
      const modal = document.getElementById('personModal');
      const settingsPanel = document.getElementById('settingsPanel');
      
      if (modal && !modal.classList.contains('hidden')) {
        // Import and call closeModal function
        import('./modal.js').then(mod => {
          if (typeof mod.closeModal === 'function') {
            mod.closeModal();
          }
        });
      } else if (settingsPanel && !settingsPanel.classList.contains('hidden')) {
        settingsPanel.classList.add('hidden');
      }
    }
  });
}

// Export functions that might be needed by other modules
export { initializeViewToggle, initializeSettingsPanel };