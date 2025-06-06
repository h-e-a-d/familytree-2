export function exportTree(format) {
  const original = document.getElementById('svgArea');
  if (!original) {
    console.error('SVG area not found');
    return;
  }
  
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
    clone.setAttribute('viewBox', `${bbox.x - 50} ${bbox.y - 50} ${bbox.width + 100} ${bbox.height + 100}`);
    clone.setAttribute('width', bbox.width + 100);
    clone.setAttribute('height', bbox.height + 100);
  }
  
  const svgData = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  
  if (format === 'svg') {
    downloadBlob(svgBlob, 'family-tree.svg');
  } else {
    const img = new Image();
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 2; // Higher resolution
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      
      if (format === 'png') {
        canvas.toBlob((blob) => downloadBlob(blob, 'family-tree.png'));   
      } else if (format === 'pdf') {
        import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js').then((module) => {
          const { jsPDF } = module.jspdf;
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
        }).catch(err => {
          console.error('Error loading jsPDF:', err);
          alert('Error loading PDF library. Please try again.');
        });
      }
    };
    
    img.onerror = () => {
      console.error('Error loading image for export');
      alert('Error creating image for export');
      URL.revokeObjectURL(url);
    };
    
    img.src = url;
  }
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
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}