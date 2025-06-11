// tree-connections.js
// Optimized connection handling with selective updates

export class ConnectionManager {
  constructor(svg) {
    this.svg = svg;
    this.connectionPersonA = null;
    this.connectionPersonB = null;
    
    // Cache connections for efficient updates
    this.connectionCache = new Map(); // personId -> Set of line elements
    
    this.setupModalListeners();
  }

  setupModalListeners() {
    const connectionModal = document.getElementById('connectionModal');
    const cancelBtn = document.getElementById('cancelConnectionModal');
    const motherBtn = document.getElementById('motherBtn');
    const fatherBtn = document.getElementById('fatherBtn');
    const childBtn = document.getElementById('childBtn');
    const spouseBtn = document.getElementById('spouseBtn');

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.closeModal());
    }

    if (motherBtn) {
      motherBtn.addEventListener('click', () => this.handleConnectionChoice('mother'));
    }

    if (fatherBtn) {
      fatherBtn.addEventListener('click', () => this.handleConnectionChoice('father'));
    }

    if (childBtn) {
      childBtn.addEventListener('click', () => this.handleConnectionChoice('child'));
    }

    if (spouseBtn) {
      spouseBtn.addEventListener('click', () => this.handleConnectionChoice('spouse'));
    }

    // Close modal when clicking outside
    if (connectionModal) {
      connectionModal.addEventListener('click', (e) => {
        if (e.target === connectionModal) {
          this.closeModal();
        }
      });
    }
  }

  handleConnectSelected(selectedCircles) {
    if (selectedCircles.size !== 2) {
      alert('Please select exactly 2 circles to connect.');
      return;
    }
    
    const [personId1, personId2] = Array.from(selectedCircles);
    this.connectionPersonA = personId1;
    this.connectionPersonB = personId2;
    
    this.openModal();
  }

  openModal() {
    const connectionModal = document.getElementById('connectionModal');
    const connectionText = document.getElementById('connectionText');
    
    if (!connectionModal || !connectionText) return;
    
    const person1Name = this.getPersonDisplayName(this.connectionPersonA);
    const person2Name = this.getPersonDisplayName(this.connectionPersonB);
    
    connectionText.textContent = `${person1Name} is __ to ${person2Name}`;
    
    connectionModal.classList.remove('hidden');
    connectionModal.style.display = 'flex';
  }

  closeModal() {
    const connectionModal = document.getElementById('connectionModal');
    if (connectionModal) {
      connectionModal.classList.add('hidden');
      connectionModal.style.display = 'none';
    }
    
    this.connectionPersonA = null;
    this.connectionPersonB = null;
  }

  handleConnectionChoice(relationship) {
    if (!this.connectionPersonA || !this.connectionPersonB) {
      this.closeModal();
      return;
    }
    
    switch (relationship) {
      case 'mother':
        this.setPersonAttribute(this.connectionPersonB, 'data-motherId', this.connectionPersonA);
        break;
      case 'father':
        this.setPersonAttribute(this.connectionPersonB, 'data-fatherId', this.connectionPersonA);
        break;
      case 'child':
        const parentGroup = this.svg.querySelector(`g[data-id="${this.connectionPersonB}"]`);
        const parentGender = parentGroup?.getAttribute('data-gender');
        
        if (parentGender === 'male') {
          this.setPersonAttribute(this.connectionPersonA, 'data-fatherId', this.connectionPersonB);
        } else if (parentGender === 'female') {
          this.setPersonAttribute(this.connectionPersonA, 'data-motherId', this.connectionPersonB);
        } else {
          alert('Parent gender must be specified to create parent-child relationship.');
          return;
        }
        break;
      case 'spouse':
        this.setPersonAttribute(this.connectionPersonA, 'data-spouseId', this.connectionPersonB);
        this.setPersonAttribute(this.connectionPersonB, 'data-spouseId', this.connectionPersonA);
        break;
    }
    
    this.generateAll();
    this.onConnectionCreated?.();
    
    const person1Name = this.getPersonDisplayName(this.connectionPersonA);
    const person2Name = this.getPersonDisplayName(this.connectionPersonB);
    console.log(`Connected ${person1Name} and ${person2Name} as ${relationship}`);
    
    this.closeModal();
    this.onConnectionComplete?.();
  }

  getPersonDisplayName(personId) {
    const group = this.svg.querySelector(`g[data-id="${personId}"]`);
    if (!group) return personId;
    
    const name = group.getAttribute('data-name') || '';
    const surname = group.getAttribute('data-surname') || '';
    return `${name} ${surname}`.trim();
  }

  setPersonAttribute(personId, attribute, value) {
    const group = this.svg.querySelector(`g[data-id="${personId}"]`);
    if (group) {
      group.setAttribute(attribute, value);
    }
  }

  // Optimized: Update only connections for a specific person
  updatePersonConnections(personId) {
    const mainGroup = document.getElementById('mainGroup');
    const container = mainGroup || this.svg;
    
    // Remove existing connections for this person
    const existingConnections = this.connectionCache.get(personId);
    if (existingConnections) {
      existingConnections.forEach(line => line.remove());
      existingConnections.clear();
    } else {
      this.connectionCache.set(personId, new Set());
    }
    
    // Get the person's group
    const personGroup = container.querySelector(`g[data-id="${personId}"]`);
    if (!personGroup) return;
    
    // Check if this person is connected to anyone
    const motherId = personGroup.getAttribute('data-motherId');
    const fatherId = personGroup.getAttribute('data-fatherId');
    const spouseId = personGroup.getAttribute('data-spouseId');
    
    // Draw connections from this person
    if (motherId) this.drawAndCacheLine(personId, motherId, false);
    if (fatherId) this.drawAndCacheLine(personId, fatherId, false);
    if (spouseId) this.drawAndCacheLine(personId, spouseId, true);
    
    // Find and draw connections TO this person
    container.querySelectorAll('g[data-id]').forEach(otherGroup => {
      const otherId = otherGroup.getAttribute('data-id');
      if (otherId === personId) return;
      
      const otherMotherId = otherGroup.getAttribute('data-motherId');
      const otherFatherId = otherGroup.getAttribute('data-fatherId');
      const otherSpouseId = otherGroup.getAttribute('data-spouseId');
      
      if (otherMotherId === personId) {
        this.drawAndCacheLine(otherId, personId, false);
      }
      if (otherFatherId === personId) {
        this.drawAndCacheLine(otherId, personId, false);
      }
      if (otherSpouseId === personId) {
        this.drawAndCacheLine(otherId, personId, true);
      }
    });
  }

  drawAndCacheLine(idA, idB, isSpouse = false) {
    const line = this.drawLineBetween(idA, idB, isSpouse);
    if (line) {
      // Cache the line for both persons
      this.connectionCache.get(idA)?.add(line) || this.connectionCache.set(idA, new Set([line]));
      this.connectionCache.get(idB)?.add(line) || this.connectionCache.set(idB, new Set([line]));
    }
  }

  generateAll() {
    const mainGroup = document.getElementById('mainGroup');
    const container = mainGroup || this.svg;
    
    // Clear cache
    this.connectionCache.clear();
    
    // Remove existing relation lines
    container.querySelectorAll('line.relation').forEach(l => l.remove());

    container.querySelectorAll('g[data-id]').forEach(childGroup => {
      const childId = childGroup.getAttribute('data-id');
      const motherId = childGroup.getAttribute('data-motherId');
      const fatherId = childGroup.getAttribute('data-fatherId');
      const spouseId = childGroup.getAttribute('data-spouseId');

      if (motherId) this.drawAndCacheLine(childId, motherId, false);
      if (fatherId) this.drawAndCacheLine(childId, fatherId, false);
      if (spouseId) this.drawAndCacheLine(childId, spouseId, true);
    });
  }

  drawLineBetween(idA, idB, isSpouse = false) {
    const mainGroup = document.getElementById('mainGroup');
    const container = mainGroup || this.svg;
    
    const gA = container.querySelector(`g[data-id="${idA}"]`);
    const gB = container.querySelector(`g[data-id="${idB}"]`);
    if (!gA || !gB) return null;
    
    const circleA = gA.querySelector('circle.person');
    const circleB = gB.querySelector('circle.person');
    if (!circleA || !circleB) return null;
    
    const x1 = parseFloat(circleA.getAttribute('cx'));
    const y1 = parseFloat(circleA.getAttribute('cy'));
    const x2 = parseFloat(circleB.getAttribute('cx'));
    const y2 = parseFloat(circleB.getAttribute('cy'));
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.classList.add('relation');
    if (isSpouse) line.classList.add('spouse');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', isSpouse ? '#e74c3c' : '#7f8c8d');
    line.setAttribute('stroke-width', '2');
    if (isSpouse) line.setAttribute('stroke-dasharray', '4 2');
    
    // Store connection info for updates
    line.dataset.personA = idA;
    line.dataset.personB = idB;
    
    // Insert before person groups so lines appear behind circles
    const firstPersonGroup = container.querySelector('g[data-id]');
    if (firstPersonGroup) {
      container.insertBefore(line, firstPersonGroup);
    } else {
      container.appendChild(line);
    }
    
    return line;
  }

  // Event callbacks
  onConnectionCreated = null;
  onConnectionComplete = null;
}