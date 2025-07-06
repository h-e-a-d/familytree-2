// table.js
// Updated to work with Canvas-based tree implementation
// Enhanced with maiden name support

export function rebuildTableView(retryCount = 0) {
  const maxRetries = 10; // Maximum 5 seconds of retrying
  
  // Use global tree core instead of importing
  const treeCore = window.treeCore;
  
  const tbody = document.getElementById('familyTableBody');
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  
  if (!tbody || !searchInput || !sortSelect) {
    console.error('Table rebuild failed - missing UI elements:', {
      tbody: !!tbody,
      searchInput: !!searchInput,
      sortSelect: !!sortSelect
    });
    return;
  }
  
  // Check if tree core is fully initialized
  if (!treeCore || !treeCore.renderer) {
    console.log(`Tree core not ready (attempt ${retryCount + 1}/${maxRetries}), retrying in 500ms...`);
    console.log('Tree core state:', {
      treeCore: !!treeCore,
      renderer: !!treeCore?.renderer,
      nodes: treeCore?.renderer?.nodes?.size || 0
    });
    
    if (retryCount < maxRetries) {
      setTimeout(() => rebuildTableView(retryCount + 1), 500);
    } else {
      console.error('Max retries reached for table rebuild. Tree core may not be initializing properly.');
    }
    return;
  }
  
  const searchTerm = searchInput.value.trim().toLowerCase();
  const sortKey = sortSelect.value;

  // Debug: Log the data sources
  console.log('=== TABLE REBUILD DEBUG ===');
  console.log('Renderer nodes count:', treeCore.renderer.nodes.size);
  console.log('PersonData count:', treeCore.personData?.size || 0);
  console.log('Search term:', searchTerm);
  console.log('Sort key:', sortKey);

  // Gather all persons from canvas nodes
  let rowsData = [];
  
  for (const [id, node] of treeCore.renderer.nodes) {
    const personData = treeCore.getPersonData(id) || {};
    
    // Debug: Log each node being processed
    console.log(`Processing node ${id}:`, {
      node: { name: node.name, surname: node.surname, fatherName: node.fatherName },
      personData: { name: personData.name, surname: personData.surname, fatherName: personData.fatherName }
    });
    
    rowsData.push({
      id: id,
      name: node.name || personData.name || '',
      fatherName: node.fatherName || personData.fatherName || '',
      surname: node.surname || personData.surname || '',
      maidenName: node.maidenName || personData.maidenName || '', // Changed from birthName
      dob: node.dob || personData.dob || '',
      gender: node.gender || personData.gender || '',
      motherId: personData.motherId || '',
      fatherId: personData.fatherId || '',
      spouseId: personData.spouseId || ''
    });
  }

  console.log('Rows data before filtering:', rowsData.length);
  console.log('Sample row data:', rowsData.slice(0, 3));

  // Filter by search term
  if (searchTerm) {
    rowsData = rowsData.filter(r => {
      return (
        r.name.toLowerCase().includes(searchTerm) ||
        r.fatherName.toLowerCase().includes(searchTerm) ||
        r.surname.toLowerCase().includes(searchTerm) ||
        r.maidenName.toLowerCase().includes(searchTerm) || // Changed from birthName
        r.dob.toLowerCase().includes(searchTerm)
      );
    });
    console.log('Rows data after filtering:', rowsData.length);
  }

  // Sort by selected key
  rowsData.sort((a, b) => {
    let valA = a[sortKey] || '';
    let valB = b[sortKey] || '';
    // For DOB, if it's numeric (year only), sort numerically
    if (sortKey === 'dob') {
      const numA = parseInt(valA, 10);
      const numB = parseInt(valB, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
    }
    return valA.toString().localeCompare(valB.toString());
  });

  console.log('Final rows data count:', rowsData.length);
  console.log('=== END TABLE DEBUG ===');

  // Clear existing table body
  tbody.innerHTML = '';

  // Helper to find a person's display name by ID
  function getNameById(id) {
    if (!id) return '';
    const node = treeCore.renderer.nodes.get(id);
    if (!node) return '';
    const name = node.name || '';
    const surname = node.surname || '';
    return `${name} ${surname}`.trim();
  }

  // Build table rows
  rowsData.forEach(r => {
    const tr = document.createElement('tr');

    // Name
    const nameTd = document.createElement('td');
    nameTd.textContent = r.name;
    tr.appendChild(nameTd);

    // Father's Name
    const fatherNameTd = document.createElement('td');
    fatherNameTd.textContent = r.fatherName;
    tr.appendChild(fatherNameTd);

    // Surname
    const surnameTd = document.createElement('td');
    surnameTd.textContent = r.surname;
    tr.appendChild(surnameTd);

    // Maiden Name (changed from Birth Name)
    const maidenNameTd = document.createElement('td');
    maidenNameTd.textContent = r.maidenName;
    tr.appendChild(maidenNameTd);

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
    editBtn.classList.add('table-btn');
    editBtn.addEventListener('click', () => {
      // Dispatch a custom event so tree-core-canvas can pick it up
      const event = new CustomEvent('editPerson', { detail: { id: r.id } });
      document.dispatchEvent(event);
    });
    actionsTd.appendChild(editBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.classList.add('table-btn');
    deleteBtn.addEventListener('click', () => {
      const displayName = `${r.name} ${r.surname}`.trim();
      if (!confirm(`Delete ${displayName}?`)) return;
      
      // Remove from canvas
      treeCore.renderer.removeNode(r.id);
      treeCore.personData?.delete(r.id);
      
      // After removal, rebuild connections and table
      treeCore.regenerateConnections();
      rebuildTableView();
      treeCore.undoRedoManager.pushUndoState();
    });
    actionsTd.appendChild(deleteBtn);

    tr.appendChild(actionsTd);
    tbody.appendChild(tr);
  });
}

// Initialize event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Wire up search and sort inputs to automatically rebuild table
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      rebuildTableView();
    });
  }
  
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      rebuildTableView();
    });
  }
});

// Listen for `editPerson` from this module's buttons and call modal.openModalForEdit
document.addEventListener('editPerson', (e) => {
  import('../modals/modal.js').then(mod => {
    if (typeof mod.openModalForEdit === 'function') {
      mod.openModalForEdit(e.detail.id);
    }
  });
});
