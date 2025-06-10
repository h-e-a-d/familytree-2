// tree-drag.js
// Handles ultra-smooth circle dragging with zero lag - MOBILE OPTIMIZED

export class DragManager {
  constructor(svg, panZoom, connections, selection) {
    this.svg = svg;
    this.panZoom = panZoom;
    this.connections = connections;
    this.selection = selection;
    
    // Drag state
    this.isDragging = false;
    this.dragThreshold = 3; // Very low threshold for immediate response
    
    // Active drags
    this.activeDrags = new Map();
    
    // Performance optimization
    this.updateQueue = new Set();
    this.isUpdating = false;
  }

  setupCircleDrag(group, circle, personId) {
    const dragState = {
      offsetX: 0,
      offsetY: 0,
      isDragging: false,
      isCircleTouching: false,
      dragStarted: false,
      touchStartPos: { x: 0, y: 0 },
      currentPos: { x: 0, y: 0 },
      needsUpdate: false
    };

    this.activeDrags.set(personId, dragState);

    // Ultra-fast position update - direct DOM manipulation
    const updateCirclePosition = (newCx, newCy) => {
      if (isNaN(newCx) || isNaN(newCy)) return;
      
      // Store the new position
      dragState.currentPos = { x: newCx, y: newCy };
      dragState.needsUpdate = true;
      
      // Add to update queue
      this.updateQueue.add(personId);
      
      // Process updates if not already processing
      if (!this.isUpdating) {
        this.processUpdates();
      }
    };

    // Batch process all position updates for better performance
    const batchUpdatePositions = () => {
      const radius = parseFloat(circle.getAttribute('r')) || 50;
      const newCx = dragState.currentPos.x;
      const newCy = dragState.currentPos.y;
      
      // Update circle position
      circle.setAttribute('cx', newCx);
      circle.setAttribute('cy', newCy);
      
      // Update all text positions in one go
      const texts = group.querySelectorAll('text');
      texts.forEach(text => {
        if (text.classList.contains('name')) {
          // Name texts are stacked above center
          const index = Array.from(group.querySelectorAll('text.name')).indexOf(text);
          text.setAttribute('x', newCx);
          text.setAttribute('y', newCy - 20 + (index * 12)); // Fixed: proper Y coordinate calculation
        } else if (text.classList.contains('birth-name')) {
          // Birth name texts are just below center
          const index = Array.from(group.querySelectorAll('text.birth-name')).indexOf(text);
          text.setAttribute('x', newCx);
          text.setAttribute('y', newCy + 5 + (index * 10));
        } else if (text.classList.contains('dob')) {
          // DOB is below everything
          text.setAttribute('x', newCx);
          text.setAttribute('y', newCy + 25);
        }
      });
      
      dragState.needsUpdate = false;
    };

    // Store the update function for this drag
    dragState.batchUpdate = batchUpdatePositions;

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

    // Touch events for mobile - HEAVILY OPTIMIZED
    circle.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        // Immediate response - prevent any delay
        e.preventDefault();
        e.stopPropagation();
        
        dragState.isCircleTouching = true;
        dragState.dragStarted = false;
        
        const touch = e.touches[0];
        dragState.touchStartPos = { x: touch.clientX, y: touch.clientY };
        
        const currentCx = parseFloat(circle.getAttribute('cx')) || 0;
        const currentCy = parseFloat(circle.getAttribute('cy')) || 0;
        
        const svgCoords = this.panZoom.screenToSVG(touch.clientX, touch.clientY);
        dragState.offsetX = svgCoords.x - currentCx;
        dragState.offsetY = svgCoords.y - currentCy;
        
        // Immediate visual feedback
        circle.style.transform = 'scale(1.05)';
        
        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(10);
        }
      }
    }, { passive: false });

    circle.addEventListener('touchmove', (e) => {
      if (!dragState.isCircleTouching || e.touches.length !== 1) return;
      
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
          
          // Prevent any browser interference
          e.preventDefault();
          e.stopPropagation();
          
          // Visual feedback for drag start
          circle.style.transform = 'scale(1.1)';
        } else {
          return;
        }
      }
      
      if (dragState.dragStarted) {
        // Critical: prevent all default behaviors during drag
        e.preventDefault();
        e.stopPropagation();
        
        // Immediate position update
        const svgCoords = this.panZoom.screenToSVG(touch.clientX, touch.clientY);
        const newCx = svgCoords.x - dragState.offsetX;
        const newCy = svgCoords.y - dragState.offsetY;
        
        updateCirclePosition(newCx, newCy);
      }
    }, { passive: false });

    circle.addEventListener('touchend', (e) => {
      if (!dragState.isCircleTouching) return;
      
      dragState.isCircleTouching = false;
      
      // Reset visual state
      circle.style.transform = '';
      
      if (dragState.dragStarted) {
        e.preventDefault();
        e.stopPropagation();
        
        dragState.isDragging = false;
        dragState.dragStarted = false;
        this.isDragging = false;
        
        // Final update and connection regeneration
        if (dragState.needsUpdate) {
          dragState.batchUpdate();
        }
        
        // Defer heavy operations until after drag
        setTimeout(() => {
          this.connections.generateAll();
          this.onDragEnd?.(personId);
        }, 0);
        
        // End haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(5);
        }
      }
    }, { passive: false });

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
      
      // Final update
      if (dragState.needsUpdate) {
        dragState.batchUpdate();
      }
      
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

  // Process all position updates in a single animation frame
  processUpdates() {
    if (this.isUpdating) return;
    
    this.isUpdating = true;
    
    requestAnimationFrame(() => {
      // Process all queued updates
      this.updateQueue.forEach(personId => {
        const dragState = this.activeDrags.get(personId);
        if (dragState && dragState.needsUpdate) {
          dragState.batchUpdate();
        }
      });
      
      this.updateQueue.clear();
      this.isUpdating = false;
    });
  }

  removeDrag(personId) {
    const dragState = this.activeDrags.get(personId);
    if (dragState) {
      // Remove from update queue
      this.updateQueue.delete(personId);
      
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
    
    // Clear update queue
    this.updateQueue.clear();
    this.isUpdating = false;
  }

  // Event callback
  onDragEnd = null;
}