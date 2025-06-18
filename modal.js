// modal.js
// Updated to work with Canvas-based tree implementation
// Enhanced with radio button support, maiden name handling, and delete functionality

import { updateSearchableSelects } from './searchableSelect.js';

let isModalOpen = false;
let currentEditingId = null;

// Get selected gender from radio buttons
export function getSelectedGender() {
  const maleRadio = document.getElementById('genderMale');
  const femaleRadio = document.getElementById('genderFemale');
  
  if (maleRadio && maleRadio.checked) return 'male';
  if (femaleRadio && femaleRadio.checked) return 'female';
  return '';
}

export function openModalForEdit(personId) {
  console.log('Opening modal for:', personId || 'new person');
  
  const modal = document.getElementById('personModal');
  const titleEl = document.getElementById('modalTitle');
  const deleteBtn = document.getElementById('deletePersonBtn');

  if (!modal || !titleEl) {
    console.error('Modal elements not found');
    return;
  }

  // Import tree core to access person data
  import('./tree-core-canvas.js').then(({ treeCore }) => {
    if (personId) {
      titleEl.textContent = 'Edit Person';
      modal.dataset.editingId = personId;
      currentEditingId = personId;

      console.log('Setting editing ID to:', personId);

      // Show delete button for editing mode
      if (deleteBtn) {
        deleteBtn.classList.remove('hidden');
      }

      // Get person data from canvas implementation
      const personData = treeCore.getPersonData(personId);
      const node = treeCore.renderer?.nodes.get(personId);
      
      if (!personData && !node) {
        console.warn(`No data found for id="${personId}"`);
        return;
      }

      // Populate the text inputs
      document.getElementById('personName').value = node?.name || personData?.name || '';
      document.getElementById('personFatherName').value = node?.fatherName || personData?.fatherName || '';
      document.getElementById('personSurname').value = node?.surname || personData?.surname || '';
      document.getElementById('personMaidenName').value = node?.maidenName || personData?.maidenName || '';
      document.getElementById('personDob').value = node?.dob || personData?.dob || '';
      
      // Handle gender radio buttons
      const gender = node?.gender || personData?.gender || '';
      const maleRadio = document.getElementById('genderMale');
      const femaleRadio = document.getElementById('genderFemale');
      
      if (maleRadio && femaleRadio) {
        maleRadio.checked = gender === 'male';
        femaleRadio.checked = gender === 'female';
      }

      // Extract existing mother/father/spouse IDs
      const existingData = {
        motherId: personData?.motherId || '',
        fatherId: personData?.fatherId || '',
        spouseId: personData?.spouseId || ''
      };

      // Rebuild searchable selects, passing in existing IDs
      setTimeout(() => updateSearchableSelects(existingData), 100);
    } else {
      titleEl.textContent = 'Add Person';
      delete modal.dataset.editingId;
      currentEditingId = null;

      console.log('Clearing editing ID for new person');

      // Hide delete button for new person mode
      if (deleteBtn) {
        deleteBtn.classList.add('hidden');
      }

      // Clear all form fields
      clearForm();

      // No existing relationships
      setTimeout(() => updateSearchableSelects({}), 100);
    }

    // Show the modal
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    isModalOpen = true;
    
    // Focus on the first input
    setTimeout(() => {
      const firstInput = document.getElementById('personName');
      if (firstInput) firstInput.focus();
    }, 150);
    
    console.log('Modal opened successfully');
  });
}

export function closeModal() {
  console.log('Closing modal...');
  
  const modal = document.getElementById('personModal');

  if (!modal) {
    console.error('Modal not found');
    return;
  }

  // Clear the form
  clearForm();

  // Clear searchable selects
  document.querySelectorAll('.searchable-select').forEach(container => {
    container.innerHTML = '';
  });

  // Hide the modal and clear all editing state
  modal.classList.add('hidden');
  modal.style.display = 'none';
  delete modal.dataset.editingId;
  currentEditingId = null;
  isModalOpen = false;
  
  console.log('Modal closed successfully');
}

function clearForm() {
  const form = document.getElementById('personForm');
  if (form) {
    form.reset();
  }

  // Clear individual inputs manually as well
  const inputs = ['personName', 'personFatherName', 'personSurname', 'personMaidenName', 'personDob'];
  inputs.forEach(inputId => {
    const input = document.getElementById(inputId);
    if (input) input.value = '';
  });

  // Clear radio buttons
  const maleRadio = document.getElementById('genderMale');
  const femaleRadio = document.getElementById('genderFemale');
  if (maleRadio) maleRadio.checked = false;
  if (femaleRadio) femaleRadio.checked = false;
}

export function isModalCurrentlyOpen() {
  return isModalOpen;
}

// Delete person functionality
function openDeleteConfirmModal() {
  console.log('Opening delete confirmation modal');
  console.log('Current editing ID:', currentEditingId);
  
  const modal = document.getElementById('personModal');
  console.log('Modal dataset editing ID:', modal?.dataset.editingId);
  
  const deleteModal = document.getElementById('deleteConfirmModal');
  if (deleteModal) {
    deleteModal.classList.remove('hidden');
    deleteModal.style.display = 'flex';
  }
}

function closeDeleteConfirmModal() {
  const deleteModal = document.getElementById('deleteConfirmModal');
  if (deleteModal) {
    deleteModal.classList.add('hidden');
    deleteModal.style.display = 'none';
  }
}

function confirmDeletePerson() {
  // Get the editing ID from modal dataset or currentEditingId
  const modal = document.getElementById('personModal');
  const editingId = modal?.dataset.editingId || currentEditingId;
  
  if (!editingId) {
    console.error('No person selected for deletion');
    closeDeleteConfirmModal();
    return;
  }

  console.log('Deleting person with ID:', editingId);

  // Import tree core to delete person
  import('./tree-core-canvas.js').then(({ treeCore }) => {
    const personData = treeCore.getPersonData(editingId);
    const node = treeCore.renderer?.nodes.get(editingId);
    
    // Get person name for notification
    let personName = 'Unknown';
    if (node?.name || personData?.name) {
      personName = `${node?.name || personData?.name} ${node?.surname || personData?.surname || ''}`.trim();
    }

    // Delete the person
    treeCore.renderer.removeNode(editingId);
    treeCore.personData?.delete(editingId);
    
    // Regenerate connections and save state
    treeCore.regenerateConnections();
    treeCore.pushUndoState();
    
    // Show notification
    import('./notifications.js').then(({ notifications }) => {
      notifications.success('Person Deleted', `${personName} has been deleted from the tree`);
    });
    
    // Close both modals
    closeDeleteConfirmModal();
    closeModal();
    
    console.log(`Deleted person: ${editingId}`);
  }).catch(error => {
    console.error('Error deleting person:', error);
    import('./notifications.js').then(({ notifications }) => {
      notifications.error('Delete Failed', 'Could not delete person. Please try again.');
    });
  });
}

// Initialize modal when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Modal initializing...');
  
  const modal = document.getElementById('personModal');
  const cancelBtn = document.getElementById('cancelModal');
  const saveBtn = document.getElementById('savePerson');
  const deleteBtn = document.getElementById('deletePersonBtn');
  const form = document.getElementById('personForm');
  
  // Force modal to be hidden initially
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
    isModalOpen = false;
    console.log('Modal initialized as hidden');
  }
  
  // Cancel button event listener
  if (cancelBtn) {
    cancelBtn.addEventListener('click', (e) => {
      console.log('Cancel button clicked');
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    });
    console.log('Cancel button listener attached');
  }

  // Delete button event listener
  if (deleteBtn) {
    deleteBtn.addEventListener('click', (e) => {
      console.log('Delete button clicked');
      console.log('Current editing ID:', currentEditingId);
      console.log('Modal dataset editing ID:', modal?.dataset.editingId);
      e.preventDefault();
      e.stopPropagation();
      openDeleteConfirmModal();
    });
    console.log('Delete button listener attached');
  }
  
  // Save button event listener
  if (saveBtn) {
    saveBtn.addEventListener('click', (e) => {
      console.log('Save button clicked');
      e.preventDefault();
      e.stopPropagation();
      
      // Validate required fields
      const nameInput = document.getElementById('personName');
      const gender = getSelectedGender();
      
      if (!nameInput || !nameInput.value.trim()) {
        alert('Please enter a name.');
        if (nameInput) nameInput.focus();
        return;
      }
      
      if (!gender) {
        alert('Please select a gender.');
        return;
      }
      
      console.log('Form validation passed, triggering save');
      
      // Get form data
      const formData = {
        name: nameInput.value.trim(),
        fatherName: document.getElementById('personFatherName')?.value.trim() || '',
        surname: document.getElementById('personSurname')?.value.trim() || '',
        maidenName: document.getElementById('personMaidenName')?.value.trim() || '',
        dob: document.getElementById('personDob')?.value.trim() || '',
        gender: gender,
        motherId: document.querySelector('#motherSelect input[type="hidden"]')?.value || '',
        fatherId: document.querySelector('#fatherSelect input[type="hidden"]')?.value || '',
        spouseId: document.querySelector('#spouseSelect input[type="hidden"]')?.value || '',
        editingId: modal.dataset.editingId || null
      };
      
      console.log('Form data to save:', formData);
      
      // Try to call tree-core-canvas directly first
      import('./tree-core-canvas.js').then(({ treeCore }) => {
        console.log('TreeCore imported, calling handleSavePersonFromModal');
        if (treeCore && typeof treeCore.handleSavePersonFromModal === 'function') {
          treeCore.handleSavePersonFromModal(formData);
        } else {
          console.log('TreeCore not available, dispatching event');
          // Fallback to event dispatch
          const saveEvent = new CustomEvent('savePersonFromModal', {
            detail: formData
          });
          document.dispatchEvent(saveEvent);
        }
      }).catch(error => {
        console.error('Error importing tree-core-canvas:', error);
        // Fallback to event dispatch
        const saveEvent = new CustomEvent('savePersonFromModal', {
          detail: formData
        });
        document.dispatchEvent(saveEvent);
      });
    });
    console.log('Save button listener attached');
  }
  
  // Form submit handler (fallback)
  if (form) {
    form.addEventListener('submit', (e) => {
      console.log('Form submitted via form submission');
      e.preventDefault();
      
      // Trigger save button click
      if (saveBtn) {
        saveBtn.click();
      }
    });
  }
  
  // Close modal when clicking outside of modal content
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        console.log('Clicked outside modal');
        closeModal();
      }
    });
  }
  
  // Prevent modal content clicks from closing modal
  const modalContent = document.querySelector('.modal-content');
  if (modalContent) {
    modalContent.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }
  
  // Add listeners for radio button changes
  const maleRadio = document.getElementById('genderMale');
  const femaleRadio = document.getElementById('genderFemale');
  
  if (maleRadio) {
    maleRadio.addEventListener('change', () => {
      if (maleRadio.checked) {
        console.log('Gender changed to male');
      }
    });
  }
  
  if (femaleRadio) {
    femaleRadio.addEventListener('change', () => {
      if (femaleRadio.checked) {
        console.log('Gender changed to female');
      }
    });
  }

  // Setup delete confirmation modal event listeners
  setupDeleteConfirmationModal();
  
  console.log('Modal initialization complete');
});

// Separate function to setup delete confirmation modal
function setupDeleteConfirmationModal() {
  console.log('Setting up delete confirmation modal...');
  
  const deleteConfirmModal = document.getElementById('deleteConfirmModal');
  const cancelDeleteBtn = document.getElementById('cancelDeletePerson');
  const confirmDeleteBtn = document.getElementById('confirmDeletePerson');

  // Cancel delete
  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener('click', (e) => {
      console.log('Cancel delete button clicked');
      e.preventDefault();
      e.stopPropagation();
      closeDeleteConfirmModal();
    });
    console.log('Cancel delete button listener attached');
  }

  // Confirm delete
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', (e) => {
      console.log('Confirm delete button clicked');
      e.preventDefault();
      e.stopPropagation();
      confirmDeletePerson();
    });
    console.log('Confirm delete button listener attached');
  }

  // Close delete modal when clicking outside
  if (deleteConfirmModal) {
    deleteConfirmModal.addEventListener('click', (e) => {
      if (e.target === deleteConfirmModal) {
        console.log('Clicked outside delete confirmation modal');
        closeDeleteConfirmModal();
      }
    });
    console.log('Delete confirmation modal click-outside listener attached');
  }

  // Prevent modal content clicks from closing modal
  const deleteModalContent = deleteConfirmModal?.querySelector('.modal-content');
  if (deleteModalContent) {
    deleteModalContent.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    console.log('Delete modal content click prevention attached');
  }
}
