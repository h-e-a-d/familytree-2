// table.js
// --------
// Renders the “Table View” of all persons, handles search/sort, 
// and wires up Edit/Delete buttons within each row.

export function rebuildTableView() {
  const svg = document.getElementById('svgArea');
  const tbody = document.getElementById('familyTableBody');
  const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
  const sortKey = document.getElementById('sortSelect').value;

  // Gather all person <g> elements
  const allGroups = Array.from(svg.querySelectorAll('g[data-id]'));
  let rowsData = allGroups.map(g => {
    return {
      id: g.getAttribute('data-id'),
      name: g.getAttribute('data-name') || '',
      surname: g.getAttribute('data-surname') || '',
      birthName: g.getAttribute('data-birthName') || '',
      dob: g.getAttribute('data-dob') || '',
      gender: g.getAttribute('data-gender') || '',
      motherId: g.getAttribute('data-motherId') || '',
      fatherId: g.getAttribute('data-fatherId') || '',
      spouseId: g.getAttribute('data-spouseId') || ''
    };
  });

  // Filter by search term (search in name, surname, birthName, dob)
  if (searchTerm) {
    rowsData = rowsData.filter(r => {
      return (
        r.name.toLowerCase().includes(searchTerm) ||
        r.surname.toLowerCase().includes(searchTerm) ||
        r.birthName.toLowerCase().includes(searchTerm) ||
        r.dob.toLowerCase().includes(searchTerm)
      );
    });
  }

  // Sort by selected key
  rowsData.sort((a, b) => {
    let valA = a[sortKey] || '';
    let valB = b[sortKey] || '';
    // For DOB, if it’s numeric (year only), sort numerically
    if (sortKey === 'dob') {
      const numA = parseInt(valA, 10);
      const numB = parseInt(valB, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
    }
    return valA.toString().localeCompare(valB.toString());
  });

  // Clear existing table body
  tbody.innerHTML = '';

  // Helper to find a person's display name by ID
  function getNameById(id) {
    if (!id) return '';
    const g = svg.querySelector(`g[data-id="${id}"]`);
    return g ? (g.getAttribute('data-name') + ' ' + (g.getAttribute('data-surname') || '')) : '';
  }

  // Build table rows
  rowsData.forEach(r => {
    const tr = document.createElement('tr');

    // Name
    const nameTd = document.createElement('td');
    nameTd.textContent = r.name;
    tr.appendChild(nameTd);

    // Surname
    const surnameTd = document.createElement('td');
    surnameTd.textContent = r.surname;
    tr.appendChild(surnameTd);

    // Birth Name
    const birthNameTd = document.createElement('td');
    birthNameTd.textContent = r.birthName;
    tr.appendChild(birthNameTd);

    // DOB
    const dobTd = document.createElement('td');
    dobTd.textContent = r.dob;
    tr.appendChild(dobTd);

    // Gender
    const genderTd = document.createElement('td');
    genderTd.textContent = r.gender;
    tr.appendChild(genderTd);

    // Mother
    const motherTd = document.createElement('td');
    motherTd.textContent = getNameById(r.motherId);
    tr.appendChild(motherTd);

    // Father
    const fatherTd = document.createElement('td');
    fatherTd.textContent = getNameById(r.fatherId);
    tr.appendChild(fatherTd);

    // Spouse
    const spouseTd = document.createElement('td');
    spouseTd.textContent = getNameById(r.spouseId);
    tr.appendChild(spouseTd);

    // Actions (Edit/Delete)
    const actionsTd = document.createElement('td');
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => {
      // Dispatch a custom event so tree.js’s openModalForEdit can pick it up
      const event = new CustomEvent('editPerson', { detail: { id: r.id } });
      document.dispatchEvent(event);
    });
    editBtn.classList.add('table-btn');
    actionsTd.appendChild(editBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => {
      if (!confirm(`Delete ${r.name} ${r.surname || ''}?`)) return;
      // Remove the SVG node
      const g = svg.querySelector(`g[data-id="${r.id}"]`);
      if (g) g.remove();
      // After removal, rebuild connections and table
      rebuildTableView();
      const rebuildEvent = new Event('tableRebuilt');
      document.dispatchEvent(rebuildEvent);
    });
    deleteBtn.classList.add('table-btn');
    actionsTd.appendChild(deleteBtn);

    tr.appendChild(actionsTd);
    tbody.appendChild(tr);
  });
}

// Wire up search and sort inputs to automatically rebuild table
document.getElementById('searchInput').addEventListener('input', () => {
  rebuildTableView();
});
document.getElementById('sortSelect').addEventListener('change', () => {
  rebuildTableView();
});

// Listen for `editPerson` from this module's buttons and call modal.openModalForEdit
document.addEventListener('editPerson', (e) => {
  import('./modal.js').then(mod => {
    if (typeof mod.openModalForEdit === 'function') {
      mod.openModalForEdit(e.detail.id);
    }
  });
});

// If table got rebuilt via the delete button, trigger regenerating connections and undo push
document.addEventListener('tableRebuilt', () => {
  import('./tree.js').then(mod => {
    if (typeof mod.generateAllConnections === 'function') {
      mod.generateAllConnections();
    }
    if (typeof mod.pushUndoState === 'function') {
      mod.pushUndoState();
    }
  });
});
