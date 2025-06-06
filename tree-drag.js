// tree-drag.js
// Handles ultra-smooth circle dragging with zero lag

export class DragManager {
  constructor(svg, panZoom, connections, selection) {
    this.svg = svg;
    this.panZoom = panZoom;
    this.connections = connections;
    this.selection = selection;
    
    // Drag state
    this.isDragging = false;
    this.dragThreshold = 8; // pixels
    
    // Active drags
    this.activeDrags = new Map();
  }

  setupCircleDrag(group, circle, personId) {
    const dragState = {
      offsetX: 0,
      offsetY: 0,
      isDragging: false,
      isCircleTouching: false,
      cachedRect: null,
      dragStarted: false,
      touchStartPos: { x: 0, y: 0 }
    };

    this.activeDrags.set(personId, dragState);

    // Cache SVG rect for better performance during drag
    const getCachedRect = () => {
      if (!dragState.cachedRect) {
        dragState.cachedRect = this.svg.getBoundingClientRect();
      }
      return dragState.cachedRect;
    };

    const invalidateRectCache = () => {
      dragState.cachedRect = null;
    };

    // Ultra-fast position update - no expensive operations during drag
    const updateCirclePosition = (newCx, newCy) => {
      if (isNaN(newCx) || isNaN(newCy)) return;
      
      circle.setAttribute('cx', newCx);
      circle.setAttribute('cy', newCy);
      
      const nameText = group.querySelector('text.name');
      const dobText = group.querySelector('text.dob');
      const radius = parseFloat(circle.getAttribute('r')) || 40;
      
      if (nameText) {
        nameText.setAttribute('x', newCx);
        nameText.setAttribute('y', newCy - radius - 8);
      }
      
      if (dobText) {
        dobText.setAttribute('x', newCx);
        dobText.setAttribute('y', newCy + radius + 16);
      }
    };

    // Mouse events for desktop
    circle.addEventListener('mousedown', (e) => {
      if (e.detail === 1) {
        e.preventDefault();
        e.stopPropagation();
        dragState.isDragging = true;
        this.isDragging = true;
        
        invalidateRectCache();
        
        const currentCx = parseFloat(circle.getAttribute('cx')) || 0;
        const currentCy = parseFloat(circle.getAttribute('cy')) || 0;
        
        const rect = getCachedRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const svgCoords = this.panZoom.screenToSVG(e.clientX, e.clientY);
        dragState.offsetX = svgCoords.x - currentCx;
        dragState.offsetY = svgCoords.y - currentCy;
        
        circle.style.cursor = 'grabbing';
      }
    });

    // Touch events for mobile
    circle.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        dragState.isCircleTouching = true;
        dragState.dragStarted = false;
        
        invalidateRectCache();
        
        const touch = e.touches[0];
        dragState.touchStartPos = { x: touch.clientX, y: touch.clientY };
        
        const currentCx = parseFloat(circle.getAttribute('cx')) || 0;
        const currentCy = parseFloat(circle.getAttribute('cy')) || 0;
        
        const svgCoords = this.panZoom.screenToSVG(touch.clientX, touch.clientY);
        dragState.offsetX = svgCoords.x - currentCx;
        dragState.offsetY = svgCoords.y - currentCy;
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
        } else {
          return;
        }
      }
      
      if (dragState.dragStarted) {
        e.preventDefault();
        e.stopPropagation();
        
        const svgCoords = this.panZoom.screenToSVG(touch.clientX, touch.clientY);
        const newCx = svgCoords.x - dragState.offsetX;
        const newCy = svgCoords.y - dragState.offsetY;
        
        updateCirclePosition(newCx, newCy);
      }
    }, { passive: false });

    circle.addEventListener('touchend', (e) => {
      if (!dragState.isCircleTouching) return;
      
      dragState.isCircleTouching = false;
      
      if (dragState.dragStarted) {
        e.preventDefault();
        e.stopPropagation();
        
        dragState.isDragging = false;
        dragState.dragStarted = false;
        this.isDragging = false;
        
        this.connections.generateAll();
        this.onDragEnd?.(personId);
      }
      
      invalidateRectCache();
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
      
      this.connections.generateAll();
      this.onDragEnd?.(personId);
      
      invalidateRectCache();
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