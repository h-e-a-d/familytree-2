// searchableSelect.js
// -------------------
// Exports a single function `updateSearchableSelects`
// which re‐builds all searchable dropdowns in the modal
// based on the current list of SVG <g data-id="…"> persons.

export function updateSearchableSelects(existingModalData = {}) {
  // existingModalData can contain { motherId, fatherId, spouseId } when editing

  // Helper: build an array of all current persons
  const allGroups = Array.from(document.querySelectorAll('svg#svgArea g[data-id]'));
  const persons = allGroups.map(g => {
    return {
      id: g.getAttribute('data-id'),
      name: g.getAttribute('data-name') || '',
      surname: g.getAttribute('data-surname') || '',
      gender: g.getAttribute('data-gender'),
    };
  });

  // Build dropdown options HTML for a given gender filter
  function buildOptions(filterGender, selectedId) {
    const filtered = persons
      .filter(p => filterGender === null || p.gender === filterGender)
      .sort((a, b) => a.name.localeCompare(b.name));
    
    let options = '<div class="select-option" data-id="">None</div>';
    options += filtered.map(p => {
      const isSelected = p.id === selectedId ? 'selected' : '';
      const displayName = `${p.name} ${p.surname}`.trim();
      return `<div class="select-option" data-id="${p.id}" ${isSelected}>
                ${displayName}
              </div>`;
    }).join('');
    return options;
  }

  // For each of the three selects: mother (female), father (male), spouse (any)
  const motherContainer = document.querySelector('#motherSelect');
  const fatherContainer = document.querySelector('#fatherSelect');
  const spouseContainer = document.querySelector('#spouseSelect');

  // Clear previous contents
  [motherContainer, fatherContainer, spouseContainer].forEach(c => {
    if (c) c.innerHTML = '';
  });

  // Create the "input box" and the hidden <input> for each
  function createSearchable(container, placeholder, filterGender, existingId) {
    if (!container) return;

    // Find selected person's display name
    let displayText = placeholder;
    if (existingId) {
      const selectedPerson = persons.find(p => p.id === existingId);
      if (selectedPerson) {
        displayText = `${selectedPerson.name} ${selectedPerson.surname}`.trim();
      }
    }

    // Visible box
    const inputBox = document.createElement('div');
    inputBox.className = 'select-input';
    inputBox.textContent = displayText;
    inputBox.dataset.selectedId = existingId || '';
    container.appendChild(inputBox);

    // Hidden actual <input> to store the selected ID
    const hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.value = existingId || '';
    hidden.name = container.id + '_value';
    container.appendChild(hidden);

    // Dropdown options wrapper
    const optionsWrapper = document.createElement('div');
    optionsWrapper.className = 'options hidden';
    optionsWrapper.innerHTML = buildOptions(filterGender, existingId);
    container.appendChild(optionsWrapper);

    // Clicking on inputBox toggles options
    inputBox.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close other open dropdowns
      document.querySelectorAll('.searchable-select .options').forEach(opt => {
        if (opt !== optionsWrapper) {
          opt.classList.add('hidden');
          opt.parentNode.querySelector('.select-input').classList.remove('open');
        }
      });
      
      optionsWrapper.classList.toggle('hidden');
      inputBox.classList.toggle('open');
    });

    // When clicking an option:
    optionsWrapper.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!e.target.classList.contains('select-option')) return;
      
      const chosenId = e.target.dataset.id;
      const labelText = e.target.textContent.trim();
      
      inputBox.textContent = labelText;
      inputBox.dataset.selectedId = chosenId;
      hidden.value = chosenId;
      
      // Update selected state
      optionsWrapper.querySelectorAll('.select-option').forEach(opt => {
        opt.classList.remove('selected');
      });
      e.target.classList.add('selected');
      
      // Close dropdown
      optionsWrapper.classList.add('hidden');
      inputBox.classList.remove('open');
    });
  }

  // Build each searchable select
  createSearchable(motherContainer, 'Select Mother', 'female', existingModalData.motherId);
  createSearchable(fatherContainer, 'Select Father', 'male', existingModalData.fatherId);
  createSearchable(spouseContainer, 'Select Spouse', null, existingModalData.spouseId);
}

// Close all dropdowns when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.searchable-select')) {
    document.querySelectorAll('.searchable-select .options').forEach(options => {
      options.classList.add('hidden');
      const inputBox = options.parentNode.querySelector('.select-input');
      if (inputBox) {
        inputBox.classList.remove('open');
      }
    });
  }
});