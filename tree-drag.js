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
    this.dragThreshold = 5; // Reduced threshold for better responsiveness
    
    // Active drags
    this.activeDrags = new Map();
    
    // Mobile optimization - cache frequently accessed elements
    this.cachedSvgRect = null;
    this.lastRectUpdate = 0;
    this.rectCacheTimeout = 1000; // 1 second cache
  }

  setupCircleDrag(group, circle, personId) {
    const dragState = {
      offsetX: 0,
      offsetY: 0,
      isDragging: false,
      isCircleTouching: false,
      dragStarted: false,
      touchStartPos: { x: 0, y: 0 },
      lastUpdateTime: 0,
      animationFrame: null
    };

    this.activeDrags.set(personId, dragState);

    // Optimized rect caching for mobile
    const getCachedRect = () => {
      const now = Date.now();
      if (!this.cachedSvgRect || (now - this.lastRectUpdate) > this.rectCacheTimeout) {
        this.cachedSvgRect = this.svg.getBoundingClientRect();
        this.lastRectUpdate = now;
      }
      return this.cachedSvgRect;
    };

    const invalidateRectCache = () => {
      this.cachedSvgRect = null;
    };

    // Ultra-fast position update with RAF optimization for mobile
    const updateCirclePosition = (newCx, newCy) => {
      if (isNaN(newCx) || isNaN(newCy)) return;
      
      // Cancel any pending animation frame
      if (dragState.animationFrame) {
        cancelAnimationFrame(dragState.animationFrame);
      }
      
      // Use requestAnimationFrame for smooth 60fps updates on mobile
      dragState.animationFrame = requestAnimationFrame(() => {
        circle.setAttribute('cx', newCx);
        circle.setAttribute('cy', newCy);
        
        // Update text positions inside circle
        const nameText = group.querySelector('text.name');
        const surnameText = group.querySelector('text.surname');
        const birthNameText = group.querySelector('text.birth-name');
        const dobText = group.querySelector('text.dob');
        
        if (nameText) {
          nameText.setAttribute('x', newCx);
          nameText.setAttribute('y', newCx - 15); // Above center
        }
        
        if (surnameText) {
          surnameText.setAttribute('x', newCx);
          surnameText.setAttribute('y', newCy - 5); // Just above center
        }
        
        if (birthNameText) {
          birthNameText.setAttribute('x', newCx);
          birthNameText.setAttribute('y', newCy + 5); // Just below center
        }
        
        if (dobText) {
          dobText.setAttribute('x', newCx);
          dobText.setAttribute('y', newCy + 20); // Below center
        }
        
        dragState.animationFrame = null;
      });
    };

    // Mouse events for desktop (unchanged)
    circle.addEventListener('mousedown', (e) => {
      if (e.detail === 1) {
        e.preventDefault();
        e.stopPropagation();
        dragState.isDragging = true;
        this.isDragging = true;
        
        invalidateRectCache();
        
        const currentCx = parseFloat(circle.getAttribute('cx')) || 0;
        const currentCy = parseFloat(circle.getAttribute('cy')) || 0;
        
        const svgCoords = this.panZoom.screenToSVG(e.clientX, e.clientY);
        dragState.offsetX = svgCoords.x - currentCx;
        dragState.offsetY = svgCoords.y - currentCy;
        
        circle.style.cursor = 'grabbing';
      }
    });

    // OPTIMIZED Touch events for mobile
    circle.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        // Prevent default to avoid scroll/zoom conflicts
        e.preventDefault();
        e.stopPropagation();
        
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
        
        // Add haptic feedback on supported devices
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
          
          // Prevent browser scrolling/zooming during drag
          e.preventDefault();
          e.stopPropagation();
        } else {
          return;
        }
      }
      
      if (dragState.dragStarted) {
        // Always prevent default once dragging starts
        e.preventDefault();
        e.stopPropagation();
        
        // Throttle updates to 60fps for performance
        const now = Date.now();
        if (now - dragState.lastUpdateTime < 16) return; // ~60fps
        dragState.lastUpdateTime = now;
        
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
        
        // Generate connections after drag ends (not during)
        this.connections.generateAll();
        this.onDragEnd?.(personId);
        
        // Haptic feedback on drag end
        if (navigator.vibrate) {
          navigator.vibrate(5);
        }
      }
      
      invalidateRectCache();
    }, { passive: false });

    // Global mouse events for desktop (unchanged)
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
      // Cancel any pending animation frames
      if (dragState.animationFrame) {
        cancelAnimationFrame(dragState.animationFrame);
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
    
    // Clear cache
    this.cachedSvgRect = null;
  }

  // Event callback
  onDragEnd = null;
}