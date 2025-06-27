// core-export.js
// Export and import manager for family tree

import { exportGEDCOM } from './exporter.js';
import { notifications } from './notifications.js';

export function setupExport(treeCore) {
  // --- Export Buttons ---
  document.getElementById('exportSvg')?.addEventListener('click', () => {
    const loadingId = notifications.loading('Exporting...', 'Generating SVG file');
    try {
      setTimeout(() => {
        treeCore.exportCanvasAsSVG();
        notifications.remove(loadingId);
        notifications.success('Export Complete', 'SVG file has been downloaded');
      }, 100);
    } catch (error) {
      notifications.remove(loadingId);
      notifications.error('Export Failed', 'Error generating SVG file');
      console.error('SVG export error:', error);
    }
  });

  document.getElementById('exportPng')?.addEventListener('click', () => {
    const loadingId = notifications.loading('Exporting...', 'Generating PNG file');
    try {
      setTimeout(() => {
        treeCore.exportCanvasAsPNG();
        notifications.remove(loadingId);
        notifications.success('Export Complete', 'PNG file has been downloaded');
      }, 100);
    } catch (error) {
      notifications.remove(loadingId);
      notifications.error('Export Failed', 'Error generating PNG file');
      console.error('PNG export error:', error);
    }
  });

  document.getElementById('exportPngTransparent')?.addEventListener('click', () => {
    const loadingId = notifications.loading('Exporting...', 'Generating PNG file without background');
    try {
      setTimeout(() => {
        treeCore.exportCanvasAsPNGTransparent();
        notifications.remove(loadingId);
        notifications.success('Export Complete', 'Transparent PNG file has been downloaded');
      }, 100);
    } catch (error) {
      notifications.remove(loadingId);
      notifications.error('Export Failed', 'Error generating transparent PNG file');
      console.error('PNG transparent export error:', error);
    }
  });

  document.getElementById('exportJpeg')?.addEventListener('click', () => {
    const loadingId = notifications.loading('Exporting...', 'Generating JPEG file');
    try {
      setTimeout(() => {
        treeCore.exportCanvasAsJPEG();
        notifications.remove(loadingId);
        notifications.success('Export Complete', 'JPEG file has been downloaded');
      }, 100);
    } catch (error) {
      notifications.remove(loadingId);
      notifications.error('Export Failed', 'Error generating JPEG file');
      console.error('JPEG export error:', error);
    }
  });

  document.getElementById('exportPdf')?.addEventListener('click', () => {
    const loadingId = notifications.loading('Exporting...', 'Generating PDF file');
    try {
      setTimeout(() => {
        treeCore.exportCanvasAsPDF();
        notifications.remove(loadingId);
      }, 100);
    } catch (error) {
      notifications.remove(loadingId);
      notifications.error('Export Failed', 'Error generating PDF file');
      console.error('PDF export error:', error);
    }
  });

  document.getElementById('saveData')?.addEventListener('click', () => {
    const loadingId = notifications.loading('Saving...', 'Generating JSON file');
    try {
      setTimeout(() => {
        treeCore.saveToJSON();
        notifications.remove(loadingId);
        notifications.success('Save Complete', 'Family tree saved to JSON file');
      }, 100);
    } catch (error) {
      notifications.remove(loadingId);
      notifications.error('Save Failed', 'Error saving family tree');
      console.error('Save error:', error);
    }
  });

  document.getElementById('loadData')?.addEventListener('change', (e) => {
    const loadingId = notifications.loading('Loading...', 'Processing JSON file');
    try {
      setTimeout(() => {
        treeCore.loadFromJSON(e);
        notifications.remove(loadingId);
      }, 100);
    } catch (error) {
      notifications.remove(loadingId);
      notifications.error('Load Failed', 'Error loading family tree');
      console.error('Load error:', error);
    }
  });

  // --- Advanced Export ---
  document.getElementById('exportGedcom')?.addEventListener('click', () => {
    exportGEDCOM().catch(error => {
      console.error('GEDCOM export error:', error);
      notifications.error('GEDCOM Export Failed', 'Error exporting GEDCOM file');
    });
  });


  // --- Export Helpers ---
  treeCore.exportCanvasAsPDF = async function() {
    try {
      const { exportCanvasPDF } = await import('./exporter.js');
      await exportCanvasPDF();
    } catch (error) {
      console.error('Error exporting PDF:', error);
      notifications.error('Export Failed', 'Could not export PDF: ' + error.message);
    }
  };

  treeCore.exportCanvasAsPNGTransparent = function() {
    try {
      if (this.renderer && this.renderer.exportAsPNGTransparent) {
        const canvas = this.renderer.exportAsPNGTransparent();
        canvas.toBlob((blob) => {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = 'family-tree-transparent.png';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
        });
      } else {
        // Fallback to regular exportTree function
        import('./exporter.js').then(({ exportTree }) => {
          exportTree('png-transparent');
        });
      }
    } catch (error) {
      console.error('Error exporting transparent PNG:', error);
      notifications.error('Export Failed', 'Could not export transparent PNG: ' + error.message);
    }
  };

  treeCore.exportCanvasAsJPEG = function() {
    try {
      if (this.renderer && this.renderer.exportAsJPEG) {
        const canvas = this.renderer.exportAsJPEG();
        canvas.toBlob((blob) => {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = 'family-tree.jpg';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
        }, 'image/jpeg', 0.95);
      } else {
        // Fallback to regular exportTree function
        import('./exporter.js').then(({ exportTree }) => {
          exportTree('jpeg');
        });
      }
    } catch (error) {
      console.error('Error exporting JPEG:', error);
      notifications.error('Export Failed', 'Could not export JPEG: ' + error.message);
    }
  };

  treeCore.saveToJSON = function() {
    const data = this.getCurrentState();
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `family_tree_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  treeCore.loadFromJSON = function(event) {
    const file = event.target.files[0];
    if (!file) {
      notifications.error('No File Selected', 'Please select a JSON file to load');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        console.log('Loaded JSON data:', data);
        
        // Validate the data structure
        if (!data.persons && !data.people) {
          notifications.error('Invalid File Format', 'The file does not contain valid family tree data');
          return;
        }
        
        // Process the loaded data
        this.processLoadedData(data);
        notifications.success('Load Complete', `Successfully loaded ${data.persons?.length || data.people?.length || 0} people`);
        
        // Clear the file input
        event.target.value = '';
        
      } catch (error) {
        console.error('Error parsing JSON:', error);
        notifications.error('Parse Error', 'The file could not be parsed as valid JSON');
      }
    };
    
    reader.onerror = () => {
      notifications.error('File Read Error', 'Could not read the selected file');
    };
    
    reader.readAsText(file);
  };
} 