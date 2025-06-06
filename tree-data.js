// tree-data.js
// Handles save/load JSON functionality

export class DataManager {
  constructor(svg, treeCore) {
    this.svg = svg;
    this.treeCore = treeCore;
  }

  saveToJSON() {
    if (!this.svg) return;
    
    const allGroups = Array.from(this.svg.querySelectorAll('g[data-id]'));
    const data = {
      version: '1.0',
      settings: this.treeCore.getState(),
      view: this.treeCore.panZoom.getTransform(),
      selection: this.treeCore.selection.getSelectionData(),
      persons: allGroups.map(g => {
        const circle = g.querySelector('circle.person');
        return {
          id: g.getAttribute('data-id'),
          name: g.getAttribute('data-name') || '',
          surname: g.getAttribute('data-surname') || '',
          birthName: g.getAttribute('data-birthName') || '',
          dob: g.getAttribute('data-dob') || '',
          gender: g.getAttribute('data-gender') || '',
          motherId: g.getAttribute('data-motherId') || '',
          fatherId: g.getAttribute('data-fatherId') || '',
          spouseId: g.getAttribute('data-spouseId') || '',
          cx: circle ? circle.getAttribute('cx') : '0',
          cy: circle ? circle.getAttribute('cy') : '0',
          nodeColor: circle ? circle.getAttribute('fill') : this.treeCore.getState().defaultColor,
          nodeSize: circle ? circle.getAttribute('r') : this.treeCore.getState().nodeRadius,
        };
      })
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'family_tree.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('Family tree saved to JSON');
  }

  loadFromJSON(event) {
    const file = event.target.files[0];
    if (!file || !this.svg) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        this.processLoadedData(data);
      } catch (error) {
        console.error('Error parsing JSON:', error);
        alert('Error loading file: Invalid JSON format');
      }
    };
    reader.readAsText(file);
  }

  processLoadedData(data) {
    try {
      // Clear existing content
      this.clearCanvas();
      
      // Restore settings
      if (data.settings) {
        this.treeCore.setState(data.settings);
      }
      
      // Restore view
      if (data.view) {
        this.treeCore.panZoom.setTransform(
          data.view.panX || 0,
          data.view.panY || 0,
          data.view.scale || 1
        );
      }
      
      // Recreate persons
      if (data.persons && Array.isArray(data.persons)) {
        data.persons.forEach(person => this.createPersonFromData(person));
      }

      // Restore selection if available
      if (data.selection && Array.isArray(data.selection)) {
        this.treeCore.selection.restoreSelection(data.selection, this.svg);
      }

      // Final setup
      this.treeCore.grid.draw();
      this.treeCore.connections.generateAll();
      
      // Rebuild table
      if (typeof rebuildTableView === 'function') {
        import('../table.js').then(mod => {
          if (mod.rebuildTableView) {
            mod.rebuildTableView();
          }
        });
      }
      
      // Push to undo stack
      this.treeCore.undo.clear();
      this.treeCore.undo.pushState();
      
      console.log('Family tree loaded successfully');
      
    } catch (error) {
      console.error('Error processing loaded data:', error);
      alert('Error loading file: ' + error.message);
    }
  }

  clearCanvas() {
    const mainGroup = document.getElementById('mainGroup');
    if (mainGroup) {
      mainGroup.innerHTML = '';
    } else {
      this.svg.innerHTML = '';
      const newMainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      newMainGroup.id = 'mainGroup';
      this.svg.appendChild(newMainGroup);
    }
  }

  createPersonFromData(personData) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('data-id', personData.id);
    group.setAttribute('data-name', personData.name);
    group.setAttribute('data-surname', personData.surname);
    group.setAttribute('data-birthName', personData.birthName);
    group.setAttribute('data-dob', personData.dob);
    group.setAttribute('data-gender', personData.gender);
    group.setAttribute('data-motherId', personData.motherId);
    group.setAttribute('data-fatherId', personData.fatherId);
    group.setAttribute('data-spouseId', personData.spouseId);
    group.classList.add('person-group');

    // Ensure coordinates are valid numbers
    let cx = parseFloat(personData.cx);
    let cy = parseFloat(personData.cy);
    
    if (isNaN(cx) || isNaN(cy)) {
      cx = 600 + Math.random() * 200 - 100;
      cy = 400 + Math.random() * 200 - 100;
    }

    const coreState = this.treeCore.getState();

    // Create circle
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.classList.add('person');
    circle.setAttribute('cx', cx);
    circle.setAttribute('cy', cy);
    circle.setAttribute('r', personData.nodeSize || coreState.nodeRadius);
    circle.setAttribute('fill', personData.nodeColor || coreState.defaultColor);
    group.appendChild(circle);

    // Create name text
    const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    nameText.classList.add('name');
    nameText.textContent = personData.name;
    nameText.setAttribute('x', cx);
    nameText.setAttribute('y', cy - (personData.nodeSize || coreState.nodeRadius) - 8);
    nameText.setAttribute('text-anchor', 'middle');
    nameText.setAttribute('font-family', coreState.fontFamily);
    nameText.setAttribute('font-size', `${coreState.fontSize}px`);
    nameText.setAttribute('fill', coreState.nameColor);
    group.appendChild(nameText);

    // Create DOB text
    const dobText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    dobText.classList.add('dob');
    dobText.textContent = personData.dob;
    dobText.setAttribute('x', cx);
    dobText.setAttribute('y', cy + (personData.nodeSize || coreState.nodeRadius) + 16);
    dobText.setAttribute('text-anchor', 'middle');
    dobText.setAttribute('font-family', coreState.fontFamily);
    dobText.setAttribute('font-size', `${coreState.fontSize - 2}px`);
    dobText.setAttribute('fill', coreState.dateColor);
    group.appendChild(dobText);

    // Setup interactions
    this.treeCore.interactions.setupCircleInteractions(group, circle, personData.id);
    
    // Add to SVG
    const container = document.getElementById('mainGroup') || this.svg;
    container.appendChild(group);
  }

  exportData() {
    if (!this.svg) return null;
    
    const allGroups = Array.from(this.svg.querySelectorAll('g[data-id]'));
    return {
      version: '1.0',
      settings: this.treeCore.getState(),
      view: this.treeCore.panZoom.getTransform(),
      selection: this.treeCore.selection.getSelectionData(),
      persons: allGroups.map(g => {
        const circle = g.querySelector('circle.person');
        return {
          id: g.getAttribute('data-id'),
          name: g.getAttribute('data-name') || '',
          surname: g.getAttribute('data-surname') || '',
          birthName: g.getAttribute('data-birthName') || '',
          dob: g.getAttribute('data-dob') || '',
          gender: g.getAttribute('data-gender') || '',
          motherId: g.getAttribute('data-motherId') || '',
          fatherId: g.getAttribute('data-fatherId') || '',
          spouseId: g.getAttribute('data-spouseId') || '',
          cx: circle ? circle.getAttribute('cx') : '0',
          cy: circle ? circle.getAttribute('cy') : '0',
          nodeColor: circle ? circle.getAttribute('fill') : this.treeCore.getState().defaultColor,
          nodeSize: circle ? circle.getAttribute('r') : this.treeCore.getState().nodeRadius,
        };
      })
    };
  }
}