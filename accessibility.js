// accessibility.js
// Accessibility enhancements for the family tree application

import { CONFIG, KEYBOARD_SHORTCUTS } from './config.js';
import { EVENTS } from './event-bus.js';

export class AccessibilityManager {
  constructor(eventBus, treeCore) {
    this.eventBus = eventBus;
    this.treeCore = treeCore;
    this.focusedNodeId = null;
    this.announcementRegion = null;
    this.keyboardNavigationEnabled = true;
    
    this.init();
  }

  init() {
    this.createAnnouncementRegion();
    this.setupKeyboardNavigation();
    this.setupFocusManagement();
    this.setupScreenReaderSupport();
    this.detectUserPreferences();
  }

  // Create ARIA live region for announcements
  createAnnouncementRegion() {
    this.announcementRegion = document.createElement('div');
    this.announcementRegion.setAttribute('aria-live', 'polite');
    this.announcementRegion.setAttribute('aria-atomic', 'true');
    this.announcementRegion.className = 'sr-only';
    this.announcementRegion.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      border: 0 !important;
    `;
    document.body.appendChild(this.announcementRegion);
  }

  // Announce messages to screen readers
  announce(message, priority = 'polite') {
    if (!CONFIG.A11Y.SCREEN_READER_ANNOUNCEMENTS) return;
    
    this.announcementRegion.setAttribute('aria-live', priority);
    this.announcementRegion.textContent = message;
    
    // Clear after announcement to allow repeat announcements
    setTimeout(() => {
      this.announcementRegion.textContent = '';
    }, 1000);
  }

  // Setup comprehensive keyboard navigation
  setupKeyboardNavigation() {
    document.addEventListener('keydown', (event) => {
      if (!this.keyboardNavigationEnabled) return;
      
      // Check if we're in a form field
      const activeElement = document.activeElement;
      const isInFormField = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'SELECT' ||
        activeElement.isContentEditable
      );

      // Don't interfere with form navigation unless it's a special combo
      if (isInFormField && !event.ctrlKey && !event.altKey) return;

      this.handleKeyboardShortcut(event);
    });

    // Canvas-specific keyboard navigation
    const canvas = document.getElementById('canvas');
    if (canvas) {
      canvas.setAttribute('tabindex', '0');
      canvas.setAttribute('role', 'application');
      canvas.setAttribute('aria-label', 'Family Tree Canvas - Use arrow keys to navigate, Enter to select');
      
      canvas.addEventListener('keydown', (event) => {
        this.handleCanvasKeyNavigation(event);
      });

      canvas.addEventListener('focus', () => {
        this.announce('Family tree canvas focused. Use arrow keys to navigate between family members.');
      });
    }
  }

  handleKeyboardShortcut(event) {
    const combo = {
      key: event.key,
      ctrl: event.ctrlKey,
      shift: event.shiftKey,
      alt: event.altKey
    };

    // Find matching shortcut
    for (const [action, shortcut] of Object.entries(KEYBOARD_SHORTCUTS)) {
      if (this.matchesShortcut(combo, shortcut)) {
        event.preventDefault();
        this.executeShortcut(action, event);
        return;
      }
    }
  }

  matchesShortcut(combo, shortcut) {
    return combo.key === shortcut.key &&
           !!combo.ctrl === !!shortcut.ctrl &&
           !!combo.shift === !!shortcut.shift &&
           !!combo.alt === !!shortcut.alt;
  }

  executeShortcut(action, event) {
    switch (action) {
      case 'SEARCH':
        this.focusSearch();
        break;
      case 'UNDO':
        this.executeUndo();
        break;
      case 'REDO':
        this.executeRedo();
        break;
      case 'SAVE':
        this.executeSave();
        break;
      case 'EXPORT_GEDCOM':
        this.executeExport('gedcom');
        break;
      case 'EXPORT_PDF':
        this.executeExport('pdf');
        break;
      case 'ZOOM_IN':
        this.executeZoom(0.1);
        break;
      case 'ZOOM_OUT':
        this.executeZoom(-0.1);
        break;
      case 'ZOOM_RESET':
        this.executeZoomReset();
        break;
      case 'TOGGLE_VIEW':
        this.toggleView();
        break;
      case 'DELETE':
        this.deleteSelectedNode();
        break;
    }
  }

  handleCanvasKeyNavigation(event) {
    const nodes = this.treeCore.getAllNodes();
    if (!nodes.length) return;

    let currentIndex = this.focusedNodeId ? 
      nodes.findIndex(node => node.id === this.focusedNodeId) : 0;

    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        this.navigateToNode(this.getNextNode(nodes, currentIndex, 'right'));
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.navigateToNode(this.getNextNode(nodes, currentIndex, 'left'));
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.navigateToNode(this.getNextNode(nodes, currentIndex, 'down'));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.navigateToNode(this.getNextNode(nodes, currentIndex, 'up'));
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.activateNode(this.focusedNodeId);
        break;
      case 'Escape':
        this.clearFocus();
        break;
      case 'Home':
        event.preventDefault();
        this.navigateToNode(nodes[0]);
        break;
      case 'End':
        event.preventDefault();
        this.navigateToNode(nodes[nodes.length - 1]);
        break;
    }
  }

  getNextNode(nodes, currentIndex, direction) {
    if (!nodes.length) return null;

    const currentNode = nodes[currentIndex];
    if (!currentNode) return nodes[0];

    switch (direction) {
      case 'right':
        return nodes[Math.min(currentIndex + 1, nodes.length - 1)];
      case 'left':
        return nodes[Math.max(currentIndex - 1, 0)];
      case 'down':
        // Find node below (higher y coordinate)
        return this.findNodeInDirection(currentNode, nodes, (node) => 
          node.y > currentNode.y && Math.abs(node.x - currentNode.x) < 100);
      case 'up':
        // Find node above (lower y coordinate)
        return this.findNodeInDirection(currentNode, nodes, (node) => 
          node.y < currentNode.y && Math.abs(node.x - currentNode.x) < 100);
      default:
        return currentNode;
    }
  }

  findNodeInDirection(currentNode, nodes, predicate) {
    const candidates = nodes.filter(predicate);
    if (!candidates.length) return currentNode;

    // Return closest candidate
    return candidates.reduce((closest, node) => {
      const closestDist = Math.hypot(closest.x - currentNode.x, closest.y - currentNode.y);
      const nodeDist = Math.hypot(node.x - currentNode.x, node.y - currentNode.y);
      return nodeDist < closestDist ? node : closest;
    });
  }

  navigateToNode(node) {
    if (!node) return;

    this.focusedNodeId = node.id;
    this.highlightNode(node);
    this.announceNode(node);
    
    // Ensure node is visible
    if (this.treeCore.renderer) {
      this.treeCore.renderer.ensureNodeVisible(node);
    }

    this.eventBus.emit(EVENTS.CANVAS_NODE_SELECTED, { nodeId: node.id, method: 'keyboard' });
  }

  highlightNode(node) {
    // Add visual focus indicator
    if (this.treeCore.renderer) {
      this.treeCore.renderer.setFocusedNode(node.id);
    }
  }

  announceNode(node) {
    const personData = this.treeCore.getPersonData(node.id);
    if (!personData) return;

    const name = this.getFullName(personData);
    const relationships = this.getRelationshipSummary(personData);
    
    const announcement = `${name}${relationships ? ', ' + relationships : ''}`;
    this.announce(announcement);
  }

  getFullName(personData) {
    const parts = [personData.givenName, personData.surname].filter(Boolean);
    return parts.join(' ') || 'Unnamed person';
  }

  getRelationshipSummary(personData) {
    const relationships = [];
    
    if (personData.spouseId) {
      const spouse = this.treeCore.getPersonData(personData.spouseId);
      if (spouse) {
        relationships.push(`spouse of ${this.getFullName(spouse)}`);
      }
    }
    
    if (personData.childrenIds && personData.childrenIds.length > 0) {
      relationships.push(`parent of ${personData.childrenIds.length} children`);
    }
    
    return relationships.join(', ');
  }

  activateNode(nodeId) {
    if (!nodeId) return;
    
    this.announce('Opening person details');
    this.eventBus.emit(EVENTS.UI_MODAL_OPENED, { personId: nodeId, trigger: 'keyboard' });
    
    // Open modal for editing
    if (this.treeCore.openPersonModal) {
      this.treeCore.openPersonModal(nodeId);
    }
  }

  clearFocus() {
    this.focusedNodeId = null;
    if (this.treeCore.renderer) {
      this.treeCore.renderer.clearFocusedNode();
    }
    this.announce('Focus cleared');
  }

  // Focus management
  setupFocusManagement() {
    // Trap focus in modals
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') {
        const modal = document.querySelector('.modal:not(.hidden)');
        if (modal) {
          this.trapFocus(event, modal);
        }
      }
    });

    // Restore focus when modals close
    this.eventBus.on(EVENTS.UI_MODAL_CLOSED, () => {
      const canvas = document.getElementById('canvas');
      if (canvas && this.focusedNodeId) {
        canvas.focus();
      }
    });
  }

  trapFocus(event, container) {
    const focusableElements = container.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  // Screen reader support
  setupScreenReaderSupport() {
    // Add proper roles and labels to interface elements
    this.enhanceInterfaceSemantics();
    
    // Announce state changes
    this.eventBus.on(EVENTS.TREE_PERSON_ADDED, (data) => {
      this.announce(`Added ${this.getFullName(data.person)} to family tree`);
    });

    this.eventBus.on(EVENTS.TREE_PERSON_UPDATED, (data) => {
      this.announce(`Updated ${this.getFullName(data.person)}`);
    });

    this.eventBus.on(EVENTS.TREE_PERSON_DELETED, (data) => {
      this.announce(`Deleted ${this.getFullName(data.person)} from family tree`);
    });

    this.eventBus.on(EVENTS.UI_VIEW_CHANGED, (data) => {
      this.announce(`Switched to ${data.view} view`);
    });
  }

  enhanceInterfaceSemantics() {
    // Add landmarks
    const main = document.querySelector('main') || document.getElementById('mainContainer');
    if (main && !main.getAttribute('role')) {
      main.setAttribute('role', 'main');
    }

    // Add button roles and labels
    const buttons = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');
    buttons.forEach(button => {
      const text = button.textContent.trim();
      if (text) {
        button.setAttribute('aria-label', text);
      }
    });

    // Add region labels
    const graphicView = document.getElementById('graphicView');
    if (graphicView) {
      graphicView.setAttribute('role', 'region');
      graphicView.setAttribute('aria-label', 'Family Tree Visualization');
    }

    const tableView = document.getElementById('tableView');
    if (tableView) {
      tableView.setAttribute('role', 'region');
      tableView.setAttribute('aria-label', 'Family Tree Table');
    }
  }

  // Detect user accessibility preferences
  detectUserPreferences() {
    // Detect reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      CONFIG.A11Y.REDUCE_MOTION = true;
      this.announce('Reduced motion mode detected');
    }

    // Detect high contrast preference
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      CONFIG.A11Y.HIGH_CONTRAST_MODE = true;
      document.body.classList.add('high-contrast');
    }

    // Listen for changes
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      CONFIG.A11Y.REDUCE_MOTION = e.matches;
      this.eventBus.emit(EVENTS.UI_SETTINGS_UPDATED, { reducedMotion: e.matches });
    });

    window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
      CONFIG.A11Y.HIGH_CONTRAST_MODE = e.matches;
      document.body.classList.toggle('high-contrast', e.matches);
      this.eventBus.emit(EVENTS.UI_SETTINGS_UPDATED, { highContrast: e.matches });
    });
  }

  // Keyboard shortcut implementations
  focusSearch() {
    const searchInput = document.getElementById('searchInput') || document.querySelector('[type="search"]');
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
      this.announce('Search focused');
    }
  }

  executeUndo() {
    if (this.treeCore.undoManager && this.treeCore.undoManager.canUndo()) {
      this.treeCore.undoManager.undo();
      this.announce('Undid last action');
    } else {
      this.announce('Nothing to undo');
    }
  }

  executeRedo() {
    if (this.treeCore.undoManager && this.treeCore.undoManager.canRedo()) {
      this.treeCore.undoManager.redo();
      this.announce('Redid last action');
    } else {
      this.announce('Nothing to redo');
    }
  }

  executeSave() {
    if (this.treeCore.saveTree) {
      this.treeCore.saveTree();
      this.announce('Family tree saved');
    }
  }

  executeExport(format) {
    this.announce(`Exporting family tree as ${format.toUpperCase()}`);
    this.eventBus.emit(EVENTS.DATA_EXPORT_STARTED, { format });
  }

  executeZoom(delta) {
    if (this.treeCore.renderer) {
      const currentScale = this.treeCore.renderer.camera.scale;
      const newScale = Math.max(0.1, Math.min(5, currentScale + delta));
      
      // Update camera scale
      this.treeCore.renderer.camera.scale = newScale;
      this.treeCore.renderer.needsRedraw = true;
      
      // Update zoom display if it exists
      const zoomDisplay = document.getElementById('zoomDisplay');
      if (zoomDisplay) {
        zoomDisplay.textContent = `${Math.round(newScale * 100)}%`;
      }
      
      this.announce(`Zoom level: ${Math.round(newScale * 100)}%`);
    }
  }

  executeZoomReset() {
    if (this.treeCore.renderer) {
      this.treeCore.renderer.camera.scale = 1;
      this.treeCore.renderer.camera.x = 0;
      this.treeCore.renderer.camera.y = 0;
      this.treeCore.renderer.needsRedraw = true;
      
      // Update zoom display if it exists
      const zoomDisplay = document.getElementById('zoomDisplay');
      if (zoomDisplay) {
        zoomDisplay.textContent = '100%';
      }
      
      this.announce('Zoom reset to 100%');
    }
  }

  toggleView() {
    const currentView = document.getElementById('graphicView').style.display !== 'none' ? 'graphic' : 'table';
    const newView = currentView === 'graphic' ? 'table' : 'graphic';
    
    this.eventBus.emit(EVENTS.UI_VIEW_CHANGED, { view: newView, trigger: 'keyboard' });
  }

  deleteSelectedNode() {
    if (this.focusedNodeId) {
      const personData = this.treeCore.getPersonData(this.focusedNodeId);
      if (personData) {
        const name = this.getFullName(personData);
        if (confirm(`Delete ${name} from the family tree?`)) {
          this.treeCore.deletePerson(this.focusedNodeId);
          this.announce(`${name} deleted from family tree`);
          this.clearFocus();
        }
      }
    }
  }

  // Public API
  setKeyboardNavigationEnabled(enabled) {
    this.keyboardNavigationEnabled = enabled;
  }

  getFocusedNodeId() {
    return this.focusedNodeId;
  }

  destroy() {
    if (this.announcementRegion && this.announcementRegion.parentNode) {
      this.announcementRegion.parentNode.removeChild(this.announcementRegion);
    }
  }
}