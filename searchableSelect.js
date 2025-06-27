// searchableSelect.js
// Updated to work with Canvas-based tree implementation
// Enhanced with maiden name support

export function updateSearchableSelects(existingModalData = {}) {
  // Use global tree core instead of importing
  const treeCore = window.treeCore;
  
  // Build an array of all current persons from canvas nodes
  const persons = [];
  
  if (treeCore.renderer && treeCore.renderer.nodes) {
    for (const [id, node] of treeCore.renderer.nodes) {
      const personData = treeCore.getPersonData(id) || {};
      persons.push({
        id: id,
        name: node.name || personData.name || '',
        fatherName: node.fatherName || personData.fatherName || '',
        surname: node.surname || personData.surname || '',
        maidenName: node.maidenName || personData.maidenName || '', // Changed from birthName
        gender: node.gender || personData.gender || ''
      });
    }
  }

  // Build dropdown options HTML for a given gender filter
  function buildOptions(filterGender, selectedId) {
    const filtered = persons
      .filter(p => filterGender === null || p.gender === filterGender)
      .sort((a, b) => a.name.localeCompare(b.name));
    
    let options = '<div class="select-option" data-id="">None</div>';
    options += filtered.map(p => {
      const isSelected = p.id === selectedId ? 'selected' : '';
      // Build display name: Name + Father's Name + Surname (+ Maiden Name if applicable)
      let displayName = p.name;
      if (p.fatherName) {
        displayName += ` ${p.fatherName}`;
      }
      if (p.surname) {
        displayName += ` ${p.surname}`;
      }
      // Add maiden name in parentheses if it exists and is different from surname
      if (p.maidenName && p.maidenName !== p.surname && p.maidenName.trim() !== '') {
        displayName += ` (${p.maidenName})`;
      }
      return `<div class="select-option" data-id="${p.id}" ${isSelected}>
                ${displayName.trim()}
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
        let name = selectedPerson.name;
        if (selectedPerson.fatherName) {
          name += ` ${selectedPerson.fatherName}`;
        }
        if (selectedPerson.surname) {
          name += ` ${selectedPerson.surname}`;
        }
        // Add maiden name in parentheses if it exists and is different from surname
        if (selectedPerson.maidenName && selectedPerson.maidenName !== selectedPerson.surname && selectedPerson.maidenName.trim() !== '') {
          name += ` (${selectedPerson.maidenName})`;
        }
        displayText = name.trim();
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
