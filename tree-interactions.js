// tree-interactions.js
// Handles touch/click interactions and double-tap detection

import { openModalForEdit } from './modal.js';

export class InteractionManager {
  constructor(svg, selection, drag) {
    this.svg = svg;
    this.selection = selection;
    this.drag = drag;
    
    // Double-tap detection constants - OPTIMIZED FOR MOBILE
    this.DOUBLE_TAP_DELAY = 250; // Slightly reduced for better responsiveness
    this.DOUBLE_TAP_DISTANCE = 40; // Reduced distance for easier double-tap
    
    // Setup selection clearing on background click
    this.selection.onSelectionDeleted = () => {
      this.onSelectionChange?.();
    };
    
    // Setup drag callbacks
    this.drag.onDragEnd = () => {
      this.onDragEnd?.();
    };

    // Setup background click clearing
    this.setupBackgroundClearing();
  }

  setupBackgroundClearing() {
    // Clear selection when clicking SVG background
    if (this.svg) {
      this.svg.addEventListener('click', (e) => {
        if (e.target === this.svg || e.target.classList.contains('grid-line')) {
          this.selection.clear();
        }
      });
    }
  }

  setupCircleInteractions(group, circle, personId) {
    // Setup dragging first
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
      
      // Don't process clicks during drag
      if (this.drag.isDragInProgress()) {
        return;
      }
      
      // Clear any existing timeout
      if (clickTimeout) {
        clearTimeout(clickTimeout);
        clickTimeout = null;
      }
      
      // Delay the selection to allow for double-click detection
      clickTimeout = setTimeout(() => {
        this.selection.toggle(personId, circle, group);
        this.onSelectionChange?.();
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

    // Mobile touch events with optimized double-tap detection
    let touchStartTime = 0;
    let hasTouchMoved = false;
    let touchStartPos = { x: 0, y: 0 };
    let isDragging = false;

    circle.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const now = Date.now();
      const touch = e.touches[0];
      const currentPos = { x: touch.clientX, y: touch.clientY };
      
      touchStartTime = now;
      hasTouchMoved = false;
      touchStartPos = currentPos;
      isDragging = false;
      
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
      // Track movement to distinguish between tap and drag
      const touch = e.touches[0];
      const currentPos = { x: touch.clientX, y: touch.clientY };
      const distance = Math.sqrt(
        Math.pow(currentPos.x - touchStartPos.x, 2) + 
        Math.pow(currentPos.y - touchStartPos.y, 2)
      );
      
      if (distance > 8) { // 8px threshold for considering it a move/drag
        hasTouchMoved = true;
        isDragging = true;
      }
    }, { passive: false });

    circle.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const now = Date.now();
      const touchDuration = now - touchStartTime;
      
      // Only process as tap if it wasn't a drag and was short duration
      if (!hasTouchMoved && !isDragging && touchDuration < 500 && tapCount === 1) {
        // Set a timeout for single-tap action (selection)
        // This will be cancelled if a second tap comes within the double-tap delay
        clickTimeout = setTimeout(() => {
          if (tapCount === 1) {
            console.log('Single-tap on circle:', personId);
            this.selection.toggle(personId, circle, group);
            this.onSelectionChange?.();
            tapCount = 0;
          }
        }, this.DOUBLE_TAP_DELAY);
      } else if (isDragging || hasTouchMoved) {
        // This was a drag, reset tap count
        tapCount = 0;
        lastTapTime = 0;
      }
      
      // Reset state
      isDragging = false;
      hasTouchMoved = false;
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