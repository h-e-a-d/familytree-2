// searchableSelect.js
// -------------------
// Exports a single function `updateSearchableSelects`
// which re‐builds all searchable dropdowns in the modal
// based on the current list of SVG <g data-id="…"> persons.

export function updateSearchableSelects(existingModalData = {}) {
  // existingModalData can contain { motherId, fatherId, spouseId } when editing

  // Helper: build an array of all current persons
  const allGroups = Array.from(document.querySelectorAll('svg#g svg g[data-id]'));
  const persons = allGroups.map(g => {
    return {
      id: g.getAttribute('data-id'),
      name: g.getAttribute('data-name'),
      surname: g.getAttribute('data-surname'),
      gender: g.getAttribute('data-gender'),
    };
  });

  // Build dropdown options HTML for a given gender filter
  function buildOptions(filterGender, selectedId) {
    const filtered = persons
      .filter(p => filterGender === null || p.gender === filterGender)
      .sort((a, b) => a.name.localeCompare(b.name));
    return filtered.map(p => {
      const isSelected = p.id === selectedId ? 'selected' : '';
      return `<div class="select-option" data-id="${p.id}" ${isSelected}>
                ${p.name} ${p.surname || ''}
              </div>`;
    }).join('');
  }

  // For each of the three selects: mother (female), father (male), spouse (any)
  const motherContainer = document.querySelector('#motherSelect');
  const fatherContainer = document.querySelector('#fatherSelect');
  const spouseContainer = document.querySelector('#spouseSelect');

  // Clear previous contents
  [motherContainer, fatherContainer, spouseContainer].forEach(c => {
    c.innerHTML = '';
  });

  // Create the “input box” and the hidden <input> for each
  function createSearchable(container, placeholder, filterGender, existingId) {
    // Visible box
    const inputBox = document.createElement('div');
    inputBox.className = 'select-input';
    inputBox.textContent = existingId
      ? persons.find(p => p.id === existingId)?.name + ' ' + (persons.find(p => p.id === existingId)?.surname || '')
      : placeholder;
    inputBox.dataset.selectedId = existingId || '';
    container.appendChild(inputBox);

    // Hidden actual <input> to store the selected ID
    const hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.value = existingId || '';
    container.appendChild(hidden);

    // Dropdown options wrapper
    const optionsWrapper = document.createElement('div');
    optionsWrapper.className = 'options hidden';
    optionsWrapper.innerHTML = buildOptions(filterGender, existingId);
    container.appendChild(optionsWrapper);

    // Clicking on inputBox toggles options
    inputBox.addEventListener('click', () => {
      optionsWrapper.classList.toggle('hidden');
      inputBox.classList.toggle('open');
      // Focus on a filtering input if you want to add one in the future.
    });

    // When clicking an option:
    optionsWrapper.addEventListener('click', (e) => {
      if (!e.target.classList.contains('select-option')) return;
      const chosenId = e.target.dataset.id;
      const labelText = e.target.textContent.trim();
      inputBox.textContent = labelText;
      inputBox.dataset.selectedId = chosenId;
      hidden.value = chosenId;
      // Close dropdown
      optionsWrapper.classList.add('hidden');
      inputBox.classList.remove('open');
    });

    // Click outside to close
    document.addEventListener('click', (e) => {
      if (!container.contains(e.target)) {
        optionsWrapper.classList.add('hidden');
        inputBox.classList.remove('open');
      }
    });
  }

  // Build each searchable select
  createSearchable(motherContainer, 'Select Mother', 'female', existingModalData.motherId);
  createSearchable(fatherContainer, 'Select Father', 'male', existingModalData.fatherId);
  createSearchable(spouseContainer, 'Select Spouse', null, existingModalData.spouseId);
}
