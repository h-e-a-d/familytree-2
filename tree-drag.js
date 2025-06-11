// tree-drag.js
// Fixed drag implementation with proper coordinate conversion

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
      isDragging: false,
      isCircleTouching: false,
      dragStarted: false,
      touchStartPos: { x: 0, y: 0 },
      startScreenPos: { x: 0, y: 0 },
      originalCircleSVG: { x: 0, y: 0 },
      accumulatedDelta: { x: 0, y: 0 }
    };

    this.activeDrags.set(personId, dragState);

    // Update transform directly in screen pixels
    const updateTransform = (screenX, screenY) => {
      // Calculate screen pixel delta from start
      const deltaX = screenX - dragState.startScreenPos.x;
      const deltaY = screenY - dragState.startScreenPos.y;
      
      // Apply transform in screen pixels
      group.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
      
      // Store accumulated delta for final position calculation
      dragState.accumulatedDelta = { x: deltaX, y: deltaY };
    };

    // Final position update when drag ends
    const commitPosition = () => {
      // Calculate the final SVG position based on screen delta
      // We need to scale the pixel delta by the current zoom level
      const transform = this.panZoom.getTransform();
      const svgDeltaX = dragState.accumulatedDelta.x / transform.scale;
      const svgDeltaY = dragState.accumulatedDelta.y / transform.scale;
      
      const newCx = dragState.originalCircleSVG.x + svgDeltaX;
      const newCy = dragState.originalCircleSVG.y + svgDeltaY;
      
      if (!isNaN(newCx) && !isNaN(newCy)) {
        // Update actual SVG attributes
        circle.setAttribute('cx', newCx);
        circle.setAttribute('cy', newCy);
        
        // Update text positions
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
      }
      
      // Remove transform after updating positions
      group.style.transform = '';
      group.style.willChange = '';
      
      // Reset accumulated delta
      dragState.accumulatedDelta = { x: 0, y: 0 };
    };

    // Mouse events for desktop
    circle.addEventListener('mousedown', (e) => {
      if (e.detail === 1) {
        e.preventDefault();
        e.stopPropagation();
        
        dragState.isDragging = true;
        this.isDragging = true;
        
        // Store start screen position
        dragState.startScreenPos = { x: e.clientX, y: e.clientY };
        
        // Store original circle SVG position
        const cx = parseFloat(circle.getAttribute('cx')) || 0;
        const cy = parseFloat(circle.getAttribute('cy')) || 0;
        dragState.originalCircleSVG = { x: cx, y: cy };
        
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
        dragState.startScreenPos = { x: touch.clientX, y: touch.clientY };
        
        // Store original circle SVG position
        const cx = parseFloat(circle.getAttribute('cx')) || 0;
        const cy = parseFloat(circle.getAttribute('cy')) || 0;
        dragState.originalCircleSVG = { x: cx, y: cy };
        
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
        updateTransform(touch.clientX, touch.clientY);
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
        
        // Commit final position
        commitPosition();
        
        // Update connections after a small delay to ensure DOM is updated
        requestAnimationFrame(() => {
          if (this.connections.updatePersonConnections) {
            this.connections.updatePersonConnections(personId);
          } else {
            this.connections.generateAll();
          }
          this.onDragEnd?.(personId);
        });
        
        // End haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(5);
        }
      }
    }, { passive: false, capture: true });

    // Global mouse events for desktop
    const handleMouseMove = (e) => {
      if (!dragState.isDragging || dragState.isCircleTouching) return;
      
      updateTransform(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      if (!dragState.isDragging || dragState.isCircleTouching) return;
      
      dragState.isDragging = false;
      this.isDragging = false;
      circle.style.cursor = 'grab';
      
      // Commit final position
      commitPosition();
      
      // Update connections after a small delay
      requestAnimationFrame(() => {
        if (this.connections.updatePersonConnections) {
          this.connections.updatePersonConnections(personId);
        } else {
          this.connections.generateAll();
        }
        this.onDragEnd?.(personId);
      });
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
    // Remove all active drags
    for (const personId of this.activeDrags.keys()) {
      this.removeDrag(personId);
    }
  }

  // Event callback
  onDragEnd = null;
}