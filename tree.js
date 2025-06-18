// tree.js
// Entry point - now using Canvas-based implementation with search and advanced export integration

// Import the canvas-based tree core with all new functionality
import { treeCore, pushUndoState, generateAllConnections } from './tree-core-canvas.js';

// Import search functionality
import { familyTreeSearch } from './search.js';

// Import advanced export functions
import { exportGEDCOM, exportPDFLayout } from './exporter.js';

// Import notifications for feedback
import { notifications } from './notifications.js';

// Re-export functions that other modules expect
export { pushUndoState, generateAllConnections };

// Export new functionality for external use
export { familyTreeSearch, exportGEDCOM, exportPDFLayout };

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Family Tree application starting...');
  
  // Wait for tree core to initialize
  setTimeout(() => {
    if (treeCore && treeCore.renderer) {
      console.log('Tree core initialized successfully');
      
      // Initialize search integration
      initializeSearchIntegration();
      
      // Initialize advanced export integration
      initializeAdvancedExportIntegration();
      
      // Show welcome notification
      notifications.info('Welcome!', 'Family Tree Builder is ready. Use the search icon to find family members.');
      
    } else {
      console.error('Tree core failed to initialize');
      notifications.error('Initialization Failed', 'Could not start the family tree builder');
    }
  }, 1500);
});

function initializeSearchIntegration() {
  console.log('Initializing search integration...');
  
  // Ensure search is available
  if (!familyTreeSearch) {
    console.warn('Search functionality not available');
    return;
  }
  
  // Add global search functionality
  window.searchFamilyTree = (query) => {
    familyTreeSearch.searchFor(query);
  };
  
  // Add keyboard shortcut integration
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Shift + F for focus search
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      familyTreeSearch.focusSearch();
    }
  });
  
  console.log('Search integration complete');
}

function initializeAdvancedExportIntegration() {
  console.log('Initializing advanced export integration...');
  
  // Add keyboard shortcuts for quick export
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return; // Don't interfere with form inputs
    }
    
    // Ctrl/Cmd + E for quick export menu
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
      e.preventDefault();
      showQuickExportMenu();
    }
    
    // Ctrl/Cmd + Shift + G for GEDCOM export
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'G') {
      e.preventDefault();
      exportGEDCOM();
    }
    
    // Ctrl/Cmd + Shift + P for PDF Layout export
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      exportPDFLayout();
    }
  });
  
  // Add global export functions
  window.exportFamilyTreeGEDCOM = exportGEDCOM;
  window.exportFamilyTreePDFLayout = exportPDFLayout;
  
  console.log('Advanced export integration complete');
}

function showQuickExportMenu() {
  // Create a quick export notification with action buttons
  const exportOptions = [
    { label: 'GEDCOM', action: exportGEDCOM, description: 'Genealogy standard format' },
    { label: 'PDF Report', action: exportPDFLayout, description: 'Formatted document with details' },
    { label: 'PNG Image', action: () => treeCore.exportCanvasAsPNG(), description: 'High-quality image' },
    { label: 'SVG Vector', action: () => treeCore.exportCanvasAsSVG(), description: 'Scalable vector graphics' }
  ];
  
  // Show options in a notification (simplified approach)
  const optionTexts = exportOptions.map(opt => `${opt.label} (${opt.description})`).join('\n');
  
  notifications.info(
    'Quick Export',
    `Available formats:\n${optionTexts}\n\nUse the Settings panel for full export options.`,
    { duration: 6000 }
  );
}

// Global utility functions for external scripts or console use
window.familyTreeUtils = {
  // Search functions
  search: (query) => familyTreeSearch.searchFor(query),
  focusSearch: () => familyTreeSearch.focusSearch(),
  
  // Export functions
  exportGEDCOM: exportGEDCOM,
  exportPDFLayout: exportPDFLayout,
  exportPNG: () => treeCore.exportCanvasAsPNG(),
  exportSVG: () => treeCore.exportCanvasAsSVG(),
  
  // Tree manipulation
  addPerson: (personData) => {
    if (!treeCore || !treeCore.renderer) {
      console.error('Tree not initialized');
      return;
    }
    treeCore.createNewPerson(personData);
    treeCore.regenerateConnections();
    treeCore.pushUndoState();
  },
  
  // Selection utilities
  selectPerson: (personId) => {
    if (!treeCore || !treeCore.renderer) {
      console.error('Tree not initialized');
      return;
    }
    
    const node = treeCore.renderer.nodes.get(personId);
    if (!node) {
      console.error('Person not found:', personId);
      return;
    }
    
    // Center on person and select
    familyTreeSearch.selectPerson(personId);
  },
  
  // Data access
  getAllPersons: () => {
    if (!treeCore || !treeCore.renderer) {
      console.error('Tree not initialized');
      return [];
    }
    
    const persons = [];
    for (const [id, node] of treeCore.renderer.nodes) {
      const personData = treeCore.getPersonData(id) || {};
      persons.push({
        id,
        ...node,
        ...personData
      });
    }
    return persons;
  },
  
  // Statistics
  getTreeStats: () => {
    if (!treeCore || !treeCore.renderer) {
      console.error('Tree not initialized');
      return null;
    }
    
    const totalPeople = treeCore.renderer.nodes.size;
    let maleCount = 0;
    let femaleCount = 0;
    let unknownCount = 0;
    
    for (const [id, node] of treeCore.renderer.nodes) {
      const personData = treeCore.getPersonData(id) || {};
      const gender = (node.gender || personData.gender || '').toLowerCase();
      
      if (gender === 'male') {
        maleCount++;
      } else if (gender === 'female') {
        femaleCount++;
      } else {
        unknownCount++;
      }
    }
    
    return {
      totalPeople,
      maleCount,
      femaleCount,
      unknownCount,
      connections: treeCore.renderer.connections.length
    };
  }
};

// Debug helper for development
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  window.debugFamilyTree = {
    treeCore,
    familyTreeSearch,
    exportGEDCOM,
    exportPDFLayout,
    
    // Debug functions
    logTreeState: () => {
      console.log('Tree State:', {
        nodes: Array.from(treeCore.renderer.nodes.entries()),
        personData: Array.from(treeCore.personData.entries()),
        connections: treeCore.renderer.connections,
        camera: treeCore.renderer.getCamera()
      });
    },
    
    clearTree: () => {
      if (confirm('Clear all tree data? This cannot be undone.')) {
        treeCore.renderer.nodes.clear();
        treeCore.renderer.clearConnections();
        treeCore.personData = new Map();
        treeCore.renderer.needsRedraw = true;
        notifications.info('Tree Cleared', 'All family tree data has been cleared');
      }
    },
    
    generateSampleData: () => {
      // Generate some sample family data for testing
      const samplePeople = [
        { name: 'John', surname: 'Doe', gender: 'male', dob: '1950' },
        { name: 'Jane', surname: 'Smith', maidenName: 'Johnson', gender: 'female', dob: '1955' },
        { name: 'Mike', surname: 'Doe', fatherName: 'John', gender: 'male', dob: '1980' },
        { name: 'Sarah', surname: 'Williams', maidenName: 'Doe', fatherName: 'John', gender: 'female', dob: '1985' }
      ];
      
      samplePeople.forEach((person, index) => {
        const id = `sample_${index + 1}`;
        const nodeData = {
          x: 100 + (index * 150),
          y: 100 + (index % 2) * 100,
          ...person
        };
        
        treeCore.renderer.setNode(id, nodeData);
        treeCore.personData.set(id, person);
      });
      
      // Add some relationships
      treeCore.personData.get('sample_1').spouseId = 'sample_2';
      treeCore.personData.get('sample_2').spouseId = 'sample_1';
      treeCore.personData.get('sample_3').fatherId = 'sample_1';
      treeCore.personData.get('sample_3').motherId = 'sample_2';
      treeCore.personData.get('sample_4').fatherId = 'sample_1';
      treeCore.personData.get('sample_4').motherId = 'sample_2';
      
      treeCore.regenerateConnections();
      treeCore.pushUndoState();
      
      notifications.success('Sample Data Added', 'Sample family tree data has been generated');
    }
  };
  
  console.log('Debug functions available:', Object.keys(window.debugFamilyTree));
}

// The tree-core-canvas.js module handles all initialization via DOMContentLoaded
// This file serves as the integration layer for all functionality
