// tree-drag.js
// Ultra-simple, immediate mobile drag - NO DELAYS

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
      offsetX: 0,
      offsetY: 0,
      isDragging: false,
      isCircleTouching: false,
      dragStarted: false,
      touchStartPos: { x: 0, y: 0 }
    };

    this.activeDrags.set(personId, dragState);

    // IMMEDIATE position update - no batching, no RAF, direct DOM
    const updateCirclePosition = (newCx, newCy) => {
      if (isNaN(newCx) || isNaN(newCy)) return;
      
      // Update circle IMMEDIATELY
      circle.setAttribute('cx', newCx);
      circle.setAttribute('cy', newCy);
      
      // Update ALL texts IMMEDIATELY - no delays
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
    };

    // Mouse events for desktop
    circle.addEventListener('mousedown', (e) => {
      if (e.detail === 1) {
        e.preventDefault();
        e.stopPropagation();
        dragState.isDragging = true;
        this.isDragging = true;
        
        const currentCx = parseFloat(circle.getAttribute('cx')) || 0;
        const currentCy = parseFloat(circle.getAttribute('cy')) || 0;
        
        const svgCoords = this.panZoom.screenToSVG(e.clientX, e.clientY);
        dragState.offsetX = svgCoords.x - currentCx;
        dragState.offsetY = svgCoords.y - currentCy;
        
        circle.style.cursor = 'grabbing';
      }
    });

    // MOBILE TOUCH - MAXIMUM RESPONSIVENESS
    circle.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        // IMMEDIATELY prevent all browser interference
        e.preventDefault();
        e.stopImmediatePropagation();
        
        dragState.isCircleTouching = true;
        dragState.dragStarted = false;
        
        const touch = e.touches[0];
        dragState.touchStartPos = { x: touch.clientX, y: touch.clientY };
        
        const currentCx = parseFloat(circle.getAttribute('cx')) || 0;
        const currentCy = parseFloat(circle.getAttribute('cy')) || 0;
        
        const svgCoords = this.panZoom.screenToSVG(touch.clientX, touch.clientY);
        dragState.offsetX = svgCoords.x - currentCx;
        dragState.offsetY = svgCoords.y - currentCy;
        
        // Visual feedback
        circle.style.transform = 'scale(1.05)';
        
        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(10);
        }
      }
    }, { passive: false, capture: true });

    circle.addEventListener('touchmove', (e) => {
      if (!dragState.isCircleTouching || e.touches.length !== 1) return;
      
      // IMMEDIATELY prevent browser interference
      e.preventDefault();
      e.stopImmediatePropagation();
      
      const touch = e.touches[0];
      const currentPos = { x: touch.clientX, y: touch.clientY };
      
      if (!dragState.dragStarted) {
        const distance = Math.sqrt(
          Math.pow(currentPos.x - dragState.touchStartPos.x, 2) + 
          Math.pow(currentPos.y - dragState.touchStartPos.y, 2)
        );
        
        if (distance > this.dragThreshold) {
          dragState.dragStarted = true;
          dragState.isDragging = true;
          this.isDragging = true;
          
          // Enhanced visual feedback
          circle.style.transform = 'scale(1.1)';
        } else {
          return;
        }
      }
      
      if (dragState.dragStarted) {
        // IMMEDIATE position calculation and update
        const svgCoords = this.panZoom.screenToSVG(touch.clientX, touch.clientY);
        const newCx = svgCoords.x - dragState.offsetX;
        const newCy = svgCoords.y - dragState.offsetY;
        
        // IMMEDIATE DOM update - no delays whatsoever
        updateCirclePosition(newCx, newCy);
      }
    }, { passive: false, capture: true });

    circle.addEventListener('touchend', (e) => {
      if (!dragState.isCircleTouching) return;
      
      dragState.isCircleTouching = false;
      
      // Reset visual state
      circle.style.transform = '';
      
      if (dragState.dragStarted) {
        e.preventDefault();
        e.stopImmediatePropagation();
        
        dragState.isDragging = false;
        dragState.dragStarted = false;
        this.isDragging = false;
        
        // Only generate connections after drag ends
        setTimeout(() => {
          this.connections.generateAll();
          this.onDragEnd?.(personId);
        }, 0);
        
        // End haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(5);
        }
      }
    }, { passive: false, capture: true });

    // Global mouse events for desktop
    const handleMouseMove = (e) => {
      if (!dragState.isDragging || dragState.isCircleTouching) return;
      
      const svgCoords = this.panZoom.screenToSVG(e.clientX, e.clientY);
      const newCx = svgCoords.x - dragState.offsetX;
      const newCy = svgCoords.y - dragState.offsetY;
      
      updateCirclePosition(newCx, newCy);
    };

    const handleMouseUp = () => {
      if (!dragState.isDragging || dragState.isCircleTouching) return;
      
      dragState.isDragging = false;
      this.isDragging = false;
      circle.style.cursor = 'grab';
      
      this.connections.generateAll();
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