import { SearchableSelect } from './searchableSelect.js';

const addPersonBtn = document.getElementById('addPersonBtn');
const personModal = document.getElementById('personModal');
const cancelModalBtn = document.getElementById('cancelModal');
const personForm = document.getElementById('personForm');
const modalTitle = document.getElementById('modalTitle');

let editingId = null;
let motherSelect, fatherSelect, spouseSelect;

function openModal(isEdit = false, personId = null) {
  personModal.classList.remove('hidden');
  if (isEdit) {
    modalTitle.textContent = 'Edit Person';
    editingId = personId;
    populateForm(personId);
  } else {
    modalTitle.textContent = 'Add Person';
    editingId = null;
    personForm.reset();
    motherSelect.clear();
    fatherSelect.clear();
    spouseSelect.clear();
  }
}

function closeModal() {
  personModal.classList.add('hidden');
}

function populateForm(personId) {
  const node = document.querySelector(`g[data-id='${personId}']`);
  document.getElementById('personName').value = node.getAttribute('data-name');
  document.getElementById('personSurname').value = node.getAttribute('data-surname');
  document.getElementById('personBirthName').value = node.getAttribute('data-birthname');
  document.getElementById('personDob').value = node.getAttribute('data-dob');
  document.getElementById('personGender').value = node.getAttribute('data-gender');
  motherSelect.clear();
  fatherSelect.clear();
  spouseSelect.clear();
  const mId = node.getAttribute('data-mother');
  const fId = node.getAttribute('data-father');
  const sId = node.getAttribute('data-spouse');
  if (mId) motherSelect.selectOption(mId, getDisplayName(mId));
  if (fId) fatherSelect.selectOption(fId, getDisplayName(fId));
  if (sId) spouseSelect.selectOption(sId, getDisplayName(sId));
}

function getDisplayName(id) {
  const node = document.querySelector(`g[data-id='${id}']`);
  return `${node.getAttribute('data-name')} ${node.getAttribute('data-surname')}`.trim();
}

addPersonBtn.addEventListener('click', () => openModal());
cancelModalBtn.addEventListener('click', closeModal);

personForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('personName').value.trim();
  const surname = document.getElementById('personSurname').value.trim();
  const birthname = document.getElementById('personBirthName').value.trim();
  const dob = document.getElementById('personDob').value.trim();
  const gender = document.getElementById('personGender').value;
  const motherId = motherSelect.getSelectedId();
  const fatherId = fatherSelect.getSelectedId();
  const spouseId = spouseSelect.getSelectedId();
  if (!name || !gender) {
    alert('Name and Gender are required.');
    return;
  }
  // Validate DOB format (basic)
  const yearOnly = /^\d{4}$/;
  const fullDate = /^\d{2}\.\d{2}\.\d{4}$/;
  if (dob && !yearOnly.test(dob) && !fullDate.test(dob)) {
    alert('DOB must be yyyy or dd.mm.yyyy');
    return;
  }
  const personData = { name, surname, birthname, dob, gender, motherId, fatherId, spouseId };
  if (editingId) {
    import('./tree.js').then(({ editPerson }) => editPerson(editingId, personData));
  } else {
    import('./tree.js').then(({ addPerson }) => addPerson(personData));
  }
  closeModal();
});

window.initModal = () => {
  motherSelect = new SearchableSelect('motherSelect', 'female');
  fatherSelect = new SearchableSelect('fatherSelect', 'male');
  spouseSelect = new SearchableSelect('spouseSelect', null);
};

document.addEventListener('DOMContentLoaded', window.initModal);
