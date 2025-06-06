export class SearchableSelect {
  constructor(containerId, typeFilter = null) {
    this.container = document.getElementById(containerId);
    this.typeFilter = typeFilter; // e.g., "male" or "female" or null
    this.selectedId = null;
    this.build();
    this.registerListeners();
  }

  build() {
    this.input = document.createElement('div');
    this.input.className = 'select-input';
    this.input.textContent = 'None';
    this.optionsContainer = document.createElement('div');
    this.optionsContainer.className = 'options hidden';
    this.searchField = document.createElement('input');
    this.searchField.type = 'text';
    this.searchField.placeholder = 'Search...';
    this.searchField.className = 'option-search';
    this.optionsContainer.appendChild(this.searchField);

    this.container.appendChild(this.input);
    this.container.appendChild(this.optionsContainer);
    this.container.__searchableInstance = this;
  }

  registerListeners() {
    this.input.addEventListener('click', () => this.toggleOptions());
    this.searchField.addEventListener('input', () => this.filterOptions());
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) this.closeOptions();
    });
  }

  toggleOptions() {
    if (this.optionsContainer.classList.contains('hidden')) {
      this.populateOptions();
      this.optionsContainer.classList.remove('hidden');
      setTimeout(() => this.searchField.focus(), 50);
    } else {
      this.closeOptions();
    }
  }

  closeOptions() {
    this.optionsContainer.classList.add('hidden');
    this.searchField.value = '';
  }

  populateOptions() {
    // Clear existing options except searchField
    [...this.optionsContainer.querySelectorAll('.option')].forEach((el) => el.remove());
    const persons = document.querySelectorAll('g.tree-node');
    persons.forEach((node) => {
      const gender = node.getAttribute('data-gender');
      if (this.typeFilter && gender !== this.typeFilter) return;
      const id = node.getAttribute('data-id');
      const name = node.getAttribute('data-name');
      const surname = node.getAttribute('data-surname');
      const display = `${name} ${surname}`.trim();
      const option = document.createElement('div');
      option.className = 'option';
      option.textContent = display;
      option.dataset.id = id;
      option.addEventListener('click', () => this.selectOption(id, display));
      this.optionsContainer.appendChild(option);
    });
  }

  filterOptions() {
    const term = this.searchField.value.toLowerCase();
    this.optionsContainer.querySelectorAll('.option').forEach((opt) => {
      if (opt.textContent.toLowerCase().includes(term)) opt.classList.remove('hidden');
      else opt.classList.add('hidden');
    });
  }

  selectOption(id, display) {
    this.selectedId = id;
    this.input.textContent = display;
    this.closeOptions();
  }

  getSelectedId() {
    return this.selectedId;
  }

  clear() {
    this.selectedId = null;
    this.input.textContent = 'None';
  }
}
