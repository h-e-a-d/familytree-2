// debug-helper.js - Simple debugging utilities

// Add to the HTML file to help debug issues
window.addEventListener('DOMContentLoaded', () => {
  console.log('=== DEBUG HELPER LOADED ===');
  
  // Test sidebar buttons after a delay
  setTimeout(() => {
    console.log('=== TESTING SIDEBAR BUTTONS ===');
    
    const buttons = [
      'homeBtn',
      'zoomInBtn', 
      'zoomOutBtn',
      'settingsToggle',
      'viewToggle'
    ];
    
    buttons.forEach(id => {
      const btn = document.getElementById(id);
      console.log(`${id}:`, btn ? 'Found' : 'NOT FOUND');
      if (btn) {
        console.log(`  - Has click listener:`, btn.onclick ? 'Yes' : 'Event listeners attached');
      }
    });
    
    // Test modal elements
    console.log('=== TESTING MODAL ELEMENTS ===');
    const modalElements = [
      'personModal',
      'personName',
      'genderMale',
      'genderFemale',
      'savePerson',
      'cancelModal'
    ];
    
    modalElements.forEach(id => {
      const el = document.getElementById(id);
      console.log(`${id}:`, el ? 'Found' : 'NOT FOUND');
    });
    
    // Test canvas
    console.log('=== TESTING CANVAS ===');
    const graphicView = document.getElementById('graphicView');
    const canvas = graphicView?.querySelector('canvas');
    console.log('GraphicView:', graphicView ? 'Found' : 'NOT FOUND');
    console.log('Canvas:', canvas ? 'Found' : 'NOT FOUND');
    
  }, 1000);
  
  // Listen for all custom events
  ['savePersonFromModal', 'displayPreferenceChanged', 'nodeStyleChanged'].forEach(eventName => {
    document.addEventListener(eventName, (e) => {
      console.log(`🎯 Custom event fired: ${eventName}`, e.detail);
    });
  });
});

// Helper function to test zoom
window.testZoom = function() {
  console.log('Testing zoom functionality...');
  const graphicView = document.getElementById('graphicView');
  const canvas = graphicView?.querySelector('canvas');
  
  if (canvas) {
    console.log('Found canvas, dispatching wheel event');
    const rect = canvas.getBoundingClientRect();
    const wheelEvent = new WheelEvent('wheel', {
      deltaY: -100,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      bubbles: true,
      cancelable: true
    });
    canvas.dispatchEvent(wheelEvent);
  } else {
    console.log('No canvas found');
  }
};

// Helper function to test save
window.testSave = function() {
  console.log('Testing save functionality...');
  
  // Fill out form
  const nameInput = document.getElementById('personName');
  const maleRadio = document.getElementById('genderMale');
  
  if (nameInput && maleRadio) {
    nameInput.value = 'Test Person';
    maleRadio.checked = true;
    
    // Click save
    const saveBtn = document.getElementById('savePerson');
    if (saveBtn) {
      console.log('Clicking save button...');
      saveBtn.click();
    }
  }
};
