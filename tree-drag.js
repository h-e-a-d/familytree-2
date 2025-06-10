// tree-drag.js
// Pointer-based responsive dragging for circles

export class DragManager {
  constructor(svg, panZoom, connections, selection) {
    this.svg = svg;
    this.panZoom = panZoom;
    this.connections = connections;
    this.selection = selection;

    // Keep per-node drag state here
    this.activeDrags = new Map();
  }

  setupCircleDrag(group, circle, personId) {
    // Per-node state
    const dragState = {
      offsetX: 0,
      offsetY: 0,
      isDragging: false,
      frameRequested: false
    };

    this.activeDrags.set(personId, dragState);

    // Reusable position-update logic (updates circle + texts)
    const updateCirclePosition = (newCx, newCy) => {
      if (isNaN(newCx) || isNaN(newCy)) return;

      circle.setAttribute('cx', newCx);
      circle.setAttribute('cy', newCy);

      // Name lines
      group.querySelectorAll('text.name').forEach((text, i) => {
        text.setAttribute('x', newCx);
        text.setAttribute('y', newCy - 20 + (i * 12));
      });

      // Birth name lines
      group.querySelectorAll('text.birth-name').forEach((text, i) => {
        text.setAttribute('x', newCx);
        text.setAttribute('y', newCy + 5 + (i * 10));
      });

      // Date of birth
      const dob = group.querySelector('text.dob');
      if (dob) {
        dob.setAttribute('x', newCx);
        dob.setAttribute('y', newCy + 25);
      }
    };

    // Pointer down: begin drag
    const handlePointerDown = (e) => {
      // Only left-button for mouse
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();

      // Capture all subsequent pointer events
      circle.setPointerCapture(e.pointerId);
      dragState.isDragging = true;

      // Compute offset between pointer & circle center
      const cx = parseFloat(circle.getAttribute('cx')) || 0;
      const cy = parseFloat(circle.getAttribute('cy')) || 0;
      const svgPt = this.panZoom.screenToSVG(e.clientX, e.clientY);
      dragState.offsetX = svgPt.x - cx;
      dragState.offsetY = svgPt.y - cy;

      // Visual feedback
      circle.style.cursor = 'grabbing';
      circle.style.transform = 'scale(1.1)';
    };

    // Pointer move: update position
    const handlePointerMove = (e) => {
      if (!dragState.isDragging) return;
      e.preventDefault();

      // Map screen → SVG coords, apply offset
      const svgPt = this.panZoom.screenToSVG(e.clientX, e.clientY);
      const newCx = svgPt.x - dragState.offsetX;
      const newCy = svgPt.y - dragState.offsetY;

      // Immediate DOM update
      updateCirclePosition(newCx, newCy);

      // Throttle connection redraw
      if (!dragState.frameRequested) {
        dragState.frameRequested = true;
        requestAnimationFrame(() => {
          this.connections.generateAll();
          dragState.frameRequested = false;
        });
      }
    };

    // Pointer up / leave: end drag
    const handlePointerUp = (e) => {
      if (!dragState.isDragging) return;
      e.preventDefault();

      circle.releasePointerCapture(e.pointerId);
      dragState.isDragging = false;

      // Restore visuals
      circle.style.cursor = 'grab';
      circle.style.transform = '';

      // Final connection redraw & callback
      this.connections.generateAll();
      this.onDragEnd?.(personId);
    };

    // Attach unified pointer events
    circle.addEventListener('pointerdown', handlePointerDown);
    circle.addEventListener('pointermove', handlePointerMove);
    circle.addEventListener('pointerup',   handlePointerUp);
    circle.addEventListener('pointerleave', handlePointerUp);

    // Ensure default cursor
    circle.style.cursor = 'grab';
  }
}
