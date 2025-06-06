// tree-selection.js
// Handles circle selection and action button management

export class SelectionManager {
  constructor(connectBtn, styleBtn) {
    this.connectBtn = connectBtn;
    this.styleBtn = styleBtn;
    this.selectedCircles = new Set();
  }

  toggle(personId, circle, group) {
    if (this.selectedCircles.has(personId)) {
      this.deselect(personId, group);
    } else {
      this.select(personId, group);
    }
    
    this.updateActionButtons();
    console.log('Current selection:', Array.from(this.selectedCircles));
  }

  select(personId, group) {
    this.selectedCircles.add(personId);
    group.classList.add('selected');
    console.log('Selected:', personId);
  }

  deselect(personId, group) {
    this.selectedCircles.delete(personId);
    group.classList.remove('selected');
    console.log('Deselected:', personId);
  }

  clear() {
    this.selectedCircles.clear();
    document.querySelectorAll('.person-group.selected').forEach(group => {
      group.classList.remove('selected');
    });
    this.updateActionButtons();
    console.log('Selection cleared');
  }

  hasSelection() {
    return this.selectedCircles.size > 0;
  }

  getSelected() {
    return this.selectedCircles;
  }

  getSelectionCount() {
    return this.selectedCircles.size;
  }

  canConnect() {
    return this.selectedCircles.size === 2;
  }

  updateActionButtons() {
    const hasSelection = this.selectedCircles.size > 0;
    const canConnect = this.selectedCircles.size === 2;
    
    console.log('Updating action buttons:', { 
      hasSelection, 
      canConnect, 
      selectedCount: this.selectedCircles.size 
    });
    
    const floatingButtons = document.querySelector('.floating-buttons');
    if (!floatingButtons) return;
    
    if (hasSelection) {
      floatingButtons.classList.add('expanded');
      
      // Show/hide connect button based on selection count
      if (this.connectBtn) {
        if (canConnect) {
          this.connectBtn.classList.remove('hidden');
          this.connectBtn.style.display = 'flex';
        } else {
          this.connectBtn.classList.add('hidden');
          this.connectBtn.style.display = 'none';
        }
      }
      
      // Always show style button when something is selected
      if (this.styleBtn) {
        this.styleBtn.classList.remove('hidden');
        this.styleBtn.style.display = 'flex';
      }
    } else {
      // Hide all secondary buttons
      floatingButtons.classList.remove('expanded');
      
      if (this.connectBtn) {
        this.connectBtn.classList.add('hidden');
        this.connectBtn.style.display = 'none';
      }
      
      if (this.styleBtn) {
        this.styleBtn.classList.add('hidden');
        this.styleBtn.style.display = 'none';
      }
    }
  }

  deleteSelected() {
    if (this.selectedCircles.size === 0) return;
    
    const selectedArray = Array.from(this.selectedCircles);
    const confirmMessage = `Delete ${selectedArray.length} selected person(s)?`;
    
    if (!confirm(confirmMessage)) return;
    
    selectedArray.forEach(personId => {
      const group = document.querySelector(`g[data-id="${personId}"]`);
      if (group) group.remove();
    });
    
    this.clear();
    this.onSelectionDeleted?.();
  }

  // Restore selection from saved state
  restoreSelection(selectedIds, svg) {
    this.clear();
    
    selectedIds.forEach(personId => {
      const group = svg.querySelector(`g[data-id="${personId}"]`);
      if (group) {
        this.selectedCircles.add(personId);
        group.classList.add('selected');
      }
    });
    
    this.updateActionButtons();
  }

  // Get selection data for saving
  getSelectionData() {
    return Array.from(this.selectedCircles);
  }

  // Event callback
  onSelectionDeleted = null;
}