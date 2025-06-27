// ui-buttons.js
// Button and UI controls manager for family tree

export function setupButtons(treeCore) {
  treeCore.addPersonBtn = document.getElementById('addPersonBtn');
  treeCore.connectBtn = document.getElementById('connectBtn');
  treeCore.editBtn = document.getElementById('editBtn');
  treeCore.styleBtn = document.getElementById('styleBtn');
  treeCore.undoSidebarBtn = document.getElementById('undoSidebarBtn');
  treeCore.redoSidebarBtn = document.getElementById('redoSidebarBtn');
  treeCore.bringFrontBtn = document.getElementById('bringFrontBtn');

  if (treeCore.addPersonBtn) {
    treeCore.addPersonBtn.addEventListener('click', () => {
      const floatingButtons = document.querySelector('.floating-buttons');
      if (floatingButtons && floatingButtons.classList.contains('expanded')) {
        treeCore.clearSelection();
      } else {
        console.log('Add person button clicked');
        import('./modal.js').then(modalModule => {
          if (modalModule.openModalForEdit) {
            modalModule.openModalForEdit();
          }
        });
      }
    });
  }

  if (treeCore.undoSidebarBtn) {
    treeCore.undoSidebarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (treeCore.undoRedoManager) {
        treeCore.undoRedoManager.undo();
      }
    });
  }

  if (treeCore.redoSidebarBtn) {
    treeCore.redoSidebarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (treeCore.undoRedoManager) {
        treeCore.undoRedoManager.redo();
      }
    });
  }

  if (treeCore.connectBtn) {
    treeCore.connectBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      treeCore.handleConnectSelected();
    });
  }

  if (treeCore.editBtn) {
    treeCore.editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      treeCore.handleEditSelected();
    });
  }

  if (treeCore.styleBtn) {
    treeCore.styleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      treeCore.openStyleModal();
    });
  }

  if (treeCore.bringFrontBtn) {
    treeCore.bringFrontBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      treeCore.handleBringToFront();
    });
  }

  // Setup zoom controls
  setupZoomControls(treeCore);
  
  // Setup top toolbar
  setupTopToolbar(treeCore);

  // Setup connection modal as part of button setup
  if (typeof treeCore.setupConnectionModal === 'function') {
    treeCore.setupConnectionModal();
  }
}

// Zoom controls functionality
function setupZoomControls(treeCore) {
  const zoomInBtn = document.getElementById('zoomInControl');
  const zoomOutBtn = document.getElementById('zoomOutControl');
  const zoomDisplay = document.getElementById('zoomDisplay');

  // Update zoom display
  function updateZoomDisplay() {
    if (treeCore.renderer && zoomDisplay) {
      const zoomPercent = Math.round(treeCore.renderer.camera.scale * 100);
      zoomDisplay.textContent = `${zoomPercent}%`;
    }
  }

  // Zoom In (smaller steps)
  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (treeCore.renderer) {
        const currentScale = treeCore.renderer.camera.scale;
        const newScale = Math.min(5, currentScale * 1.1); // Smaller step: 10% increase, Max zoom 500%
        
        // Zoom towards center of view
        const rect = treeCore.renderer.canvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        // Calculate world position of center
        const worldX = (centerX - treeCore.renderer.camera.x) / currentScale;
        const worldY = (centerY - treeCore.renderer.camera.y) / currentScale;
        
        // Update camera to keep center point fixed
        treeCore.renderer.camera.x = centerX - worldX * newScale;
        treeCore.renderer.camera.y = centerY - worldY * newScale;
        treeCore.renderer.camera.scale = newScale;
        
        updateZoomDisplay();
        treeCore.renderer.needsRedraw = true;
      }
    });
  }

  // Zoom Out (smaller steps)
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (treeCore.renderer) {
        const currentScale = treeCore.renderer.camera.scale;
        const newScale = Math.max(0.1, currentScale / 1.1); // Smaller step: 10% decrease, Min zoom 10%
        
        // Zoom towards center of view
        const rect = treeCore.renderer.canvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        // Calculate world position of center
        const worldX = (centerX - treeCore.renderer.camera.x) / currentScale;
        const worldY = (centerY - treeCore.renderer.camera.y) / currentScale;
        
        // Update camera to keep center point fixed
        treeCore.renderer.camera.x = centerX - worldX * newScale;
        treeCore.renderer.camera.y = centerY - worldY * newScale;
        treeCore.renderer.camera.scale = newScale;
        
        updateZoomDisplay();
        treeCore.renderer.needsRedraw = true;
      }
    });
  }

  // Initialize zoom display
  updateZoomDisplay();

  // Update zoom display when camera changes (if there's an event system)
  if (treeCore.renderer) {
    // Save original wheel handler and add zoom display update
    const originalWheelHandler = treeCore.renderer.canvas.onwheel;
    treeCore.renderer.canvas.addEventListener('wheel', () => {
      setTimeout(updateZoomDisplay, 10); // Small delay to ensure camera is updated
    });
  }
}

// Top toolbar functionality
function setupTopToolbar(treeCore) {
  const saveBtn = document.getElementById('saveBtn');
  const loadBtn = document.getElementById('loadBtn');
  const exportBtn = document.getElementById('exportBtn');
  const exportMenu = document.getElementById('exportMenu');

  // Save functionality
  if (saveBtn) {
    saveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      saveAsJSON(treeCore);
    });
  }

  // Load functionality
  if (loadBtn) {
    loadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      loadFromJSON(treeCore);
    });
  }

  // Export functionality
  if (exportBtn && exportMenu) {
    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleExportMenu();
    });

    // Close export menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!exportMenu.contains(e.target) && !exportBtn.contains(e.target)) {
        hideExportMenu();
      }
    });

    // Handle export option clicks
    exportMenu.addEventListener('click', (e) => {
      const option = e.target.closest('.export-option');
      if (option) {
        const format = option.dataset.format;
        handleExport(treeCore, format);
        hideExportMenu();
      }
    });
  }

  function saveAsJSON(treeCore) {
    try {
      const treeData = treeCore.getAllData ? treeCore.getAllData() : {
        people: treeCore.people || [],
        connections: treeCore.connections || []
      };

      const dataStr = JSON.stringify(treeData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `family-tree-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Show success notification
      showNotification('Family tree saved successfully', 'success');
    } catch (error) {
      console.error('Error saving family tree:', error);
      showNotification('Error saving family tree', 'error');
    }
  }

  function loadFromJSON(treeCore) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          
          // Validate the data structure
          if (!data.persons && !data.people) {
            showNotification('Invalid File Format: The file does not contain valid family tree data', 'error');
            return;
          }
          
          // Use the proper processLoadedData method
          if (treeCore.processLoadedData) {
            treeCore.processLoadedData(data);
            showNotification(`Family tree loaded successfully (${data.persons?.length || data.people?.length || 0} people)`, 'success');
          } else {
            showNotification('Load functionality not available', 'error');
          }
        } catch (error) {
          console.error('Error loading family tree:', error);
          showNotification('Error loading family tree. Please check file format.', 'error');
        }
      };
      
      reader.readAsText(file);
    });

    input.click();
  }

  function toggleExportMenu() {
    exportMenu.classList.toggle('hidden');
  }

  function hideExportMenu() {
    exportMenu.classList.add('hidden');
  }

  function handleExport(treeCore, format) {
    try {
      switch (format) {
        case 'svg':
          exportAsSVG(treeCore);
          break;
        case 'png':
          exportAsPNG(treeCore);
          break;
        case 'png-transparent':
          exportAsPNGTransparent(treeCore);
          break;
        case 'jpeg':
          exportAsJPEG(treeCore);
          break;
        case 'pdf':
          exportAsPDF(treeCore);
          break;
        case 'gedcom':
          exportAsGEDCOM(treeCore);
          break;
        default:
          console.warn('Unknown export format:', format);
      }
    } catch (error) {
      console.error('Export error:', error);
      showNotification(`Error exporting as ${format.toUpperCase()}`, 'error');
    }
  }

  function exportAsPDF(treeCore) {
    // Call existing PDF export functionality
    if (treeCore.exportCanvasAsPDF) {
      treeCore.exportCanvasAsPDF();
    } else {
      showNotification('PDF export not implemented yet', 'warning');
    }
  }

  function exportAsPNG(treeCore) {
    if (treeCore.exportCanvasAsPNG) {
      treeCore.exportCanvasAsPNG();
      showNotification('Exported as PNG', 'success');
    } else {
      showNotification('PNG export not available', 'error');
    }
  }

  function exportAsPNGTransparent(treeCore) {
    if (treeCore.exportCanvasAsPNGTransparent) {
      treeCore.exportCanvasAsPNGTransparent();
      showNotification('Exported as PNG (transparent)', 'success');
    } else {
      showNotification('PNG transparent export not available', 'error');
    }
  }

  function exportAsJPEG(treeCore) {
    if (treeCore.exportCanvasAsJPEG) {
      treeCore.exportCanvasAsJPEG();
      showNotification('Exported as JPEG', 'success');
    } else {
      showNotification('JPEG export not available', 'error');
    }
  }

  function exportAsSVG(treeCore) {
    // Call existing SVG export functionality
    if (treeCore.exportCanvasAsSVG) {
      treeCore.exportCanvasAsSVG();
    } else {
      showNotification('SVG export not implemented yet', 'warning');
    }
  }

  function exportAsGEDCOM(treeCore) {
    // Call existing GEDCOM export functionality
    import('./exporter.js').then(({ exportGEDCOM }) => {
      exportGEDCOM();
      showNotification('Exported as GEDCOM', 'success');
    }).catch(error => {
      console.error('GEDCOM export error:', error);
      showNotification('GEDCOM export not available', 'error');
    });
  }

  function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 1000;
      font-size: 14px;
      font-weight: 500;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    document.body.appendChild(notification);
    
    // Animate in
    requestAnimationFrame(() => {
      notification.style.opacity = '1';
    });

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
} 