// modal.js
// --------
// Manages opening/closing the Add/Edit Person modal, pre‐populating fields when editing,
// and invoking updateSearchableSelects() so Mother/Father/Spouse dropdowns are rebuilt.

import { updateSearchableSelects } from './searchableSelect.js';

export function openModalForEdit(personId) {
  const modal = document.getElementById('personModal');
  const titleEl = document.getElementById('modalTitle');

  // If personId is provided, we are in “Edit” mode; otherwise “Add” mode
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
    updateSearchableSelects(existingData);
  } else {
    titleEl.textContent = 'Add Person';
    delete modal.dataset.editingId;

    // Clear all form fields
    document.getElementById('personName').value = '';
    document.getElementById('personSurname').value = '';
    document.getElementById('personBirthName').value = '';
    document.getElementById('personDob').value = '';
    document.getElementById('personGender').value = '';

    // No existing relationships
    updateSearchableSelects({});
  }

  // Show the modal
  modal.classList.remove('hidden');
  // Dispatch a "show" event so anyone (e.g., tree.js) can react
  modal.dispatchEvent(new Event('show'));
}

export function closeModal() {
  const modal = document.getElementById('personModal');

  // Clear any validation state (optional)
  document.getElementById('personForm').reset();

  // Hide the modal
  modal.classList.add('hidden');
  delete modal.dataset.editingId;
}
