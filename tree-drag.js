// tree-drag.js
// Pointer-based responsive dragging for circles

export class DragManager {
  constructor(svg, panZoom, connections, selection) {
    this.svg = svg;
    this.panZoom = panZoom;
    this.connections = connections;
    this.selection = selection;
    // Store per-person drag state & handlers
    this.activeDrags = new Map();
  }

  setupCircleDrag(group, circle, personId) {
    // Initialize state & store handlers for cleanup if needed
    const dragState = {
      offsetX: 0,
      offsetY: 0,
      isDragging: false,
      frameRequested: false,
      handlers: {}
    };
    this.activeDrags.set(personId, dragState);

    // Helper: update circle + all its text labels
    const updateCirclePosition = (newCx, newCy) => {
      if (isNaN(newCx) || isNaN(newCy)) return;
      circle.setAttribute('cx', newCx);
      circle.setAttribute('cy', newCy);

      // Name lines
      group.querySelectorAll('text.name').forEach((text, i) => {
        text.setAttribute('x', newCx);
        text.setAttribute('y', newCy - 20 + (i * 12));
      });
      // Birth-name lines
      group.querySelectorAll('text.birth-name').forEach((text, i) => {
        text.setAttribute('x', newCx);
        text.setAttribute('y', newCy + 5 + (i * 10));
      });
      // DOB line
      const dob = group.querySelector('text.dob');
      if (dob) {
        dob.setAttribute('x', newCx);
        dob.setAttribute('y', newCy + 25);
      }
    };

    // ----- event handlers -----
    const onDown = (e) => {
      // Only left button for mouse
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      circle.setPointerCapture(e.pointerId);
      dragState.isDragging = true;

      // compute offset from pointer to circle center
      const cx = parseFloat(circle.getAttribute('cx')) || 0;
      const cy = parseFloat(circle.getAttribute('cy')) || 0;
      const svgPt = this.panZoom.screenToSVG(e.clientX, e.clientY);
      dragState.offsetX = svgPt.x - cx;
      dragState.offsetY = svgPt.y - cy;

      // visual feedback
      circle.style.cursor = 'grabbing';
      circle.style.transform = 'scale(1.1)';
    };

    const onMove = (e) => {
      if (!dragState.isDragging) return;
      e.preventDefault();
      const svgPt = this.panZoom.screenToSVG(e.clientX, e.clientY);
      const newCx = svgPt.x - dragState.offsetX;
      const newCy = svgPt.y - dragState.offsetY;

      // move immediately
      updateCirclePosition(newCx, newCy);

      // schedule connections redraw
      if (!dragState.frameRequested) {
        dragState.frameRequested = true;
        requestAnimationFrame(() => {
          this.connections.generateAll();
          dragState.frameRequested = false;
        });
      }
    };

    const onUp = (e) => {
      if (!dragState.isDragging) return;
      e.preventDefault();
      circle.releasePointerCapture(e.pointerId);
      dragState.isDragging = false;

      // restore styles
      circle.style.cursor = 'grab';
      circle.style.transform = '';

      // final redraw & callback
      this.connections.generateAll();
      this.onDragEnd?.(personId);
    };

    // attach & record
    circle.addEventListener('pointerdown', onDown);
    circle.addEventListener('pointermove', onMove);
    circle.addEventListener('pointerup', onUp);
    circle.addEventListener('pointerleave', onUp);
    circle.style.cursor = 'grab';

    dragState.handlers = { onDown, onMove, onUp };
  }

  /** 
   * Returns true if *any* circle is currently being dragged.
   * This lets your tree-interactions.js `if (this.drag.isDragInProgress())`
   * check work again. 
   */
  isDragInProgress() {
    return Array.from(this.activeDrags.values())
      .some(state => state.isDragging);
  }

  /**
   * Remove all event listeners for a given person (called by your
   * tree-interactions.js removeCircleInteractions)
   */
  removeDrag(personId) {
    const dragState = this.activeDrags.get(personId);
    if (!dragState) return;
    const circle = this.svg.querySelector(`circle[data-person-id="${personId}"]`);
    if (circle) {
      const { onDown, onMove, onUp } = dragState.handlers;
      circle.removeEventListener('pointerdown', onDown);
      circle.removeEventListener('pointermove', onMove);
      circle.removeEventListener('pointerup',   onUp);
      circle.removeEventListener('pointerleave', onUp);
    }
    this.activeDrags.delete(personId);
  }

  /**
   * Cleanup all drags (e.g. when you rebuild the tree)
   */
  cleanup() {
    for (const personId of this.activeDrags.keys()) {
      this.removeDrag(personId);
    }
  }

  // Drag-end hook you can assign to if you like
  onDragEnd = null;
}
