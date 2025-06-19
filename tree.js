// tree.js - UPDATED: Enhanced integration with fixed connection caching
// Entry point with comprehensive search and advanced export integration

// Import the enhanced canvas-based tree core with fixed connection caching
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

// Enhanced initialization with connection caching validation
document.addEventListener('DOMContentLoaded', () => {
  console.log('🌳 Enhanced Family Tree application starting...');
  
  // Wait for tree core to initialize
  setTimeout(() => {
    if (treeCore && treeCore.renderer) {
      console.log('✅ Tree core initialized successfully');
      
      // Initialize integrations
      initializeSearchIntegration();
      initializeAdvancedExportIntegration();
      initializeConnectionCachingValidation();
      initializeEnhancedDebugging();
      
      // Show enhanced welcome notification
      notifications.info(
        'Enhanced Family Tree Ready!', 
        'Connection caching has been improved. Use search to find family members, and check console for debug commands.',
        { duration: 5000 }
      );
      
    } else {
      console.error('❌ Tree core failed to initialize');
      notifications.error('Initialization Failed', 'Could not start the family tree builder');
    }
  }, 1500);
});

function initializeSearchIntegration() {
  console.log('🔍 Initializing enhanced search integration...');
  
  // Ensure search is available
  if (!familyTreeSearch) {
    console.warn('⚠️ Search functionality not available');
    return;
  }
  
  // Add global search functionality
  window.searchFamilyTree = (query) => {
    familyTreeSearch.searchFor(query);
  };
  
  // Enhanced keyboard shortcut integration
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Shift + F for focus search
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      familyTreeSearch.focusSearch();
    }
    
    // Ctrl/Cmd + / for quick search (like Discord, Slack)
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      familyTreeSearch.focusSearch();
    }
  });
  
  console.log('✅ Enhanced search integration complete');
}

function initializeAdvancedExportIntegration() {
  console.log('📤 Initializing advanced export integration...');
  
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
    
    // Ctrl/Cmd + S for save JSON (prevent browser save)
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (treeCore && typeof treeCore.saveToJSON === 'function') {
        treeCore.saveToJSON();
      }
    }
  });
  
  // Add global export functions
  window.exportFamilyTreeGEDCOM = exportGEDCOM;
  window.exportFamilyTreePDFLayout = exportPDFLayout;
  
  console.log('✅ Advanced export integration complete');
}

// NEW: Connection caching validation
function initializeConnectionCachingValidation() {
  console.log('🔗 Initializing connection caching validation...');
  
  // Validate connections after page load
  setTimeout(() => {
    if (treeCore && treeCore.renderer) {
      const nodeCount = treeCore.renderer.nodes.size;
      const connectionCount = treeCore.renderer.connections.length;
      const relationshipCount = countRelationships();
      
      console.log('📊 Connection validation:', {
        nodes: nodeCount,
        connections: connectionCount,
        relationships: relationshipCount
      });
      
      // Warn if connections seem to be missing
      if (nodeCount > 1 && relationshipCount > 0 && connectionCount === 0) {
        console.warn('⚠️ Potential connection caching issue detected');
        
        // Automatically attempt fix
        setTimeout(() => {
          console.log('🔧 Attempting automatic connection fix...');
          treeCore.regenerateConnections();
          
          const newConnectionCount = treeCore.renderer.connections.length;
          if (newConnectionCount > 0) {
            console.log('✅ Automatic fix successful:', newConnectionCount, 'connections restored');
            notifications.success(
              'Connections Restored',
              `${newConnectionCount} family connections were automatically restored`
            );
          } else {
            console.log('❌ Automatic fix failed');
            notifications.warning(
              'Connection Issue Detected',
              'Some family connections may be missing. Open console and run emergencyConnectionFix() to repair.',
              { duration: 8000 }
            );
          }
        }, 1000);
      } else if (connectionCount > 0) {
        console.log('✅ Connections appear to be working correctly');
      }
    }
  }, 2000);
  
  console.log('✅ Connection caching validation initialized');
}

// NEW: Enhanced debugging integration
function initializeEnhancedDebugging() {
  console.log('🛠️ Initializing enhanced debugging...');
  
  // Auto-load debug commands in development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Import and initialize debug helper
    import('./debug-console-helper.js').catch(() => {
      console.log('📝 Debug helper not found - using built-in commands');
    });
  }
  
  // Monitor for connection issues
  setInterval(() => {
    if (treeCore && treeCore.renderer) {
      const nodeCount = treeCore.renderer.nodes.size;
      const connectionCount = treeCore.renderer.connections.length;
      
      // Store previous counts to detect sudden changes
      if (!window._connectionMonitor) {
        window._connectionMonitor = { nodeCount, connectionCount };
      } else {
        const prev = window._connectionMonitor;
        
        // Check for sudden connection loss
        if (prev.nodeCount === nodeCount && prev.connectionCount > 0 && connectionCount === 0) {
          console.warn('🚨 Connection loss detected during runtime!');
          notifications.warning(
            'Connection Loss Detected',
            'Family tree connections disappeared unexpectedly. Check console for repair options.',
            { duration: 6000 }
          );
        }
        
        window._connectionMonitor = { nodeCount, connectionCount };
      }
    }
  }, 5000); // Check every 5 seconds
  
  console.log('✅ Enhanced debugging initialized');
}

function countRelationships() {
  if (!treeCore || !treeCore.personData) return 0;
  
  let count = 0;
  for (const [id, data] of treeCore.personData) {
    if (data.motherId || data.fatherId || data.spouseId) {
      count++;
    }
  }
  return count;
}

function showQuickExportMenu() {
  // Create a quick export notification with action buttons
  const exportOptions = [
    { label: 'GEDCOM', action: exportGEDCOM, description: 'Genealogy standard format' },
    { label: 'PDF Report', action: exportPDFLayout, description: 'Formatted document with details' },
    { label: 'PNG Image', action: () => treeCore.exportCanvasAsPNG(), description: 'High-quality image' },
    { label: 'SVG Vector', action: () => treeCore.exportCanvasAsSVG(), description: 'Scalable vector graphics' },
    { label: 'JSON Data', action: () => treeCore.saveToJSON(), description: 'Complete family tree data' }
  ];
  
  // Show options in a notification (simplified approach)
  const optionTexts = exportOptions.map(opt => `• ${opt.label} - ${opt.description}`).join('\n');
  
  notifications.info(
    'Quick Export Menu',
    `Available formats:\n${optionTexts}\n\nUse keyboard shortcuts:\n• Ctrl+Shift+G for GEDCOM\n• Ctrl+Shift+P for PDF Report\n• Ctrl+S for JSON save`,
    { duration: 8000 }
  );
}

// Enhanced global utility functions for external scripts or console use
window.familyTreeUtils = {
  // Search functions
  search: (query) => familyTreeSearch.searchFor(query),
  focusSearch: () => familyTreeSearch.focusSearch(),
  
  // Export functions
  exportGEDCOM: exportGEDCOM,
  exportPDFLayout: exportPDFLayout,
  exportPNG: () => treeCore.exportCanvasAsPNG(),
  exportSVG: () => treeCore.exportCanvasAsSVG(),
  exportJSON: () => treeCore.saveToJSON(),
  
  // Tree manipulation
  addPerson: (personData) => {
    if (!treeCore || !treeCore.renderer) {
      console.error('❌ Tree not initialized');
      return false;
    }
    try {
      treeCore.createNewPerson(personData);
      treeCore.regenerateConnections();
      treeCore.pushUndoState();
      return true;
    } catch (error) {
      console.error('❌ Error adding person:', error);
      return false;
    }
  },
  
  // Enhanced selection utilities
  selectPerson: (personId) => {
    if (!treeCore || !treeCore.renderer) {
      console.error('❌ Tree not initialized');
      return false;
    }
    
    const node = treeCore.renderer.nodes.get(personId);
    if (!node) {
      console.error('❌ Person not found:', personId);
      return false;
    }
    
    // Center on person and select
    return familyTreeSearch.selectPersonById(personId);
  },
  
  centerOnPerson: (personId) => {
    if (!treeCore || !treeCore.renderer) {
      console.error('❌ Tree not initialized');
      return false;
    }
    
    const node = treeCore.renderer.nodes.get(personId);
    if (!node) {
      console.error('❌ Person not found:', personId);
      return false;
    }
    
    treeCore.centerOnNode(node);
    return true;
  },
  
  // Data access
  getAllPersons: () => {
    if (!treeCore || !treeCore.renderer) {
      console.error('❌ Tree not initialized');
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
  
  getPersonById: (personId) => {
    if (!treeCore || !treeCore.renderer) {
      console.error('❌ Tree not initialized');
      return null;
    }
    
    const node = treeCore.renderer.nodes.get(personId);
    const personData = treeCore.getPersonData(personId) || {};
    
    if (!node) return null;
    
    return {
      id: personId,
      ...node,
      ...personData
    };
  },
  
  // Enhanced statistics
  getTreeStats: () => {
    if (!treeCore || !treeCore.renderer) {
      console.error('❌ Tree not initialized');
      return null;
    }
    
    const totalPeople = treeCore.renderer.nodes.size;
    let maleCount = 0;
    let femaleCount = 0;
    let unknownCount = 0;
    let relationshipCount = 0;
    
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
      
      // Count relationships
      if (personData.motherId || personData.fatherId || personData.spouseId) {
        relationshipCount++;
      }
    }
    
    return {
      totalPeople,
      maleCount,
      femaleCount,
      unknownCount,
      relationships: relationshipCount,
      connections: treeCore.renderer.connections.length,
      hiddenConnections: treeCore.hiddenConnections?.size || 0,
      lineOnlyConnections: treeCore.lineOnlyConnections?.size || 0
    };
  },
  
  // Connection utilities
  validateConnections: () => {
    if (!treeCore) {
      console.error('❌ Tree not initialized');
      return false;
    }
    
    const stats = window.familyTreeUtils.getTreeStats();
    if (!stats) return false;
    
    console.log('🔍 Connection validation:', stats);
    
    if (stats.relationships > 0 && stats.connections === 0) {
      console.warn('⚠️ Relationships exist but no connections found');
      return false;
    }
    
    return true;
  },
  
  repairConnections: () => {
    if (!treeCore) {
      console.error('❌ Tree not initialized');
      return false;
    }
    
    try {
      const beforeCount = treeCore.renderer.connections.length;
      treeCore.regenerateConnections();
      const afterCount = treeCore.renderer.connections.length;
      
      console.log(`🔧 Connection repair: ${beforeCount} → ${afterCount}`);
      
      if (afterCount > beforeCount) {
        notifications.success('Connections Repaired', `${afterCount - beforeCount} connections restored`);
        treeCore.saveToCache(); // Save the fix
        return true;
      } else if (afterCount === beforeCount && afterCount > 0) {
        notifications.info('Connections OK', 'All connections are already working correctly');
        return true;
      } else {
        notifications.warning('Repair Failed', 'Could not restore connections automatically');
        return false;
      }
    } catch (error) {
      console.error('❌ Repair failed:', error);
      notifications.error('Repair Error', 'Connection repair encountered an error');
      return false;
    }
  }
};

// Enhanced debug helper for development
if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
  window.debugFamilyTree = {
    treeCore,
    familyTreeSearch,
    exportGEDCOM,
    exportPDFLayout,
    
    // Enhanced debug functions
    logTreeState: () => {
      console.log('🌳 Complete Tree State:', {
        nodes: Array.from(treeCore.renderer.nodes.entries()),
        personData: Array.from(treeCore.personData.entries()),
        connections: treeCore.renderer.connections,
        hiddenConnections: Array.from(treeCore.hiddenConnections),
        lineOnlyConnections: Array.from(treeCore.lineOnlyConnections),
        camera: treeCore.renderer.getCamera(),
        displayPreferences: treeCore.displayPreferences,
        settings: {
          nodeRadius: treeCore.nodeRadius,
          defaultColor: treeCore.defaultColor,
          fontFamily: treeCore.fontFamily,
          fontSize: treeCore.fontSize
        }
      });
    },
    
    clearTree: () => {
      if (confirm('Clear all tree data? This cannot be undone.')) {
        treeCore.renderer.nodes.clear();
        treeCore.renderer.clearConnections();
        treeCore.personData = new Map();
        treeCore.hiddenConnections = new Set();
        treeCore.lineOnlyConnections = new Set();
        treeCore.renderer.needsRedraw = true;
        treeCore.saveToCache(); // Clear cache too
        notifications.info('Tree Cleared', 'All family tree data has been cleared');
      }
    },
    
    generateSampleData: () => {
      // Generate comprehensive sample family data for testing
      const sampleFamilies = [
        // Grandparents generation
        { id: 'gf1', name: 'Robert', surname: 'Smith', gender: 'male', dob: '1920' },
        { id: 'gm1', name: 'Mary', surname: 'Johnson', maidenName: 'Williams', gender: 'female', dob: '1925' },
        { id: 'gf2', name: 'James', surname: 'Brown', gender: 'male', dob: '1918' },
        { id: 'gm2', name: 'Patricia', surname: 'Davis', maidenName: 'Miller', gender: 'female', dob: '1922' },
        
        // Parents generation
        { id: 'f1', name: 'John', surname: 'Smith', fatherName: 'Robert', gender: 'male', dob: '1950' },
        { id: 'm1', name: 'Jane', surname: 'Brown', maidenName: 'Brown', fatherName: 'James', gender: 'female', dob: '1952' },
        
        // Children generation
        { id: 'c1', name: 'Michael', surname: 'Smith', fatherName: 'John', gender: 'male', dob: '1980' },
        { id: 'c2', name: 'Sarah', surname: 'Smith', fatherName: 'John', gender: 'female', dob: '1982' },
        { id: 'c3', name: 'David', surname: 'Smith', fatherName: 'John', gender: 'male', dob: '1985' }
      ];
      
      // Create nodes
      sampleFamilies.forEach((person, index) => {
        const nodeData = {
          x: 100 + (index % 4) * 200,
          y: 100 + Math.floor(index / 4) * 150,
          ...person
        };
        
        treeCore.renderer.setNode(person.id, nodeData);
        treeCore.personData.set(person.id, person);
      });
      
      // Create relationships
      const relationships = [
        // Grandparent marriages
        { person: 'gf1', spouse: 'gm1' },
        { person: 'gf2', spouse: 'gm2' },
        
        // Parent-child relationships (grandparents to parents)
        { person: 'f1', father: 'gf1', mother: 'gm1' },
        { person: 'm1', father: 'gf2', mother: 'gm2' },
        
        // Parent marriage
        { person: 'f1', spouse: 'm1' },
        
        // Parent-child relationships (parents to children)
        { person: 'c1', father: 'f1', mother: 'm1' },
        { person: 'c2', father: 'f1', mother: 'm1' },
        { person: 'c3', father: 'f1', mother: 'm1' }
      ];
      
      relationships.forEach(rel => {
        const personData = treeCore.personData.get(rel.person);
        if (personData) {
          if (rel.father) personData.fatherId = rel.father;
          if (rel.mother) personData.motherId = rel.mother;
          if (rel.spouse) personData.spouseId = rel.spouse;
          treeCore.personData.set(rel.person, personData);
        }
      });
      
      // Regenerate connections and save
      treeCore.regenerateConnections();
      treeCore.pushUndoState();
      treeCore.saveToCache();
      
      notifications.success('Sample Data Generated', `Created ${sampleFamilies.length} people with ${treeCore.renderer.connections.length} connections`);
      
      console.log('✅ Sample family tree generated:', {
        people: sampleFamilies.length,
        connections: treeCore.renderer.connections.length,
        generations: 3
      });
    },
    
    // Test connection caching specifically
    testConnectionCaching: () => {
      console.log('🧪 Testing connection caching...');
      
      const beforeStats = window.familyTreeUtils.getTreeStats();
      console.log('📊 Before cache test:', beforeStats);
      
      // Save current state
      const saveSuccess = treeCore.saveToCache();
      if (!saveSuccess) {
        console.error('❌ Cache save failed');
        return;
      }
      
      // Simulate page reload by clearing and reloading
      const originalData = { ...beforeStats };
      
      // Clear current state
      treeCore.renderer.nodes.clear();
      treeCore.renderer.clearConnections();
      treeCore.personData = new Map();
      
      // Reload from cache
      treeCore.loadCachedState().then(loaded => {
        if (loaded) {
          const afterStats = window.familyTreeUtils.getTreeStats();
          console.log('📊 After cache reload:', afterStats);
          
          const success = 
            afterStats.totalPeople === originalData.totalPeople &&
            afterStats.connections >= originalData.connections &&
            afterStats.relationships === originalData.relationships;
          
          if (success) {
            console.log('✅ Connection caching test PASSED');
            notifications.success('Cache Test Passed', 'Connection caching is working correctly');
          } else {
            console.log('❌ Connection caching test FAILED');
            console.log('🔍 Differences:', {
              people: originalData.totalPeople - afterStats.totalPeople,
              connections: originalData.connections - afterStats.connections,
              relationships: originalData.relationships - afterStats.relationships
            });
            notifications.error('Cache Test Failed', 'Connection caching has issues - check console');
          }
        } else {
          console.log('❌ Cache reload failed');
          notifications.error('Cache Test Failed', 'Could not reload from cache');
        }
      });
    }
  };
  
  console.log('🛠️ Enhanced debug functions available:', Object.keys(window.debugFamilyTree));
  console.log('📝 Try: debugFamilyTree.generateSampleData() to create test data');
  console.log('🧪 Try: debugFamilyTree.testConnectionCaching() to test cache system');
}

// Global announcement of enhanced features
console.log('🌟 Enhanced Family Tree Builder Ready!');
console.log('=====================================');
console.log('✨ New Features:');
console.log('   🔗 Fixed connection caching');
console.log('   🔍 Enhanced search with better centering');
console.log('   📤 Advanced export options (GEDCOM, PDF layouts)');
console.log('   🛠️ Comprehensive debugging tools');
console.log('   ⌨️ Keyboard shortcuts (Ctrl+E for exports, Ctrl+/ for search)');
console.log('   🔧 Automatic connection repair');
console.log('');
console.log('🆘 If connections disappear: run emergencyConnectionFix()');
console.log('💡 For all debug commands: see console messages above');

// The tree-core-canvas.js module handles all initialization via DOMContentLoaded
// This file serves as the enhanced integration layer for all functionality
