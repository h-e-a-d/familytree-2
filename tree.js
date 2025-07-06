// tree.js - Enhanced with improved architecture, security, and error handling

import { appContext, EVENTS } from './src/utils/event-bus.js';
import { SecurityUtils } from './src/utils/security-utils.js';
import { RetryManager, GlobalErrorHandler } from './src/utils/error-handling.js';
import { AccessibilityManager } from './src/features/accessibility/accessibility.js';
import { CONFIG } from './src/config/config.js';

// Enhanced module loader with retry mechanism
const lazyLoadModule = async (modulePath) => {
  return RetryManager.retryModuleLoad(async () => {
    const module = await import(modulePath);
    return module;
  });
};

// Initialize core functionality immediately
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Load core tree functionality
    const { TreeCoreCanvas } = await import('./src/core/tree-engine.js');
    
    // Initialize tree core
    const treeCore = new TreeCoreCanvas();
    treeCore.initialize();
    
    // Lazy load search functionality
    const searchModule = await lazyLoadModule('./src/features/search/search.js');
    if (searchModule) {
      console.log('Search module loaded');
    }
    
    // Lazy load export functionality
    const exportModule = await lazyLoadModule('./src/features/export/exporter.js');
    if (exportModule) {
      console.log('Export module loaded');
    }
    
    // Initialize connection monitoring with reduced frequency
    initializeConnectionMonitoring();
    
  } catch (error) {
    console.error('Failed to initialize tree application:', error);
  }
});

// Optimized connection monitoring with reduced overhead
function initializeConnectionMonitoring() {
  let lastCheck = 0;
  const checkInterval = 10000; // Check every 10 seconds instead of 5
  
  setInterval(() => {
    const now = Date.now();
    if (now - lastCheck < checkInterval) return;
    lastCheck = now;
    
    if (window.treeCore && window.treeCore.renderer) {
      const nodeCount = window.treeCore.renderer.nodes.size;
      const connectionCount = window.treeCore.renderer.connections.length;
      
      if (!window._connectionMonitor) {
        window._connectionMonitor = { nodeCount, connectionCount };
      } else {
        const prev = window._connectionMonitor;
        
        // Only warn if significant connection loss detected
        if (prev.nodeCount === nodeCount && prev.connectionCount > 5 && connectionCount === 0) {
          console.warn('Connection loss detected');
          if (window.notifications) {
            window.notifications.warning(
              'Connection Loss',
              'Family tree connections disappeared unexpectedly.',
              { duration: 4000 }
            );
          }
        }
        
        window._connectionMonitor = { nodeCount, connectionCount };
      }
    }
  }, checkInterval);
}

// Keyboard shortcuts with debouncing
let keyPressTimeout;
document.addEventListener('keydown', (e) => {
  if (keyPressTimeout) return; // Prevent rapid key presses
  
  keyPressTimeout = setTimeout(() => {
    keyPressTimeout = null;
  }, 100);
  
  // Export shortcuts
  if (e.ctrlKey && e.shiftKey) {
    switch (e.key) {
      case 'G':
        e.preventDefault();
        lazyLoadModule('./src/features/export/exporter.js').then(module => {
          if (module && module.exportGEDCOM) module.exportGEDCOM();
        });
        break;
      case 'P':
        e.preventDefault();
        lazyLoadModule('./src/features/export/exporter.js').then(module => {
          if (module && module.exportPDFLayout) module.exportPDFLayout();
        });
        break;
    }
  }
  
  // Search shortcut
  if (e.ctrlKey && e.key === '/') {
    e.preventDefault();
    lazyLoadModule('./src/features/search/search.js').then(module => {
      if (module && module.focusSearch) module.focusSearch();
    });
  }
});

// Public API using service locator pattern (replaces window globals)
class FamilyTreeAPI {
  constructor() {
    this.appContext = appContext;
  }
  
  async search(query) {
    try {
      const sanitizedQuery = SecurityUtils.sanitizeText(query);
      const searchModule = await lazyLoadModule('./src/features/search/search.js');
      return searchModule ? searchModule.searchFor(sanitizedQuery) : null;
    } catch (error) {
      console.error('Search failed:', error);
      return null;
    }
  }
  
  async exportGEDCOM() {
    try {
      appContext.getEventBus().emit(EVENTS.DATA_EXPORT_STARTED, { format: 'gedcom' });
      const exportModule = await lazyLoadModule('./src/features/export/exporter.js');
      const result = exportModule ? await exportModule.exportGEDCOM() : null;
      if (result) {
        appContext.getEventBus().emit(EVENTS.DATA_EXPORT_COMPLETED, { format: 'gedcom' });
      }
      return result;
    } catch (error) {
      console.error('GEDCOM export failed:', error);
      appContext.getEventBus().emit(EVENTS.ERROR_OCCURRED, { error, context: { operation: 'export_gedcom' } });
      return null;
    }
  }
  
  getTreeStats() {
    try {
      const treeCore = appContext.getService('treeCore');
      if (!treeCore || !treeCore.renderer) {
        return null;
      }
      
      const totalPeople = treeCore.renderer.nodes.size;
      let relationshipCount = 0;
      
      if (treeCore.personData) {
        for (const [id, data] of treeCore.personData) {
          if (data.motherId || data.fatherId || data.spouseId) {
            relationshipCount++;
          }
        }
      }
      
      return {
        totalPeople,
        connections: treeCore.renderer.connections.length,
        relationships: relationshipCount,
        version: CONFIG.APP.VERSION
      };
    } catch (error) {
      console.error('Failed to get tree stats:', error);
      return null;
    }
  }
}

// Export API for external use
window.familyTreeAPI = new FamilyTreeAPI();
