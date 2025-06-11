// tree-drag.js
// Simplified drag implementation - direct SVG updates with RAF throttling

export class DragManager {
  constructor(svg, panZoom, connections, selection) {
    this.svg = svg;
    this.panZoom = panZoom;
    this.connections = connections;
    this.selection = selection;
    
    // Drag state
    this.isDragging = false;
    this.dragThreshold = 3;
    
    // Active drags
    this.activeDrags = new Map();
  }

  setupCircleDrag(group, circle, personId) {
    const dragState = {
      isDragging: false,
      isCircleTouching: false,
      dragStarted: false,
      rafId: null
    };

    this.activeDrags.set(personId, dragState);

    // Direct position update with RAF throttling
    const updatePosition = (clientX, clientY) => {
      if (dragState.rafId) {
        cancelAnimationFrame(dragState.rafId);
      }
      
      dragState.rafId = requestAnimationFrame(() => {
        const svgCoords = this.panZoom.screenToSVG(clientX, clientY);
        const newCx = svgCoords.x;
        const newCy = svgCoords.y;
        
        if (!isNaN(newCx) && !isNaN(newCy)) {
          // Update circle
          circle.setAttribute('cx', newCx);
          circle.setAttribute('cy', newCy);
          
          // Update all texts
          group.querySelectorAll('text.name').forEach((text, index) => {
            text.setAttribute('x', newCx);
            text.setAttribute('y', newCy - 20 + (index * 12));
          });
          
          group.querySelectorAll('text.birth-name').forEach((text, index) => {
            text.setAttribute('x', newCx);
            text.setAttribute('y', newCy + 5 + (index * 10));
          });
          
          const dobText = group.querySelector('text.dob');
          if (dobText) {
            dobText.setAttribute('x', newCx);
            dobText.setAttribute('y', newCy + 25);
          }
          
          // Update connections in real-time for better visual feedback
          if (this.connections.updatePersonConnections) {
            this.connections.updatePersonConnections(personId);
          }
        }
        
        dragState.rafId = null;
      });
    };

    // Mouse events for desktop
    circle.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // Only left click
      
      e.preventDefault();
      e.stopPropagation();
      dragState.isDragging = true;
      this.isDragging = true;
      
      circle.style.cursor = 'grabbing';
      group.style.opacity = '0.9'; // Visual feedback
    });

    // Touch events for mobile
    let touchStartPos = null;
    
    circle.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const touch = e.touches[0];
      touchStartPos = { x: touch.clientX, y: touch.clientY };
      dragState.isCircleTouching = true;
      dragState.dragStarted = false;
      
      // Visual feedback
      group.style.opacity = '0.9';
      
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    }, { passive: false });

    circle.addEventListener('touchmove', (e) => {
      if (!dragState.isCircleTouching || e.touches.length !== 1) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const touch = e.touches[0];
      
      if (!dragState.dragStarted && touchStartPos) {
        const distance = Math.sqrt(
          Math.pow(touch.clientX - touchStartPos.x, 2) + 
          Math.pow(touch.clientY - touchStartPos.y, 2)
        );
        
        if (distance > this.dragThreshold) {
          dragState.dragStarted = true;
          dragState.isDragging = true;
          this.isDragging = true;
        }
      }
      
      if (dragState.dragStarted) {
        updatePosition(touch.clientX, touch.clientY);
      }
    }, { passive: false });

    circle.addEventListener('touchend', (e) => {
      if (!dragState.isCircleTouching) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      dragState.isCircleTouching = false;
      dragState.isDragging = false;
      dragState.dragStarted = false;
      this.isDragging = false;
      touchStartPos = null;
      
      // Reset visual feedback
      group.style.opacity = '';
      
      // Cancel any pending RAF
      if (dragState.rafId) {
        cancelAnimationFrame(dragState.rafId);
        dragState.rafId = null;
      }
      
      // Final connection update
      if (this.connections.generateAll) {
        this.connections.generateAll();
      }
      
      this.onDragEnd?.(personId);
      
      if (navigator.vibrate) {
        navigator.vibrate(5);
      }
    }, { passive: false });

    // Global mouse events for desktop
    const handleMouseMove = (e) => {
      if (!dragState.isDragging || dragState.isCircleTouching) return;
      
      e.preventDefault();
      updatePosition(e.clientX, e.clientY);
    };

    const handleMouseUp = (e) => {
      if (!dragState.isDragging || dragState.isCircleTouching) return;
      
      e.preventDefault();
      dragState.isDragging = false;
      this.isDragging = false;
      circle.style.cursor = 'grab';
      group.style.opacity = '';
      
      // Cancel any pending RAF
      if (dragState.rafId) {
        cancelAnimationFrame(dragState.rafId);
        dragState.rafId = null;
      }
      
      // Final connection update
      if (this.connections.generateAll) {
        this.connections.generateAll();
      }
      
      this.onDragEnd?.(personId);
    };

    // Store references for cleanup
    dragState.handleMouseMove = handleMouseMove;
    dragState.handleMouseUp = handleMouseUp;

    // Add global listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  removeDrag(personId) {
    const dragState = this.activeDrags.get(personId);
    if (dragState) {
      // Cancel any pending RAF
      if (dragState.rafId) {
        cancelAnimationFrame(dragState.rafId);
      }
      
      // Remove global listeners
      if (dragState.handleMouseMove) {
        document.removeEventListener('mousemove', dragState.handleMouseMove);
      }
      if (dragState.handleMouseUp) {
        document.removeEventListener('mouseup', dragState.handleMouseUp);
      }
      
      this.activeDrags.delete(personId);
    }
  }

  isDragInProgress() {
    return this.isDragging;
  }

  cleanup() {
    // Remove all active drags
    for (const personId of this.activeDrags.keys()) {
      this.removeDrag(personId);
    }
  }

  // Event callback
  onDragEnd = null;
}