// modal.js
// Updated to work with Canvas-based tree implementation
// Enhanced with radio button support and maiden name handling

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

  // Import tree core to access person data
  import('./tree-core-canvas.js').then(({ treeCore }) => {
    if (personId) {
      titleEl.textContent = 'Edit Person';
      modal.dataset.editingId = personId;

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

export { getSelectedGender };

// Get selected gender from radio buttons
function getSelectedGender() {
  const maleRadio = document.getElementById('genderMale');
  const femaleRadio = document.getElementById('genderFemale');
  
  if (maleRadio && maleRadio.checked) return 'male';
  if (femaleRadio && femaleRadio.checked) return 'female';
  return '';
}

// Initialize modal when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Modal initializing...');
  
  const modal = document.getElementById('personModal');
  const cancelBtn = document.getElementById('cancelModal');
  const saveBtn = document.getElementById('savePerson');
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
      
      // Dispatch custom event for tree-core-canvas to handle
      const saveEvent = new CustomEvent('savePersonFromModal', {
        detail: {
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
        }
      });
      
      document.dispatchEvent(saveEvent);
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
  
  console.log('Modal initialization complete');
});

// Export gender getter function for use by other modules
export { getSelectedGender };
