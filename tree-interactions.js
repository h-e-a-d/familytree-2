// tree-interactions.js
// Handles touch/click interactions and double-tap detection

import { openModalForEdit } from './modal.js';

export class InteractionManager {
  constructor(svg, selection, drag) {
    this.svg = svg;
    this.selection = selection;
    this.drag = drag;
    
    // Double-tap detection constants
    this.DOUBLE_TAP_DELAY = 300; // milliseconds
    this.DOUBLE_TAP_DISTANCE = 50; // pixels
    
    // Setup selection clearing
    this.selection.onSelectionDeleted = () => {
      this.onSelectionChange?.();
    };
    
    // Setup drag callbacks
    this.drag.onDragEnd = () => {
      this.onDragEnd?.();
    };
  }

  setupCircleInteractions(group, circle, personId) {
    // Setup dragging
    this.drag.setupCircleDrag(group, circle, personId);
    
    // Setup click/tap interactions
    this.setupClickInteractions(group, circle, personId);
  }

  setupClickInteractions(group, circle, personId) {
    let clickTimeout;
    let tapCount = 0;
    let lastTapTime = 0;
    let lastTapPosition = { x: 0, y: 0 };

    // Mouse events for desktop
    circle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Clear any existing timeout
      if (clickTimeout) {
        clearTimeout(clickTimeout);
        clickTimeout = null;
      }
      
      // Delay the selection to allow for double-click detection
      clickTimeout = setTimeout(() => {
        if (!this.drag.isDragInProgress()) {
          this.selection.toggle(personId, circle, group);
        }
      }, 200);
    });
    
    // Double-click to edit (desktop)
    circle.addEventListener('dblclick', (e) => {
      console.log('Double-clicked on circle:', personId);
      e.preventDefault();
      e.stopPropagation();
      
      // Clear the single-click timeout
      if (clickTimeout) {
        clearTimeout(clickTimeout);
        clickTimeout = null;
      }
      
      this.selection.clear();
      openModalForEdit(personId);
    });

    // Mobile touch events with proper double-tap detection
    let touchStartTime = 0;
    let hasTouchMoved = false;
    let touchStartPos = { x: 0, y: 0 };

    circle.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const now = Date.now();
      const touch = e.touches[0];
      const currentPos = { x: touch.clientX, y: touch.clientY };
      
      touchStartTime = now;
      hasTouchMoved = false;
      touchStartPos = currentPos;
      
      // Check for double-tap
      const timeSinceLastTap = now - lastTapTime;
      const distanceFromLastTap = Math.sqrt(
        Math.pow(currentPos.x - lastTapPosition.x, 2) + 
        Math.pow(currentPos.y - lastTapPosition.y, 2)
      );
      
      if (timeSinceLastTap < this.DOUBLE_TAP_DELAY && 
          distanceFromLastTap < this.DOUBLE_TAP_DISTANCE && 
          tapCount === 1) {
        // This is a double-tap!
        console.log('Double-tap detected on circle:', personId);
        tapCount = 0;
        lastTapTime = 0;
        
        // Clear any pending single-tap timeout
        if (clickTimeout) {
          clearTimeout(clickTimeout);
          clickTimeout = null;
        }
        
        this.selection.clear();
        openModalForEdit(personId);
        return;
      }
      
      // Record this tap
      tapCount = 1;
      lastTapTime = now;
      lastTapPosition = currentPos;
    }, { passive: false });

    circle.addEventListener('touchmove', (e) => {
      // If the touch moves significantly, it's not a tap
      const touch = e.touches[0];
      const currentPos = { x: touch.clientX, y: touch.clientY };
      const distance = Math.sqrt(
        Math.pow(currentPos.x - touchStartPos.x, 2) + 
        Math.pow(currentPos.y - touchStartPos.y, 2)
      );
      
      if (distance > 10) { // 10px threshold for considering it a move
        hasTouchMoved = true;
      }
    }, { passive: false });

    circle.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const now = Date.now();
      const touchDuration = now - touchStartTime;
      
      // If this was a short touch without movement and not part of a double-tap sequence
      if (!hasTouchMoved && touchDuration < 500 && tapCount === 1) {
        // Set a timeout for single-tap action (selection)
        // This will be cancelled if a second tap comes within the double-tap delay
        clickTimeout = setTimeout(() => {
          if (!this.drag.isDragInProgress() && tapCount === 1) {
            console.log('Single-tap on circle:', personId);
            this.selection.toggle(personId, circle, group);
            tapCount = 0;
          }
        }, this.DOUBLE_TAP_DELAY);
      }
    }, { passive: false });
  }

  removeCircleInteractions(personId) {
    // Remove drag handling
    this.drag.removeDrag(personId);
    
    // Note: Event listeners on the circle itself will be removed when the DOM element is removed
  }

  // Event callbacks
  onSelectionChange = null;
  onDragEnd = null;
}