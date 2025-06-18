// search.js - Family Tree Search Functionality with improved centering

import { notifications } from './notifications.js';

class FamilyTreeSearch {
  constructor() {
    this.searchContainer = null;
    this.searchField = null;
    this.searchBtn = null;
    this.searchClose = null;
    this.suggestions = null;
    this.isExpanded = false;
    this.currentSuggestions = [];
    this.selectedIndex = -1;
    this.searchTimeout = null;
    
    this.init();
  }

  init() {
    // Get DOM elements
    this.searchContainer = document.getElementById('searchContainer');
    this.searchField = document.getElementById('searchField');
    this.searchBtn = document.getElementById('searchBtn');
    this.searchClose = document.getElementById('searchClose');
    this.suggestions = document.getElementById('searchSuggestions');
    
    if (!this.searchContainer || !this.searchField || !this.searchBtn) {
      console.error('Search elements not found');
      return;
    }
    
    this.setupEventListeners();
    console.log('Family tree search initialized');
  }

  setupEventListeners() {
    // Search button click - toggle search field
    this.searchBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleSearch();
    });
    
    // Close button click
    if (this.searchClose) {
      this.searchClose.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hideSearch();
      });
    }
    
    // Search field input
    this.searchField.addEventListener('input', (e) => {
      this.handleSearchInput(e.target.value);
    });
    
    // Search field focus/blur
    this.searchField.addEventListener('focus', () => {
      if (this.currentSuggestions.length > 0) {
        this.showSuggestions();
      }
    });
    
    this.searchField.addEventListener('blur', () => {
      // Delay hiding suggestions to allow for clicks
      setTimeout(() => {
        this.hideSuggestions();
      }, 200);
    });
    
    // Keyboard navigation
    this.searchField.addEventListener('keydown', (e) => {
      this.handleKeyDown(e);
    });
    
    // Click outside to close
    document.addEventListener('click', (e) => {
      if (!this.searchContainer.contains(e.target) && !this.searchBtn.contains(e.target)) {
        this.hideSearch();
      }
    });
    
    // Suggestions container click
    if (this.suggestions) {
      this.suggestions.addEventListener('click', (e) => {
        const suggestion = e.target.closest('.search-suggestion');
        if (suggestion) {
          const personId = suggestion.dataset.personId;
          this.selectPerson(personId);
        }
      });
    }
  }

  toggleSearch() {
    if (this.isExpanded) {
      this.hideSearch();
    } else {
      this.showSearch();
    }
  }

  showSearch() {
    console.log('Showing search field');
    this.searchField.classList.add('expanded');
    this.searchBtn.classList.add('active');
    this.isExpanded = true;
    
    // Focus the search field
    setTimeout(() => {
      this.searchField.focus();
    }, 100);
    
    notifications.info('Search Active', 'Type to search family members');
  }

  hideSearch() {
    console.log('Hiding search field');
    this.searchField.classList.remove('expanded');
    this.searchBtn.classList.remove('active');
    this.searchField.value = '';
    this.isExpanded = false;
    this.hideSuggestions();
    this.currentSuggestions = [];
    this.selectedIndex = -1;
  }

  handleSearchInput(query) {
    // Clear previous timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    // Debounce search
    this.searchTimeout = setTimeout(() => {
      this.performSearch(query.trim());
    }, 300);
  }

  async performSearch(query) {
    if (!query || query.length < 2) {
      this.hideSuggestions();
      this.currentSuggestions = [];
      return;
    }
    
    try {
      // Import tree core to access person data
      const { treeCore } = await import('./tree-core-canvas.js');
      
      if (!treeCore.renderer || !treeCore.renderer.nodes) {
        console.warn('No tree data available for search');
        return;
      }
      
      // Search through all persons
      const matches = [];
      const queryLower = query.toLowerCase();
      
      for (const [id, node] of treeCore.renderer.nodes) {
        const personData = treeCore.getPersonData(id) || {};
        
        // Build searchable text
        const searchableFields = [
          node.name || '',
          node.fatherName || '',
          node.surname || '',
          node.maidenName || '',
          personData.name || '',
          personData.fatherName || '',
          personData.surname || '',
          personData.maidenName || ''
        ];
        
        const searchableText = searchableFields.join(' ').toLowerCase();
        
        if (searchableText.includes(queryLower)) {
          matches.push({
            id,
            node,
            personData,
            // Calculate relevance score
            relevance: this.calculateRelevance(queryLower, searchableFields)
          });
        }
      }
      
      // Sort by relevance
      matches.sort((a, b) => b.relevance - a.relevance);
      
      // Limit to top 8 results
      this.currentSuggestions = matches.slice(0, 8);
      this.selectedIndex = -1;
      
      if (this.currentSuggestions.length > 0) {
        this.showSuggestions();
      } else {
        this.hideSuggestions();
      }
      
    } catch (error) {
      console.error('Search error:', error);
      notifications.error('Search Error', 'Failed to search family members');
    }
  }

  calculateRelevance(query, fields) {
    let score = 0;
    
    fields.forEach((field, index) => {
      const fieldLower = field.toLowerCase();
      
      // Exact match gets highest score
      if (fieldLower === query) {
        score += 100;
      }
      // Starts with query gets high score
      else if (fieldLower.startsWith(query)) {
        score += 50;
      }
      // Contains query gets medium score
      else if (fieldLower.includes(query)) {
        score += 25;
      }
      
      // Name field gets higher weight
      if (index === 0) { // name field
        score *= 1.5;
      }
    });
    
    return score;
  }

  showSuggestions() {
    if (!this.suggestions || this.currentSuggestions.length === 0) return;
    
    // Build suggestions HTML
    const suggestionsHTML = this.currentSuggestions.map((match, index) => {
      const { id, node, personData } = match;
      
      // Build display name
      let displayName = node.name || personData.name || 'Unknown';
      if (node.fatherName || personData.fatherName) {
        displayName += ` ${node.fatherName || personData.fatherName}`;
      }
      if (node.surname || personData.surname) {
        displayName += ` ${node.surname || personData.surname}`;
      }
      
      // Build details
      const details = [];
      if (node.maidenName || personData.maidenName) {
        details.push(`Maiden: ${node.maidenName || personData.maidenName}`);
      }
      if (node.dob || personData.dob) {
        details.push(`Born: ${node.dob || personData.dob}`);
      }
      if (node.gender || personData.gender) {
        details.push(node.gender || personData.gender);
      }
      
      const detailsText = details.join(' • ');
      
      return `
        <div class="search-suggestion ${index === this.selectedIndex ? 'selected' : ''}" 
             data-person-id="${id}" data-index="${index}">
          <div class="suggestion-name">${this.highlightMatch(displayName)}</div>
          ${detailsText ? `<div class="suggestion-details">${detailsText}</div>` : ''}
        </div>
      `;
    }).join('');
    
    this.suggestions.innerHTML = suggestionsHTML;
    this.suggestions.classList.add('visible');
  }

  hideSuggestions() {
    if (this.suggestions) {
      this.suggestions.classList.remove('visible');
      this.suggestions.innerHTML = '';
    }
  }

  highlightMatch(text) {
    const query = this.searchField.value.trim();
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<strong>$1</strong>');
  }

  handleKeyDown(e) {
    if (!this.currentSuggestions.length) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.currentSuggestions.length - 1);
        this.updateSelectedSuggestion();
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
        this.updateSelectedSuggestion();
        break;
        
      case 'Enter':
        e.preventDefault();
        if (this.selectedIndex >= 0) {
          const selected = this.currentSuggestions[this.selectedIndex];
          this.selectPerson(selected.id);
        }
        break;
        
      case 'Escape':
        this.hideSearch();
        break;
    }
  }

  updateSelectedSuggestion() {
    const suggestions = this.suggestions.querySelectorAll('.search-suggestion');
    suggestions.forEach((suggestion, index) => {
      if (index === this.selectedIndex) {
        suggestion.classList.add('selected');
      } else {
        suggestion.classList.remove('selected');
      }
    });
  }

  async selectPerson(personId) {
    console.log('Selecting person:', personId);
    
    try {
      // Import tree core to access renderer
      const { treeCore } = await import('./tree-core-canvas.js');
      
      if (!treeCore.renderer) {
        console.error('Tree renderer not available');
        return;
      }
      
      const node = treeCore.renderer.nodes.get(personId);
      if (!node) {
        notifications.error('Person Not Found', 'Could not locate the selected person');
        return;
      }
      
      // IMPROVED: Center the camera on the selected person with better positioning
      this.centerOnPersonImproved(treeCore.renderer, node, personId);
      
      // Select the person
      treeCore.renderer.clearSelection();
      treeCore.renderer.selectedNodes.add(personId);
      treeCore.renderer.needsRedraw = true;
      
      // Get person display name for notification
      const personData = treeCore.getPersonData(personId) || {};
      let displayName = node.name || personData.name || 'Unknown';
      if (node.surname || personData.surname) {
        displayName += ` ${node.surname || personData.surname}`;
      }
      
      notifications.success('Person Found', `Centered on ${displayName}`);
      
      // Hide search
      this.hideSearch();
      
    } catch (error) {
      console.error('Error selecting person:', error);
      notifications.error('Selection Error', 'Failed to center on selected person');
    }
  }

  // IMPROVED: Better centering algorithm that ensures the node is always properly centered
  centerOnPersonImproved(renderer, node, personId) {
    if (!renderer || !renderer.canvas) {
      console.error('Renderer or canvas not available');
      return;
    }
    
    const canvas = renderer.canvas;
    const canvasWidth = canvas.width / renderer.dpr;
    const canvasHeight = canvas.height / renderer.dpr;
    
    console.log('Canvas dimensions:', canvasWidth, 'x', canvasHeight);
    console.log('Node position:', node.x, node.y);
    console.log('Current camera:', renderer.camera);
    
    // Ensure we have a reasonable zoom level (not too close, not too far)
    let targetScale = renderer.camera.scale;
    
    // If current scale is too small (zoomed out too much), zoom in to a reasonable level
    if (targetScale < 0.8) {
      targetScale = 1.0;
    }
    // If current scale is too large (zoomed in too much), zoom out a bit
    else if (targetScale > 3.0) {
      targetScale = 2.0;
    }
    
    // Calculate the exact center position
    // We want the node to be at the center of the visible canvas
    const targetCameraX = (canvasWidth / 2) - (node.x * targetScale);
    const targetCameraY = (canvasHeight / 2) - (node.y * targetScale);
    
    console.log('Target camera position:', targetCameraX, targetCameraY, 'scale:', targetScale);
    
    // Animate to the new position with improved easing
    this.animateCameraImproved(renderer, {
      x: targetCameraX,
      y: targetCameraY,
      scale: targetScale
    }, node, personId);
  }

  // IMPROVED: Enhanced animation with validation to ensure centering works
  animateCameraImproved(renderer, targetCamera, node, personId) {
    const startCamera = { ...renderer.camera };
    const duration = 1000; // Slightly longer duration for smoother animation
    const startTime = performance.now();
    
    console.log('Starting camera animation from:', startCamera, 'to:', targetCamera);
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Improved easing function (ease-in-out cubic)
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      
      // Interpolate camera position
      const newX = startCamera.x + (targetCamera.x - startCamera.x) * eased;
      const newY = startCamera.y + (targetCamera.y - startCamera.y) * eased;
      const newScale = startCamera.scale + (targetCamera.scale - startCamera.scale) * eased;
      
      // Apply new camera position
      renderer.camera.x = newX;
      renderer.camera.y = newY;
      renderer.camera.scale = newScale;
      
      renderer.needsRedraw = true;
      
      // Continue animation or finish
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Animation complete - verify the node is centered
        console.log('Animation complete. Final camera:', renderer.camera);
        this.validateCentering(renderer, node, personId);
      }
    };
    
    requestAnimationFrame(animate);
  }

  // NEW: Validation function to ensure the node is properly centered
  validateCentering(renderer, node, personId) {
    const canvas = renderer.canvas;
    const canvasWidth = canvas.width / renderer.dpr;
    const canvasHeight = canvas.height / renderer.dpr;
    
    // Calculate where the node should appear on screen
    const screenX = (node.x * renderer.camera.scale) + renderer.camera.x;
    const screenY = (node.y * renderer.camera.scale) + renderer.camera.y;
    
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    
    // Check if the node is reasonably close to center (within 50 pixels)
    const distanceFromCenter = Math.sqrt(
      Math.pow(screenX - centerX, 2) + Math.pow(screenY - centerY, 2)
    );
    
    console.log('Validation - Node screen position:', screenX, screenY);
    console.log('Validation - Canvas center:', centerX, centerY);
    console.log('Validation - Distance from center:', distanceFromCenter);
    
    if (distanceFromCenter > 50) {
      console.warn('Node not properly centered, attempting correction');
      
      // If not centered properly, try a direct correction
      const correctionX = centerX - screenX;
      const correctionY = centerY - screenY;
      
      renderer.camera.x += correctionX;
      renderer.camera.y += correctionY;
      renderer.needsRedraw = true;
      
      console.log('Applied correction:', correctionX, correctionY);
    } else {
      console.log('Node successfully centered');
    }
  }

  // Enhanced public method for external centering (used by center button)
  centerOnSelectedNode(renderer, selectedNodeIds) {
    if (!selectedNodeIds || selectedNodeIds.size === 0) {
      console.warn('No selected nodes to center on');
      return false;
    }
    
    // Get the first selected node
    const firstSelectedId = Array.from(selectedNodeIds)[0];
    const node = renderer.nodes.get(firstSelectedId);
    
    if (!node) {
      console.error('Selected node not found:', firstSelectedId);
      return false;
    }
    
    console.log('Centering on selected node:', firstSelectedId);
    this.centerOnPersonImproved(renderer, node, firstSelectedId);
    return true;
  }

  // Public methods for external use
  focusSearch() {
    if (!this.isExpanded) {
      this.showSearch();
    } else {
      this.searchField.focus();
    }
  }

  searchFor(query) {
    this.showSearch();
    this.searchField.value = query;
    this.performSearch(query);
  }

  // IMPROVED: Better error handling and validation for search selection
  async selectPersonById(personId) {
    try {
      const { treeCore } = await import('./tree-core-canvas.js');
      
      if (!treeCore.renderer || !treeCore.renderer.nodes) {
        throw new Error('Tree renderer not available');
      }
      
      const node = treeCore.renderer.nodes.get(personId);
      if (!node) {
        throw new Error(`Person with ID ${personId} not found`);
      }
      
      // Use the improved centering method
      this.centerOnPersonImproved(treeCore.renderer, node, personId);
      
      // Select the person
      treeCore.renderer.clearSelection();
      treeCore.renderer.selectedNodes.add(personId);
      treeCore.renderer.needsRedraw = true;
      
      return true;
    } catch (error) {
      console.error('Error selecting person by ID:', error);
      notifications.error('Selection Error', error.message);
      return false;
    }
  }
}

// Create global instance
const familyTreeSearch = new FamilyTreeSearch();

// Export for module use
export { familyTreeSearch };

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Search functionality loaded');
});

// Add keyboard shortcut for search (Ctrl+F or Cmd+F)
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    // Only intercept if we're not in an input field
    if (!['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
      e.preventDefault();
      familyTreeSearch.focusSearch();
    }
  }
});

// Enhanced global utility functions
window.familyTreeSearchUtils = {
  // Search for a person and center on them
  findAndCenter: (query) => {
    familyTreeSearch.searchFor(query);
  },
  
  // Center on a specific person by ID
  centerOnPerson: (personId) => {
    return familyTreeSearch.selectPersonById(personId);
  },
  
  // Focus the search field
  focusSearch: () => {
    familyTreeSearch.focusSearch();
  },
  
  // Get current search suggestions
  getCurrentSuggestions: () => {
    return familyTreeSearch.currentSuggestions;
  }
};
