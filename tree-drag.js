// tree-drag.js
// Optimized drag implementation using CSS transforms for smooth performance

export class DragManager {
  constructor(svg, panZoom, connections, selection) {
    this.svg = svg;
    this.panZoom = panZoom;
    this.connections = connections;
    this.selection = selection;
    
    // Drag state
    this.isDragging = false;
    this.dragThreshold = 3;
    
    // Active drags with cached references
    this.activeDrags = new Map();
    
    // RAF handle for smooth updates
    this.rafHandle = null;
  }

  setupCircleDrag(group, circle, personId) {
    // Cache all element references at setup time
    const nameTexts = Array.from(group.querySelectorAll('text.name'));
    const birthNameTexts = Array.from(group.querySelectorAll('text.birth-name'));
    const dobText = group.querySelector('text.dob');
    
    const dragState = {
      group: group,
      circle: circle,
      nameTexts: nameTexts,
      birthNameTexts: birthNameTexts,
      dobText: dobText,
      offsetX: 0,
      offsetY: 0,
      isDragging: false,
      isCircleTouching: false,
      dragStarted: false,
      touchStartPos: { x: 0, y: 0 },
      originalCx: parseFloat(circle.getAttribute('cx')) || 0,
      originalCy: parseFloat(circle.getAttribute('cy')) || 0,
      currentX: 0,
      currentY: 0,
      transform: { x: 0, y: 0 }
    };

    this.activeDrags.set(personId, dragState);

    // Optimized position update using transform
    const updateTransform = () => {
      const dx = dragState.currentX - dragState.originalCx;
      const dy = dragState.currentY - dragState.originalCy;
      
      // Use transform for smooth movement during drag
      group.style.transform = `translate(${dx}px, ${dy}px)`;
      dragState.transform = { x: dx, y: dy };
    };

    // Final position update when drag ends
    const commitPosition = () => {
      // Remove transform
      group.style.transform = '';
      
      // Update actual SVG attributes once
      const newCx = dragState.currentX;
      const newCy = dragState.currentY;
      
      if (!isNaN(newCx) && !isNaN(newCy)) {
        // Update circle position
        circle.setAttribute('cx', newCx);
        circle.setAttribute('cy', newCy);
        
        // Update cached text positions
        dragState.nameTexts.forEach((text, index) => {
          text.setAttribute('x', newCx);
          text.setAttribute('y', newCy - 20 + (index * 12));
        });
        
        dragState.birthNameTexts.forEach((text, index) => {
          text.setAttribute('x', newCx);
          text.setAttribute('y', newCy + 5 + (index * 10));
        });
        
        if (dragState.dobText) {
          dragState.dobText.setAttribute('x', newCx);
          dragState.dobText.setAttribute('y', newCy + 25);
        }
        
        // Update stored original position for next drag
        dragState.originalCx = newCx;
        dragState.originalCy = newCy;
      }
    };

    // Mouse events for desktop
    circle.addEventListener('mousedown', (e) => {
      if (e.detail === 1) {
        e.preventDefault();
        e.stopPropagation();
        dragState.isDragging = true;
        this.isDragging = true;
        
        const svgCoords = this.panZoom.screenToSVG(e.clientX, e.clientY);
        dragState.offsetX = svgCoords.x - dragState.originalCx;
        dragState.offsetY = svgCoords.y - dragState.originalCy;
        dragState.currentX = dragState.originalCx;
        dragState.currentY = dragState.originalCy;
        
        circle.style.cursor = 'grabbing';
        group.style.willChange = 'transform';
      }
    });

    // Touch events for mobile
    circle.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        e.stopImmediatePropagation();
        
        dragState.isCircleTouching = true;
        dragState.dragStarted = false;
        
        const touch = e.touches[0];
        dragState.touchStartPos = { x: touch.clientX, y: touch.clientY };
        
        const svgCoords = this.panZoom.screenToSVG(touch.clientX, touch.clientY);
        dragState.offsetX = svgCoords.x - dragState.originalCx;
        dragState.offsetY = svgCoords.y - dragState.originalCy;
        dragState.currentX = dragState.originalCx;
        dragState.currentY = dragState.originalCy;
        
        // Visual feedback
        circle.style.transform = 'scale(1.05)';
        group.style.willChange = 'transform';
        
        // Haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(10);
        }
      }
    }, { passive: false, capture: true });

    circle.addEventListener('touchmove', (e) => {
      if (!dragState.isCircleTouching || e.touches.length !== 1) return;
      
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
        const svgCoords = this.panZoom.screenToSVG(touch.clientX, touch.clientY);
        dragState.currentX = svgCoords.x - dragState.offsetX;
        dragState.currentY = svgCoords.y - dragState.offsetY;
        
        // Use RAF for smooth updates
        if (!this.rafHandle) {
          this.rafHandle = requestAnimationFrame(() => {
            updateTransform();
            this.rafHandle = null;
          });
        }
      }
    }, { passive: false, capture: true });

    circle.addEventListener('touchend', (e) => {
      if (!dragState.isCircleTouching) return;
      
      dragState.isCircleTouching = false;
      
      // Reset visual state
      circle.style.transform = '';
      group.style.willChange = '';
      
      if (dragState.dragStarted) {
        e.preventDefault();
        e.stopImmediatePropagation();
        
        dragState.isDragging = false;
        dragState.dragStarted = false;
        this.isDragging = false;
        
        // Cancel any pending RAF
        if (this.rafHandle) {
          cancelAnimationFrame(this.rafHandle);
          this.rafHandle = null;
        }
        
        // Commit final position
        commitPosition();
        
        // Update only connections for this person (optimized)
        setTimeout(() => {
          if (this.connections.updatePersonConnections) {
            this.connections.updatePersonConnections(personId);
          } else {
            this.connections.generateAll();
          }
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
      dragState.currentX = svgCoords.x - dragState.offsetX;
      dragState.currentY = svgCoords.y - dragState.offsetY;
      
      // Use RAF for smooth updates
      if (!this.rafHandle) {
        this.rafHandle = requestAnimationFrame(() => {
          updateTransform();
          this.rafHandle = null;
        });
      }
    };

    const handleMouseUp = () => {
      if (!dragState.isDragging || dragState.isCircleTouching) return;
      
      dragState.isDragging = false;
      this.isDragging = false;
      circle.style.cursor = 'grab';
      group.style.willChange = '';
      
      // Cancel any pending RAF
      if (this.rafHandle) {
        cancelAnimationFrame(this.rafHandle);
        this.rafHandle = null;
      }
      
      // Commit final position
      commitPosition();
      
      // Update only connections for this person (optimized)
      if (this.connections.updatePersonConnections) {
        this.connections.updatePersonConnections(personId);
      } else {
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
      // Remove global listeners
      if (dragState.handleMouseMove) {
        document.removeEventListener('mousemove', dragState.handleMouseMove);
      }
      if (dragState.handleMouseUp) {
        document.removeEventListener('mouseup', dragState.handleMouseUp);
      }
      
      // Reset any transforms
      if (dragState.group) {
        dragState.group.style.transform = '';
        dragState.group.style.willChange = '';
      }
      
      this.activeDrags.delete(personId);
    }
  }

  isDragInProgress() {
    return this.isDragging;
  }

  cleanup() {
    // Cancel any pending RAF
    if (this.rafHandle) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
    
    // Remove all active drags
    for (const personId of this.activeDrags.keys()) {
      this.removeDrag(personId);
    }
  }

  // Event callback
  onDragEnd = null;
}