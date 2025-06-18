// search.js - Family Tree Search Functionality

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
      
      // Center the camera on the selected person
      this.centerOnPerson(treeCore.renderer, node);
      
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

  centerOnPerson(renderer, node) {
    // Calculate center position
    const canvas = renderer.canvas;
    const canvasWidth = canvas.width / renderer.dpr;
    const canvasHeight = canvas.height / renderer.dpr;
    
    // Calculate new camera position to center the node
    const newCameraX = canvasWidth / 2 - node.x * renderer.camera.scale;
    const newCameraY = canvasHeight / 2 - node.y * renderer.camera.scale;
    
    // Animate to the new position
    this.animateCamera(renderer, {
      x: newCameraX,
      y: newCameraY,
      scale: Math.max(renderer.camera.scale, 1) // Ensure reasonable zoom level
    });
  }

  animateCamera(renderer, targetCamera) {
    const startCamera = { ...renderer.camera };
    const duration = 800; // ms
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const eased = 1 - Math.pow(1 - progress, 3);
      
      // Interpolate camera position
      renderer.camera.x = startCamera.x + (targetCamera.x - startCamera.x) * eased;
      renderer.camera.y = startCamera.y + (targetCamera.y - startCamera.y) * eased;
      renderer.camera.scale = startCamera.scale + (targetCamera.scale - startCamera.scale) * eased;
      
      renderer.needsRedraw = true;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
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
