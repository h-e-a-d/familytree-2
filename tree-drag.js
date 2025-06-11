// tree-drag.js
// Fixed drag implementation with proper coordinate handling

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
      startMouseSVG: { x: 0, y: 0 },
      startCirclePos: { x: 0, y: 0 }
    };

    this.activeDrags.set(personId, dragState);

    // Optimized position update using transform
    const updateTransform = (svgX, svgY) => {
      // Calculate the delta from the start position
      const dx = svgX - dragState.startMouseSVG.x;
      const dy = svgY - dragState.startMouseSVG.y;
      
      // Apply transform relative to start position
      group.style.transform = `translate(${dx}px, ${dy}px)`;
      
      // Store the current position for final update
      dragState.currentPos = {
        x: dragState.startCirclePos.x + dx,
        y: dragState.startCirclePos.y + dy
      };
    };

    // Final position update when drag ends
    const commitPosition = () => {
      if (!dragState.currentPos) return;
      
      const newCx = dragState.currentPos.x;
      const newCy = dragState.currentPos.y;
      
      if (!isNaN(newCx) && !isNaN(newCy)) {
        // Update actual SVG attributes BEFORE removing transform
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
      
      // Remove transform AFTER updating positions
      group.style.transform = '';
      group.style.willChange = '';
    };

    // Mouse events for desktop
    circle.addEventListener('mousedown', (e) => {
      if (e.detail === 1) {
        e.preventDefault();
        e.stopPropagation();
        
        dragState.isDragging = true;
        this.isDragging = true;
        
        // Get current circle position
        const currentCx = parseFloat(circle.getAttribute('cx')) || 0;
        const currentCy = parseFloat(circle.getAttribute('cy')) || 0;
        
        // Store start positions
        const svgCoords = this.panZoom.screenToSVG(e.clientX, e.clientY);
        dragState.startMouseSVG = svgCoords;
        dragState.startCirclePos = { x: currentCx, y: currentCy };
        dragState.currentPos = { x: currentCx, y: currentCy };
        
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
        
        // Get current circle position
        const currentCx = parseFloat(circle.getAttribute('cx')) || 0;
        const currentCy = parseFloat(circle.getAttribute('cy')) || 0;
        
        // Store start positions
        const svgCoords = this.panZoom.screenToSVG(touch.clientX, touch.clientY);
        dragState.startMouseSVG = svgCoords;
        dragState.startCirclePos = { x: currentCx, y: currentCy };
        dragState.currentPos = { x: currentCx, y: currentCy };
        
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
        updateTransform(svgCoords.x, svgCoords.y);
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
      updateTransform(svgCoords.x, svgCoords.y);
    };

    const handleMouseUp = () => {
      if (!dragState.isDragging || dragState.isCircleTouching) return;
      
      dragState.isDragging = false;
      this.isDragging = false;
      circle.style.cursor = 'grab';
      
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
    // Remove all active drags
    for (const personId of this.activeDrags.keys()) {
      this.removeDrag(personId);
    }
  }

  // Event callback
  onDragEnd = null;
}