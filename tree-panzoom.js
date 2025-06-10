// tree-panzoom.js
// Handles canvas panning and zooming functionality - MOBILE OPTIMIZED

export class PanZoomManager {
  constructor(svg) {
    this.svg = svg;
    this.scale = 1;
    this.panX = 0;
    this.panY = 0;
    this.minScale = 0.1;
    this.maxScale = 5;
    
    // Pan state
    this.isPanning = false;
    this.startPoint = { x: 0, y: 0 };
    
    // Touch state - OPTIMIZED FOR MOBILE
    this.isTouching = false;
    this.lastTouchPos = { x: 0, y: 0 };
    this.lastTouchDistance = 0;
    this.lastTouchCenter = { x: 0, y: 0 };
    this.initialTouchDistance = 0;
    this.initialScale = 1;
    this.initialPan = { x: 0, y: 0 };
    this.touchMoved = false;
    this.touchStartTime = 0;
    
    // Performance optimization
    this.updateThrottle = null;
    this.isUpdatingTransform = false;
    
    this.setupEventListeners();
    this.setupGlobalTouchPrevention();
  }

  setupGlobalTouchPrevention() {
    // Prevent touch scrolling on the document while allowing interaction with UI elements
    document.addEventListener('touchstart', (e) => {
      const allowedElements = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'];
      const allowedClasses = ['icon-button', 'floating-btn', 'table-btn', 'connection-btn', 'select-option', 'select-input'];
      const allowedIds = ['settingsPanel', 'tableView', 'personModal', 'styleModal', 'connectionModal'];
      
      let isAllowed = allowedElements.includes(e.target.tagName) ||
                     allowedClasses.some(cls => e.target.classList.contains(cls)) ||
                     allowedIds.some(id => e.target.id === id || e.target.closest(`#${id}`)) ||
                     e.target.closest('.searchable-select') ||
                     e.target.classList.contains('person');
      
      if (!isAllowed) {
        const svgArea = document.getElementById('svgArea');
        if (svgArea && svgArea.contains(e.target)) {
          if (e.cancelable) {
            e.preventDefault();
          }
        }
      }
    }, { passive: false, capture: true });

    document.addEventListener('touchmove', (e) => {
      const allowedElements = ['INPUT', 'TEXTAREA', 'SELECT'];
      const allowedIds = ['settingsPanel', 'tableView', 'personModal', 'styleModal', 'connectionModal'];
      
      let isAllowed = allowedElements.includes(e.target.tagName) ||
                     allowedIds.some(id => e.target.id === id || e.target.closest(`#${id}`)) ||
                     e.target.closest('.searchable-select');
      
      if (!isAllowed) {
        const svgArea = document.getElementById('svgArea');
        if (svgArea && svgArea.contains(e.target)) {
          if (e.cancelable) {
            e.preventDefault();
          }
        }
      }
    }, { passive: false, capture: true });
  }

  setupEventListeners() {
    // Mouse wheel zoom
    this.svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * delta));
      
      if (newScale !== this.scale) {
        const factor = newScale / this.scale;
        this.panX = mouseX - factor * (mouseX - this.panX);
        this.panY = mouseY - factor * (mouseY - this.panY);
        this.scale = newScale;
        this.updateTransform();
        
        // Trigger grid redraw
        this.onPanZoomChange?.();
      }
    }, { passive: false });

    // Touch events - HEAVILY OPTIMIZED FOR MOBILE PERFORMANCE
    this.svg.addEventListener('touchstart', (e) => {
      // Only handle SVG background touches, not circles
      if (e.target !== this.svg && !e.target.classList.contains('grid-line')) {
        return;
      }
      
      e.preventDefault();
      e.stopPropagation();
      
      this.isTouching = true;
      this.touchMoved = false;
      this.touchStartTime = Date.now();
      
      if (e.touches.length === 1) {
        // Single finger panning
        const touch = e.touches[0];
        this.lastTouchPos = { x: touch.clientX, y: touch.clientY };
        this.isPanning = true;
        this.svg.classList.add('panning');
      } else if (e.touches.length === 2) {
        // Two finger pinch zoom
        this.isPanning = false;
        this.svg.classList.remove('panning');
        
        this.initialTouchDistance = this.getTouchDistance(e.touches);
        this.lastTouchDistance = this.initialTouchDistance;
        this.lastTouchCenter = this.getTouchCenter(e.touches);
        this.initialScale = this.scale;
        this.initialPan = { x: this.panX, y: this.panY };
      }
    }, { passive: false });

    this.svg.addEventListener('touchmove', (e) => {
      // Only handle SVG background touches, not circles
      if (e.target !== this.svg && !e.target.classList.contains('grid-line')) {
        return;
      }
      
      e.preventDefault();
      e.stopPropagation();
      
      if (!this.isTouching) return;
      
      this.touchMoved = true;
      
      if (e.touches.length === 1 && this.isPanning) {
        // Single finger panning - OPTIMIZED
        const touch = e.touches[0];
        const deltaX = touch.clientX - this.lastTouchPos.x;
        const deltaY = touch.clientY - this.lastTouchPos.y;
        
        this.panX += deltaX;
        this.panY += deltaY;
        
        this.lastTouchPos = { x: touch.clientX, y: touch.clientY };
        
        // Use throttled update for better performance
        this.throttledUpdateTransform();
      } else if (e.touches.length === 2) {
        // Two finger pinch zoom - OPTIMIZED
        const currentDistance = this.getTouchDistance(e.touches);
        const currentCenter = this.getTouchCenter(e.touches);
        
        if (this.initialTouchDistance > 0) {
          const scaleChange = currentDistance / this.initialTouchDistance;
          const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.initialScale * scaleChange));
          
          if (Math.abs(newScale - this.scale) > 0.01) { // Threshold to prevent micro-updates
            const rect = this.svg.getBoundingClientRect();
            const centerX = currentCenter.x - rect.left;
            const centerY = currentCenter.y - rect.top;
            
            const factor = newScale / this.scale;
            this.panX = centerX - factor * (centerX - this.panX);
            this.panY = centerY - factor * (centerY - this.panY);
            this.scale = newScale;
            
            this.throttledUpdateTransform();
          }
        }
        
        this.lastTouchDistance = currentDistance;
        this.lastTouchCenter = currentCenter;
      }
    }, { passive: false });

    this.svg.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (e.touches.length === 0) {
        this.isTouching = false;
        this.isPanning = false;
        this.svg.classList.remove('panning');
        
        // Final transform update
        if (this.touchMoved) {
          this.updateTransform();
          setTimeout(() => this.onPanZoomChange?.(), 50);
        }
        
        this.lastTouchDistance = 0;
        this.initialTouchDistance = 0;
        this.touchMoved = false;
      } else if (e.touches.length === 1) {
        // Switch from pinch to pan
        const touch = e.touches[0];
        this.lastTouchPos = { x: touch.clientX, y: touch.clientY };
        this.isPanning = true;
        this.svg.classList.add('panning');
      }
    }, { passive: false });

    // Prevent context menu
    this.svg.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    }, { passive: false });

    // Mouse events for desktop
    this.svg.addEventListener('mousedown', (e) => {
      if (e.target === this.svg || e.target.classList.contains('grid-line')) {
        this.isPanning = true;
        this.startPoint = { x: e.clientX - this.panX, y: e.clientY - this.panY };
        this.svg.classList.add('panning');
        e.preventDefault();
        e.stopPropagation();
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isPanning && !this.isTouching) {
        this.panX = e.clientX - this.startPoint.x;
        this.panY = e.clientY - this.startPoint.y;
        this.updateTransform();
        e.preventDefault();
      }
    });

    document.addEventListener('mouseup', (e) => {
      if (this.isPanning && !this.isTouching) {
        this.isPanning = false;
        this.svg.classList.remove('panning');
        this.onPanZoomChange?.();
        e.preventDefault();
      }
    });

    // Click handling for clearing selection
    this.svg.addEventListener('click', (e) => {
      if (e.target === this.svg || e.target.classList.contains('grid-line')) {
        if (!this.isPanning) {
          this.onBackgroundClick?.();
        }
      }
    });
  }

  // Throttled transform update for better mobile performance
  throttledUpdateTransform() {
    if (!this.isUpdatingTransform) {
      this.isUpdatingTransform = true;
      requestAnimationFrame(() => {
        this.updateTransform();
        this.isUpdatingTransform = false;
      });
    }
  }

  getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  getTouchCenter(touches) {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    };
  }

  updateTransform() {
    const mainGroup = document.getElementById('mainGroup');
    if (mainGroup) {
      mainGroup.setAttribute('transform', `translate(${this.panX}, ${this.panY}) scale(${this.scale})`);
    }
  }

  // Convert screen coordinates to SVG coordinates
  screenToSVG(screenX, screenY) {
    const rect = this.svg.getBoundingClientRect();
    const svgX = (screenX - rect.left - this.panX) / this.scale;
    const svgY = (screenY - rect.top - this.panY) / this.scale;
    return { x: svgX, y: svgY };
  }

  // Get current transform state
  getTransform() {
    return {
      panX: this.panX,
      panY: this.panY,
      scale: this.scale
    };
  }

  // Set transform state
  setTransform(panX, panY, scale) {
    this.panX = panX;
    this.panY = panY;
    this.scale = scale;
    this.updateTransform();
  }

  // Event callbacks - set by other managers
  onPanZoomChange = null;
  onBackgroundClick = null;
}