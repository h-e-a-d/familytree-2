export function redrawTable() {
  const tbody = document.getElementById('familyTableBody');
  tbody.innerHTML = '';
  const filter = document.getElementById('searchInput').value.toLowerCase();
  const sortBy = document.getElementById('sortSelect').value;

  const nodes = Array.from(document.querySelectorAll('g.tree-node'));
  let data = nodes.map((node) => {
    return {
      id: node.getAttribute('data-id'),
      name: node.getAttribute('data-name'),
      surname: node.getAttribute('data-surname'),
      birthname: node.getAttribute('data-birthname'),
      dob: node.getAttribute('data-dob'),
      gender: node.getAttribute('data-gender'),
      mother: node.getAttribute('data-mother'),
      father: node.getAttribute('data-father'),
      spouse: node.getAttribute('data-spouse'),
    };
  });
  if (filter) {
    data = data.filter((d) => d.name.toLowerCase().includes(filter) || d.surname.toLowerCase().includes(filter));
  }
  data.sort((a, b) => (a[sortBy] > b[sortBy] ? 1 : -1));

  data.forEach((d) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${d.name}</td>
      <td>${d.father}</td>
      <td>${d.surname}</td>
      <td>${d.birthname}</td>
      <td>${d.dob}</td>
      <td>${d.gender}</td>
      <td>${d.mother}</td>
      <td>${d.father}</td>
      <td>${d.spouse}</td>
      <td>
        <button class="edit-btn" data-id="${d.id}">Edit</button>
        <button class="delete-btn" data-id="${d.id}">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
  document.querySelectorAll('.edit-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      import('./modal.js').then(({ openModal }) => openModal(true, id));
    });
  });
  document.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      if (confirm('Delete this person?')) deletePerson(id);
    });
  });
}

function deletePerson(id) {
  import('./tree.js').then(({ pushHistory }) => pushHistory());
  const node = document.querySelector(`g[data-id='${id}']`);
  node.parentNode.removeChild(node);
  redrawTable();
  import('./searchableSelect.js').then(({ updateSearchableSelects }) => updateSearchableSelects());
}

document.getElementById('searchInput').addEventListener('input', redrawTable);
document.getElementById('sortSelect').addEventListener('change', redrawTable);
