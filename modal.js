// modal.js
// --------
// Manages opening/closing the Add/Edit Person modal, pre‐populating fields when editing,
// and invoking updateSearchableSelects() so Mother/Father/Spouse dropdowns are rebuilt.

import { updateSearchableSelects } from './searchableSelect.js';

let isModalOpen = false;

export function openModalForEdit(personId) {
  console.log('Opening modal for:', personId || 'new person');
  
  const modal = document.getElementById('personModal');
  const titleEl = document.getElementById('modalTitle');

  if (!modal || !titleEl) {
    console.error('Modal elements not found');
    return;
  }

  // If personId is provided, we are in "Edit" mode; otherwise "Add" mode
  if (personId) {
    titleEl.textContent = 'Edit Person';
    modal.dataset.editingId = personId;

    // Fetch the existing <g data-id="…"> element
    const group = document.querySelector(`svg#svgArea g[data-id="${personId}"]`);
    if (!group) {
      console.warn(`No <g> found for id="${personId}"`);
      return;
    }

    // Populate the text inputs
    document.getElementById('personName').value = group.getAttribute('data-name') || '';
    document.getElementById('personFatherName').value = group.getAttribute('data-fatherName') || '';
    document.getElementById('personSurname').value = group.getAttribute('data-surname') || '';
    document.getElementById('personBirthName').value = group.getAttribute('data-birthName') || '';
    document.getElementById('personDob').value = group.getAttribute('data-dob') || '';
    document.getElementById('personGender').value = group.getAttribute('data-gender') || '';

    // Extract existing mother/father/spouse IDs
    const existingData = {
      motherId: group.getAttribute('data-motherId') || '',
      fatherId: group.getAttribute('data-fatherId') || '',
      spouseId: group.getAttribute('data-spouseId') || ''
    };

    // Rebuild searchable selects, passing in existing IDs
    setTimeout(() => updateSearchableSelects(existingData), 100);
  } else {
    titleEl.textContent = 'Add Person';
    delete modal.dataset.editingId;

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

  // Hide the modal
  modal.classList.add('hidden');
  modal.style.display = 'none';
  delete modal.dataset.editingId;
  isModalOpen = false;
  
  console.log('Modal closed successfully');
}

function clearForm() {
  const form = document.getElementById('personForm');
  if (form) {
    form.reset();
  }

  // Clear individual inputs manually as well
  const inputs = ['personName', 'personFatherName', 'personSurname', 'personBirthName', 'personDob', 'personGender'];
  inputs.forEach(inputId => {
    const input = document.getElementById(inputId);
    if (input) input.value = '';
  });
}

export function isModalCurrentlyOpen() {
  return isModalOpen;
}

// Initialize modal when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Modal initializing...');
  
  const modal = document.getElementById('personModal');
  const cancelBtn = document.getElementById('cancelModal');
  const form = document.getElementById('personForm');
  
  // Force modal to be hidden initially
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
    isModalOpen = false;
    console.log('Modal initialized as hidden');
  }
  
  // Cancel button event listener - using direct event binding
  if (cancelBtn) {
    // Remove any existing listeners first
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    
    newCancelBtn.addEventListener('click', (e) => {
      console.log('Cancel button clicked');
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    });
    console.log('Cancel button listener attached');
  }
  
  // Form submit handler
  if (form) {
    form.addEventListener('submit', (e) => {
      console.log('Form submitted');
      e.preventDefault();
      // The form submission will be handled by tree.js
      // Modal will be closed from there after successful save
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
  
  console.log('Modal initialization complete');
});