// tree-drag.js
// Fixed drag implementation with proper offset handling

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
      startOffset: { x: 0, y: 0 },
      touchStartPos: { x: 0, y: 0 },
      rafId: null
    };

    this.activeDrags.set(personId, dragState);

    // Update position maintaining offset
    const updatePosition = (clientX, clientY) => {
      if (dragState.rafId) {
        cancelAnimationFrame(dragState.rafId);
      }
      
      dragState.rafId = requestAnimationFrame(() => {
        const svgCoords = this.panZoom.screenToSVG(clientX, clientY);
        const newCx = svgCoords.x - dragState.startOffset.x;
        const newCy = svgCoords.y - dragState.startOffset.y;
        
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
        }
        
        dragState.rafId = null;
      });
    };

    // Mouse events for desktop
    circle.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // Only left click
      
      e.preventDefault();
      e.stopPropagation();
      
      // Calculate offset between mouse and circle center
      const currentCx = parseFloat(circle.getAttribute('cx')) || 0;
      const currentCy = parseFloat(circle.getAttribute('cy')) || 0;
      const mousePos = this.panZoom.screenToSVG(e.clientX, e.clientY);
      
      dragState.startOffset = {
        x: mousePos.x - currentCx,
        y: mousePos.y - currentCy
      };
      
      dragState.isDragging = true;
      this.isDragging = true;
      
      circle.style.cursor = 'grabbing';
      group.style.opacity = '0.9'; // Visual feedback
    });

    // Touch events for mobile
    circle.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const touch = e.touches[0];
      dragState.touchStartPos = { x: touch.clientX, y: touch.clientY };
      dragState.isCircleTouching = true;
      dragState.dragStarted = false;
      
      // Calculate offset between touch and circle center
      const currentCx = parseFloat(circle.getAttribute('cx')) || 0;
      const currentCy = parseFloat(circle.getAttribute('cy')) || 0;
      const touchPos = this.panZoom.screenToSVG(touch.clientX, touch.clientY);
      
      dragState.startOffset = {
        x: touchPos.x - currentCx,
        y: touchPos.y - currentCy
      };
      
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
      
      if (!dragState.dragStarted) {
        const distance = Math.sqrt(
          Math.pow(touch.clientX - dragState.touchStartPos.x, 2) + 
          Math.pow(touch.clientY - dragState.touchStartPos.y, 2)
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
      
      // Reset visual feedback
      group.style.opacity = '';
      
      // Cancel any pending RAF
      if (dragState.rafId) {
        cancelAnimationFrame(dragState.rafId);
        dragState.rafId = null;
      }
      
      // Update connections once at the end
      setTimeout(() => {
        if (this.connections.updatePersonConnections) {
          this.connections.updatePersonConnections(personId);
        } else {
          this.connections.generateAll();
        }
        this.onDragEnd?.(personId);
      }, 0);
      
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
      
      // Update connections once at the end
      setTimeout(() => {
        if (this.connections.updatePersonConnections) {
          this.connections.updatePersonConnections(personId);
        } else {
          this.connections.generateAll();
        }
        this.onDragEnd?.(personId);
      }, 0);
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