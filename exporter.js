// exporter.js - Enhanced with notification support, GEDCOM, and PDF layout export
// FIXED: PDF export issues resolved

import { notifications } from './notifications.js';

export function exportTree(format) {
  const original = document.getElementById('svgArea');
  if (!original) {
    console.error('SVG area not found');
    notifications.error('Export Failed', 'SVG area not found');
    return;
  }
  
  // Show loading notification
  const loadingId = notifications.loading('Exporting...', `Generating ${format.toUpperCase()} file`);
  
  try {
    // Small delay to show the loading notification
    setTimeout(() => {
      try {
        const clone = original.cloneNode(true);
        
        // Remove grid lines and background if they exist
        clone.querySelectorAll('.grid-line').forEach((el) => el.remove());
        
        // Ensure the clone has proper styling
        const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
        style.textContent = `
          .person-group circle { 
            stroke: #2c3e50; 
            stroke-width: 2px; 
          }
          .person-group text.name { 
            font-weight: 600; 
            font-family: 'Inter', sans-serif;
          }
          .person-group text.dob { 
            font-size: 12px; 
            fill: #757575; 
            font-family: 'Inter', sans-serif;
          }
          .relation { 
            stroke: #7f8c8d; 
            stroke-width: 2px; 
          }
          .relation.spouse { 
            stroke-dasharray: 4 2; 
          }
        `;
        clone.insertBefore(style, clone.firstChild);
        
        // Get the bounding box of all content
        const bbox = getContentBounds(clone);
        if (bbox) {
          // Use 10px padding as requested
          const padding = 10;
          clone.setAttribute('viewBox', `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${bbox.height + padding * 2}`);
          clone.setAttribute('width', bbox.width + padding * 2);
          clone.setAttribute('height', bbox.height + padding * 2);
        }
        
        const svgData = new XMLSerializer().serializeToString(clone);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        
        if (format === 'svg') {
          downloadBlob(svgBlob, 'family-tree.svg');
          notifications.remove(loadingId);
          notifications.success('Export Complete', 'SVG file has been downloaded successfully');
        } else {
          const img = new Image();
          const url = URL.createObjectURL(svgBlob);
          
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              const scale = 2; // Higher resolution
              canvas.width = img.width * scale;
              canvas.height = img.height * scale;
              const ctx = canvas.getContext('2d');
              ctx.scale(scale, scale);
              
              // Only fill background for formats that need it
              if (format !== 'png-transparent') {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
              }
              
              ctx.drawImage(img, 0, 0);
              URL.revokeObjectURL(url);
              
              if (format === 'png') {
                canvas.toBlob((blob) => {
                  downloadBlob(blob, 'family-tree.png');
                  notifications.remove(loadingId);
                  notifications.success('Export Complete', 'PNG file has been downloaded successfully');
                });   
              } else if (format === 'png-transparent') {
                canvas.toBlob((blob) => {
                  downloadBlob(blob, 'family-tree-transparent.png');
                  notifications.remove(loadingId);
                  notifications.success('Export Complete', 'PNG file (transparent background) has been downloaded successfully');
                });   
              } else if (format === 'jpeg') {
                // JPEG always needs background since it doesn't support transparency
                if (!ctx.fillStyle || ctx.fillStyle === 'rgba(0, 0, 0, 0)') {
                  ctx.fillStyle = '#ffffff';
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                  ctx.drawImage(img, 0, 0);
                }
                canvas.toBlob((blob) => {
                  downloadBlob(blob, 'family-tree.jpg');
                  notifications.remove(loadingId);
                  notifications.success('Export Complete', 'JPEG file has been downloaded successfully');
                }, 'image/jpeg', 0.95);   
              } else if (format === 'pdf') {
                // FIXED: Improved PDF export with proper jsPDF loading
                loadJsPDF().then((jsPDF) => {
                  try {
                    const imgData = canvas.toDataURL('image/png');
                    const imgWidth = canvas.width / scale;
                    const imgHeight = canvas.height / scale;
                    
                    // Choose orientation based on aspect ratio
                    const orientation = imgWidth > imgHeight ? 'landscape' : 'portrait';
                    const pdf = new jsPDF({ 
                      orientation: orientation, 
                      unit: 'pt', 
                      format: [imgWidth, imgHeight] 
                    });
                    
                    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
                    pdf.save('family-tree.pdf');
                    
                    notifications.remove(loadingId);
                    notifications.success('Export Complete', 'PDF file has been downloaded successfully');
                  } catch (pdfError) {
                    console.error('Error creating PDF:', pdfError);
                    notifications.remove(loadingId);
                    notifications.error('PDF Export Failed', 'Error creating PDF file');
                  }
                }).catch(err => {
                  console.error('Error loading jsPDF:', err);
                  notifications.remove(loadingId);
                  notifications.error('PDF Export Failed', 'Could not load PDF library');
                });
              }
            } catch (canvasError) {
              console.error('Error processing canvas:', canvasError);
              notifications.remove(loadingId);
              notifications.error('Export Failed', 'Error processing image data');
            }
          };
          
          img.onerror = () => {
            console.error('Error loading image for export');
            notifications.remove(loadingId);
            notifications.error('Export Failed', 'Error loading image for export');
            URL.revokeObjectURL(url);
          };
          
          img.src = url;
        }
      } catch (processError) {
        console.error('Error during export process:', processError);
        notifications.remove(loadingId);
        notifications.error('Export Failed', 'An error occurred during the export process');
      }
    }, 200); // Small delay to show loading notification
    
  } catch (error) {
    console.error('Export error:', error);
    notifications.remove(loadingId);
    notifications.error('Export Failed', 'Failed to export family tree');
  }
}

// FIXED: Improved jsPDF loading function
async function loadJsPDF() {
  try {
    // First check if jsPDF is already available
    const existingJsPDF = findJsPDFGlobal();
    if (existingJsPDF) {
      console.log('jsPDF already available');
      return existingJsPDF;
    }
    
    // Try different CDN URLs and versions
    const cdnUrls = [
      'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
      'https://unpkg.com/jspdf@latest/dist/jspdf.umd.min.js',
      'https://cdn.jsdelivr.net/npm/jspdf@latest/dist/jspdf.umd.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/jspdf/1.5.3/jspdf.min.js', // Older version fallback
      'https://unpkg.com/jspdf@1.5.3/dist/jspdf.min.js'
    ];
    
    for (const url of cdnUrls) {
      try {
        console.log('Attempting to load jsPDF from:', url);
        
        // First try dynamic import
        try {
          const module = await import(url);
          const jsPDF = module.jsPDF || module.default?.jsPDF || module.default;
          if (jsPDF && typeof jsPDF === 'function') {
            console.log('jsPDF loaded via dynamic import');
            return jsPDF;
          }
        } catch (importError) {
          console.log('Dynamic import failed, trying script loading');
        }
        
        // Fallback to script loading
        const jsPDF = await loadJsPDFViaScript(url);
        if (jsPDF) {
          console.log('jsPDF loaded via script tag');
          return jsPDF;
        }
        
      } catch (error) {
        console.log(`Failed to load from ${url}:`, error.message);
        continue;
      }
    }
    
    // Last resort: try a different approach with a more reliable version
    console.log('Trying fallback method with reliable version...');
    try {
      return await loadJsPDFSimple();
    } catch (fallbackError) {
      console.error('Fallback method also failed:', fallbackError);
    }
    
    throw new Error('All jsPDF loading methods failed. Please check your internet connection.');
    
  } catch (error) {
    console.error('Error loading jsPDF:', error);
    throw error;
  }
}

// Load jsPDF via script tag
function loadJsPDFViaScript(url) {
  return new Promise((resolve, reject) => {
    // Check if jsPDF is already available globally in various forms
    const existingJsPDF = findJsPDFGlobal();
    if (existingJsPDF) {
      resolve(existingJsPDF);
      return;
    }
    
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => {
      // Give the script a moment to initialize
      setTimeout(() => {
        const jsPDF = findJsPDFGlobal();
        if (jsPDF) {
          console.log('jsPDF found after script load');
          resolve(jsPDF);
        } else {
          console.log('Available globals after script load:', Object.keys(window).filter(k => k.toLowerCase().includes('pdf')));
          reject(new Error('jsPDF not found after script load'));
        }
      }, 100);
    };
    script.onerror = () => {
      reject(new Error('Failed to load jsPDF script'));
    };
    document.head.appendChild(script);
  });
}

// Helper function to find jsPDF in various global locations
function findJsPDFGlobal() {
  // Check common global variable names for jsPDF
  const possiblePaths = [
    'jsPDF',           // Most common
    'jspdf.jsPDF',     // Namespaced version
    'jsPDF.jsPDF',     // Double namespaced
    'window.jsPDF',    // Explicit window
    'jspdf',           // Lowercase version
    'jsPdf',           // Alternative casing
    'JSPDF'            // All caps version
  ];
  
  for (const path of possiblePaths) {
    try {
      const parts = path.split('.');
      let obj = window;
      
      for (const part of parts) {
        if (part === 'window') continue;
        obj = obj[part];
        if (!obj) break;
      }
      
      if (obj && typeof obj === 'function') {
        console.log(`Found jsPDF at: ${path}`);
        return obj;
      }
    } catch (e) {
      continue;
    }
  }
  
  // Also try to check if it's available as a constructor
  try {
    if (window.jsPDF && window.jsPDF.API) {
      console.log('Found jsPDF with API property');
      return window.jsPDF;
    }
  } catch (e) {
    // Ignore
  }
  
  return null;
}

// Simple fallback jsPDF loader using a known working version
function loadJsPDFSimple() {
  return new Promise((resolve, reject) => {
    // Use a known stable version
    const scriptUrl = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/1.5.3/jspdf.min.js';
    
    // Remove any existing script first
    const existingScript = document.querySelector(`script[src*="jspdf"]`);
    if (existingScript) {
      existingScript.remove();
    }
    
    const script = document.createElement('script');
    script.src = scriptUrl;
    
    script.onload = () => {
      // Wait a bit longer for older version
      setTimeout(() => {
        // This older version typically exposes as window.jsPDF directly
        if (window.jsPDF && typeof window.jsPDF === 'function') {
          console.log('✅ Fallback jsPDF (v1.5.3) loaded successfully');
          resolve(window.jsPDF);
        } else {
          console.log('❌ Fallback jsPDF not found');
          console.log('Available window properties:', Object.keys(window).filter(k => k.includes('PDF')));
          reject(new Error('Fallback jsPDF loading failed'));
        }
      }, 200);
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load fallback jsPDF script'));
    };
    
    console.log('Loading fallback jsPDF from:', scriptUrl);
    document.head.appendChild(script);
  });
}

// Debug function to test jsPDF loading
window.testJsPDFLoading = async function() {
  console.log('Testing jsPDF loading...');
  try {
    const jsPDF = await loadJsPDF();
    console.log('✅ jsPDF loaded successfully:', typeof jsPDF);
    
    // Test creating a simple PDF
    const doc = new jsPDF();
    doc.text('Test PDF', 10, 10);
    console.log('✅ jsPDF test creation successful');
    
    return true;
  } catch (error) {
    console.error('❌ jsPDF loading failed:', error);
    return false;
  }
};

// Enhanced canvas-based PDF export
export async function exportCanvasPDF() {
  const loadingId = notifications.loading('Exporting PDF...', 'Generating PDF from canvas');
  
  try {
    // Use global tree core instead of importing
    const treeCore = window.treeCore;
    
    if (!treeCore.renderer) {
      notifications.remove(loadingId);
      notifications.warning('No Data', 'No family tree canvas available to export');
      return;
    }
    
    // Get canvas image
    const exportCanvas = treeCore.renderer.exportAsImage('png');
    const imgData = exportCanvas.toDataURL('image/png');
    
    // Load jsPDF
    const jsPDF = await loadJsPDF();
    
    // Calculate PDF dimensions
    const imgWidth = exportCanvas.width;
    const imgHeight = exportCanvas.height;
    const aspectRatio = imgWidth / imgHeight;
    
    // Choose orientation and size based on aspect ratio
    let pdfWidth, pdfHeight, orientation;
    if (aspectRatio > 1.4) {
      // Wide image - use landscape A4
      orientation = 'landscape';
      pdfWidth = 842; // A4 landscape width in points
      pdfHeight = 595; // A4 landscape height in points
    } else {
      // Tall or square image - use portrait A4
      orientation = 'portrait';
      pdfWidth = 595; // A4 portrait width in points
      pdfHeight = 842; // A4 portrait height in points
    }
    
    // Calculate scaling to fit image in PDF
    const scaleX = pdfWidth / imgWidth;
    const scaleY = pdfHeight / imgHeight;
    const scale = Math.min(scaleX, scaleY) * 0.9; // 90% to leave some margin
    
    const finalWidth = imgWidth * scale;
    const finalHeight = imgHeight * scale;
    
    // Center the image
    const offsetX = (pdfWidth - finalWidth) / 2;
    const offsetY = (pdfHeight - finalHeight) / 2;
    
    // Create PDF
    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'pt',
      format: 'a4'
    });
    
    // Add title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Family Tree', pdfWidth / 2, 30, { align: 'center' });
    
    // Add generation date
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const dateStr = new Date().toLocaleDateString();
    pdf.text(`Generated on: ${dateStr}`, pdfWidth / 2, 50, { align: 'center' });
    
    // Add image with some top margin for title
    const imageY = Math.max(offsetY, 70);
    pdf.addImage(imgData, 'PNG', offsetX, imageY, finalWidth, finalHeight);
    
    // Save PDF
    pdf.save(`family-tree-${new Date().toISOString().split('T')[0]}.pdf`);
    
    notifications.remove(loadingId);
    notifications.success('PDF Export Complete', 'PDF file has been downloaded successfully');
    
  } catch (error) {
    console.error('Canvas PDF export error:', error);
    notifications.remove(loadingId);
    notifications.error('PDF Export Failed', 'Error generating PDF from canvas');
  }
}

// Advanced GEDCOM Export
export async function exportGEDCOM() {
  const loadingId = notifications.loading('Exporting GEDCOM...', 'Generating genealogy file');
  
  try {
    // Use global tree core instead of importing
    const treeCore = window.treeCore;
    
    if (!treeCore.renderer || !treeCore.renderer.nodes || treeCore.renderer.nodes.size === 0) {
      notifications.remove(loadingId);
      notifications.warning('No Data', 'No family tree data available to export');
      return;
    }
    
    const gedcomData = generateGEDCOM(treeCore);
    const blob = new Blob([gedcomData], { type: 'text/plain;charset=utf-8' });
    
    downloadBlob(blob, `family-tree-${new Date().toISOString().split('T')[0]}.ged`);
    
    notifications.remove(loadingId);
    notifications.success('GEDCOM Export Complete', 'Genealogy file has been downloaded successfully');
    
  } catch (error) {
    console.error('GEDCOM export error:', error);
    notifications.remove(loadingId);
    notifications.error('GEDCOM Export Failed', 'Error generating GEDCOM file');
  }
}


// Generate GEDCOM format
function generateGEDCOM(treeCore) {
  const lines = [];
  const currentDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
  
  // Header
  lines.push('0 HEAD');
  lines.push('1 SOUR MapMyRoots');
  lines.push('2 VERS 2.5');
  lines.push('2 NAME MapMyRoots Family Tree Builder');
  lines.push('1 DEST GENERIC');
  lines.push('1 DATE ' + currentDate);
  lines.push('1 CHAR UTF-8');
  lines.push('1 GEDC');
  lines.push('2 VERS 5.5.1');
  lines.push('2 FORM LINEAGE-LINKED');
  
  // Collect all individuals
  const individuals = [];
  const families = new Map();
  let indiCounter = 1;
  let famCounter = 1;
  
  // Process individuals
  for (const [id, node] of treeCore.renderer.nodes) {
    const personData = treeCore.getPersonData(id) || {};
    const indiId = `I${indiCounter++}`;
    
    const individual = {
      originalId: id,
      gedcomId: indiId,
      node,
      personData
    };
    
    individuals.push(individual);
    
    // Generate individual record
    lines.push(`0 ${indiId} INDI`);
    
    // Name
    const givenName = node.name || personData.name || '';
    const surname = node.surname || personData.surname || '';
    const fullName = `${givenName} /${surname}/`.trim();
    lines.push(`1 NAME ${fullName}`);
    
    if (givenName) {
      lines.push(`2 GIVN ${givenName}`);
    }
    if (surname) {
      lines.push(`2 SURN ${surname}`);
    }
    
    // Maiden name for females
    if ((node.gender || personData.gender) === 'female' && (node.maidenName || personData.maidenName)) {
      const maidenName = node.maidenName || personData.maidenName;
      lines.push(`1 NAME ${givenName} /${maidenName}/`);
      lines.push(`2 GIVN ${givenName}`);
      lines.push(`2 SURN ${maidenName}`);
      lines.push(`2 TYPE maiden`);
    }
    
    // Gender
    const gender = (node.gender || personData.gender || '').toUpperCase();
    if (gender === 'MALE' || gender === 'FEMALE') {
      lines.push(`1 SEX ${gender.charAt(0)}`);
    }
    
    // Birth
    const dob = node.dob || personData.dob;
    if (dob) {
      lines.push('1 BIRT');
      lines.push(`2 DATE ${formatGEDCOMDate(dob)}`);
    }
    
    // Father's name as note if available
    const fatherName = node.fatherName || personData.fatherName;
    if (fatherName) {
      lines.push('1 NOTE');
      lines.push(`2 CONT Father\'s name: ${fatherName}`);
    }
  }
  
  // Process families
  const processedFamilies = new Set();
  
  for (const individual of individuals) {
    const personData = individual.personData;
    
    // Create family for spouse relationship
    if (personData.spouseId && !processedFamilies.has(`${individual.originalId}-${personData.spouseId}`)) {
      const spouse = individuals.find(ind => ind.originalId === personData.spouseId);
      if (spouse) {
        const famId = `F${famCounter++}`;
        
        lines.push(`0 ${famId} FAM`);
        
        // Determine husband and wife based on gender
        const person1Gender = (individual.node.gender || individual.personData.gender || '').toLowerCase();
        const person2Gender = (spouse.node.gender || spouse.personData.gender || '').toLowerCase();
        
        if (person1Gender === 'male') {
          lines.push(`1 HUSB ${individual.gedcomId}`);
          lines.push(`1 WIFE ${spouse.gedcomId}`);
        } else if (person1Gender === 'female') {
          lines.push(`1 WIFE ${individual.gedcomId}`);
          lines.push(`1 HUSB ${spouse.gedcomId}`);
        } else {
          // Gender unknown, just use spouse relationship
          lines.push(`1 HUSB ${individual.gedcomId}`);
          lines.push(`1 WIFE ${spouse.gedcomId}`);
        }
        
        // Find children
        const children = individuals.filter(ind => 
          ind.personData.motherId === individual.originalId || 
          ind.personData.fatherId === individual.originalId ||
          ind.personData.motherId === spouse.originalId || 
          ind.personData.fatherId === spouse.originalId
        );
        
        children.forEach(child => {
          lines.push(`1 CHIL ${child.gedcomId}`);
        });
        
        // Mark this family as processed
        processedFamilies.add(`${individual.originalId}-${personData.spouseId}`);
        processedFamilies.add(`${personData.spouseId}-${individual.originalId}`);
      }
    }
    
    // Create family for parent-child relationships
    if (personData.motherId || personData.fatherId) {
      const mother = individuals.find(ind => ind.originalId === personData.motherId);
      const father = individuals.find(ind => ind.originalId === personData.fatherId);
      
      if (mother || father) {
        const familyKey = `${personData.fatherId || 'unknown'}-${personData.motherId || 'unknown'}`;
        if (!processedFamilies.has(familyKey)) {
          const famId = `F${famCounter++}`;
          
          lines.push(`0 ${famId} FAM`);
          
          if (father) {
            lines.push(`1 HUSB ${father.gedcomId}`);
          }
          if (mother) {
            lines.push(`1 WIFE ${mother.gedcomId}`);
          }
          
          lines.push(`1 CHIL ${individual.gedcomId}`);
          
          // Find other children with same parents
          const siblings = individuals.filter(ind => 
            ind.originalId !== individual.originalId &&
            ind.personData.motherId === personData.motherId &&
            ind.personData.fatherId === personData.fatherId
          );
          
          siblings.forEach(sibling => {
            lines.push(`1 CHIL ${sibling.gedcomId}`);
          });
          
          processedFamilies.add(familyKey);
        }
      }
    }
  }
  
  // Trailer
  lines.push('0 TRLR');
  
  return lines.join('\n');
}

// Format date for GEDCOM
function formatGEDCOMDate(dateStr) {
  if (!dateStr) return '';
  
  // Handle year only (e.g., "1985")
  if (/^\d{4}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Handle dd.mm.yyyy format
  const ddmmyyyy = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    const monthNames = [
      'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
      'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
    ];
    const monthName = monthNames[parseInt(month) - 1];
    return `${parseInt(day)} ${monthName} ${year}`;
  }
  
  // Return as-is for other formats
  return dateStr;
}


function getContentBounds(svgElement) {
  const elements = svgElement.querySelectorAll('circle, text, line');
  if (elements.length === 0) return null;
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  elements.forEach(el => {
    let bounds;
    if (el.tagName === 'circle') {
      const cx = parseFloat(el.getAttribute('cx'));
      const cy = parseFloat(el.getAttribute('cy'));
      const r = parseFloat(el.getAttribute('r'));
      bounds = {
        x: cx - r,
        y: cy - r,
        width: r * 2,
        height: r * 2
      };
    } else if (el.tagName === 'text') {
      const x = parseFloat(el.getAttribute('x'));
      const y = parseFloat(el.getAttribute('y'));
      const fontSize = parseFloat(getComputedStyle(el).fontSize) || 14;
      const textLength = el.textContent.length * fontSize * 0.6; // Approximate
      bounds = {
        x: x - textLength / 2,
        y: y - fontSize,
        width: textLength,
        height: fontSize
      };
    } else if (el.tagName === 'line') {
      const x1 = parseFloat(el.getAttribute('x1'));
      const y1 = parseFloat(el.getAttribute('y1'));
      const x2 = parseFloat(el.getAttribute('x2'));
      const y2 = parseFloat(el.getAttribute('y2'));
      bounds = {
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width: Math.abs(x2 - x1),
        height: Math.abs(y2 - y1)
      };
    }
    
    if (bounds) {
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    }
  });
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

function downloadBlob(blob, filename) {
  try {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch (error) {
    console.error('Error downloading file:', error);
    notifications.error('Download Failed', 'Could not download the file');
  }
}

// Export success notification helper
export function showExportSuccess(format) {
  notifications.success('Export Complete', `${format.toUpperCase()} file has been downloaded successfully`);
}

// Export error notification helper
export function showExportError(format, message) {
  notifications.error('Export Failed', `Failed to export ${format.toUpperCase()}: ${message}`);
}

// Make test function available globally for debugging
if (typeof window !== 'undefined') {
  window.testJsPDFLoading = async function() {
    console.log('🔍 Testing jsPDF loading...');
    try {
      const jsPDF = await loadJsPDF();
      console.log('✅ jsPDF loaded successfully:', typeof jsPDF);
      
      // Test creating a simple PDF
      const doc = new jsPDF();
      doc.text('Test PDF', 10, 10);
      console.log('✅ jsPDF test creation successful');
      
      notifications.success('jsPDF Test', 'PDF library loaded and tested successfully!');
      return true;
    } catch (error) {
      console.error('❌ jsPDF loading failed:', error);
      notifications.error('jsPDF Test Failed', error.message);
      return false;
    }
  };
  
  console.log('🛠️ PDF Debug: Type testJsPDFLoading() in console to test PDF library loading');
}
