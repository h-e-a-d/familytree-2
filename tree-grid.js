// tree-grid.js
// Handles background grid drawing with performance optimization

export class GridManager {
  constructor(svg, panZoom) {
    this.svg = svg;
    this.panZoom = panZoom;
    this.gridSize = 50;
    
    // Performance optimization
    this.gridRedrawTimeout = null;
    this.lastGridRedraw = 0;
    this.redrawThrottle = 100; // milliseconds
    
    // Setup pan/zoom callback
    this.panZoom.onPanZoomChange = () => this.throttledRedraw();
  }

  draw() {
    if (!this.svg) return;

    // Remove existing grid
    this.svg.querySelectorAll('.grid-line').forEach(line => line.remove());

    const transform = this.panZoom.getTransform();
    const rect = this.svg.getBoundingClientRect();
    const viewportWidth = rect.width;
    const viewportHeight = rect.height;

    // Calculate the visible area considering pan and zoom
    const visibleLeft = (-transform.panX) / transform.scale;
    const visibleTop = (-transform.panY) / transform.scale;
    const visibleWidth = viewportWidth / transform.scale;
    const visibleHeight = viewportHeight / transform.scale;

    // Extend grid well beyond visible area for smooth panning
    const padding = this.gridSize * 20;
    const gridLeft = Math.floor((visibleLeft - padding) / this.gridSize) * this.gridSize;
    const gridTop = Math.floor((visibleTop - padding) / this.gridSize) * this.gridSize;
    const gridRight = Math.ceil((visibleLeft + visibleWidth + padding) / this.gridSize) * this.gridSize;
    const gridBottom = Math.ceil((visibleTop + visibleHeight + padding) / this.gridSize) * this.gridSize;

    // Ensure minimum grid coverage
    const minGridWidth = Math.max(gridRight - gridLeft, viewportWidth * 3 / transform.scale);
    const minGridHeight = Math.max(gridBottom - gridTop, viewportHeight * 3 / transform.scale);
    
    const finalGridRight = Math.max(gridRight, gridLeft + minGridWidth);
    const finalGridBottom = Math.max(gridBottom, gridTop + minGridHeight);

    // Create grid group
    const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gridGroup.id = 'gridGroup';

    // Vertical lines
    for (let x = gridLeft; x <= finalGridRight; x += this.gridSize) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.classList.add('grid-line');
      if (x % (this.gridSize * 4) === 0) line.classList.add('major');
      line.setAttribute('x1', x);
      line.setAttribute('y1', gridTop);
      line.setAttribute('x2', x);
      line.setAttribute('y2', finalGridBottom);
      gridGroup.appendChild(line);
    }

    // Horizontal lines
    for (let y = gridTop; y <= finalGridBottom; y += this.gridSize) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.classList.add('grid-line');
      if (y % (this.gridSize * 4) === 0) line.classList.add('major');
      line.setAttribute('x1', gridLeft);
      line.setAttribute('y1', y);
      line.setAttribute('x2', finalGridRight);
      line.setAttribute('y2', y);
      gridGroup.appendChild(line);
    }

    // Insert grid as first child so it appears behind everything
    const mainGroup = document.getElementById('mainGroup');
    if (mainGroup) {
      mainGroup.insertBefore(gridGroup, mainGroup.firstChild);
    } else {
      this.svg.insertBefore(gridGroup, this.svg.firstChild);
    }
  }

  throttledRedraw() {
    const now = Date.now();
    
    if (this.gridRedrawTimeout) {
      clearTimeout(this.gridRedrawTimeout);
    }
    
    if (now - this.lastGridRedraw > this.redrawThrottle) {
      this.draw();
      this.lastGridRedraw = now;
    } else {
      this.gridRedrawTimeout = setTimeout(() => {
        this.draw();
        this.lastGridRedraw = Date.now();
      }, this.redrawThrottle);
    }
  }

  setGridSize(size) {
    this.gridSize = size;
    this.draw();
  }

  getGridSize() {
    return this.gridSize;
  }
}