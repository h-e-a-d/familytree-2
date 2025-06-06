export function exportTree(format) {
  const original = document.getElementById('svgArea');
  const clone = original.cloneNode(true);
  // Remove grid lines and background
  clone.querySelectorAll('.grid-line').forEach((el) => el.remove());
  // Inline CSS from style.css: node, text, and line styles are already applied
  const svgData = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  if (format === 'svg') {
    downloadBlob(svgBlob, 'family-tree.svg');
  } else {
    const img = new Image();
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      const ctx = canvas.getContext('2d');
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      if (format === 'png') {
        canvas.toBlob((blob) => downloadBlob(blob, 'family-tree.png'));   
      } else if (format === 'pdf') {
        import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js').then((module) => {
          const { jsPDF } = module.jspdf;
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [canvas.width / 2, canvas.height / 2] });
          pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
          pdf.save('family-tree.pdf');
        });
      }
    };
    img.src = url;
  }
}

function downloadBlob(blob, filename) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* =================================================================
   Additional Helper: Update searchable selects after tree changes
   ================================================================= */
export function updateSearchableSelects() {
  document.querySelectorAll('.searchable-select').forEach((container) => {
    const instance = container.__searchableInstance;
    if (instance) instance.populateOptions();
  });
}
