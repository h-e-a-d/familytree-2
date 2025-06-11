// canvas-renderer.js
// HTML5 Canvas-based rendering system for the family tree

export class CanvasRenderer {
  constructor(container) {
    this.container = container;
    this.canvas = null;
    this.ctx = null;
    this.dpr = window.devicePixelRatio || 1;
    
    // Scene state
    this.nodes = new Map(); // personId -> node data
    this.connections = []; // array of connection objects
    this.selectedNodes = new Set();
    
    // Camera state (pan and zoom)
    this.camera = {
      x: 0,
      y: 0,
      scale: 1
    };
    
    // Interaction state
    this.isDragging = false;
    this.isPanning = false;
    this.draggedNode = null;
    this.dragOffset = { x: 0, y: 0 };
    this.lastMousePos = { x: 0, y: 0 };
    this.hoveredNode = null;
    
    // Performance
    this.needsRedraw = true;
    this.rafId = null;
    
    // Settings
    this.settings = {
      nodeRadius: 50,
      nodeColor: '#3498db',
      selectedColor: '#e74c3c',
      strokeColor: '#2c3e50',
      strokeWidth: 2,
      fontFamily: 'Inter, sans-serif',
      nameFontSize: 11,
      dobFontSize: 10,
      nameColor: '#ffffff',
      dobColor: '#f0f0f0',
      connectionColor: '#7f8c8d',
      spouseConnectionColor: '#e74c3c',
      gridSize: 50,
      gridColor: '#f0f0f0',
      gridMajorColor: '#e0e0e0'
    };
    
    this.init();
  }

  init() {
    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.cursor = 'grab';
    this.container.appendChild(this.canvas);
    
    // Get context
    this.ctx = this.canvas.getContext('2d');
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Initial resize
    this.resize();
    
    // Start render loop
    this.startRenderLoop();
  }

  setupEventListeners() {
    // Resize
    window.addEventListener('resize', () => this.resize());
    
    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
    this.canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
    
    // Touch events
    this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
    
    // Context menu
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    
    // Scale for retina displays
    this.ctx.scale(this.dpr, this.dpr);
    
    this.needsRedraw = true;
  }

  // Convert screen coordinates to world coordinates
  screenToWorld(screenX, screenY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (screenX - rect.left - this.camera.x) / this.camera.scale;
    const y = (screenY - rect.top - this.camera.y) / this.camera.scale;
    return { x, y };
  }

  // Convert world coordinates to screen coordinates
  worldToScreen(worldX, worldY) {
    const x = worldX * this.camera.scale + this.camera.x;
    const y = worldY * this.camera.scale + this.camera.y;
    return { x, y };
  }

  // Find node at position
  getNodeAt(screenX, screenY) {
    const worldPos = this.screenToWorld(screenX, screenY);
    
    for (const [id, node] of this.nodes) {
      const dx = worldPos.x - node.x;
      const dy = worldPos.y - node.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= this.settings.nodeRadius) {
        return { id, node };
      }
    }
    
    return null;
  }

  // Add or update a node
  setNode(id, data) {
    this.nodes.set(id, {
      x: data.x || 0,
      y: data.y || 0,
      name: data.name || '',
      fatherName: data.fatherName || '',
      surname: data.surname || '',
      birthName: data.birthName || '',
      dob: data.dob || '',
      gender: data.gender || '',
      color: data.color || this.settings.nodeColor,
      radius: data.radius || this.settings.nodeRadius
    });
    
    this.needsRedraw = true;
  }

  // Remove a node
  removeNode(id) {
    this.nodes.delete(id);
    this.selectedNodes.delete(id);
    
    // Remove connections involving this node
    this.connections = this.connections.filter(conn => 
      conn.from !== id && conn.to !== id
    );
    
    this.needsRedraw = true;
  }

  // Add a connection
  addConnection(from, to, type = 'parent') {
    this.connections.push({ from, to, type });
    this.needsRedraw = true;
  }

  // Clear all connections
  clearConnections() {
    this.connections = [];
    this.needsRedraw = true;
  }

  // Mouse event handlers
  handleMouseDown(e) {
    const pos = { x: e.clientX, y: e.clientY };
    this.lastMousePos = pos;
    
    const hit = this.getNodeAt(pos.x, pos.y);
    
    if (hit) {
      // Start dragging node
      this.isDragging = true;
      this.draggedNode = hit;
      const worldPos = this.screenToWorld(pos.x, pos.y);
      this.dragOffset = {
        x: worldPos.x - hit.node.x,
        y: worldPos.y - hit.node.y
      };
      
      // Handle selection
      if (!e.shiftKey && !e.ctrlKey) {
        this.selectedNodes.clear();
      }
      
      if (this.selectedNodes.has(hit.id)) {
        this.selectedNodes.delete(hit.id);
      } else {
        this.selectedNodes.add(hit.id);
      }
      
      this.canvas.style.cursor = 'grabbing';
      
      // Callback
      this.onNodeClick?.(hit.id, e);
    } else {
      // Start panning
      this.isPanning = true;
      this.canvas.style.cursor = 'grabbing';
      
      // Clear selection if not holding shift
      if (!e.shiftKey) {
        this.selectedNodes.clear();
      }
    }
    
    this.needsRedraw = true;
  }

  handleMouseMove(e) {
    const pos = { x: e.clientX, y: e.clientY };
    const dx = pos.x - this.lastMousePos.x;
    const dy = pos.y - this.lastMousePos.y;
    
    if (this.isDragging && this.draggedNode) {
      // Move dragged node
      const worldPos = this.screenToWorld(pos.x, pos.y);
      this.draggedNode.node.x = worldPos.x - this.dragOffset.x;
      this.draggedNode.node.y = worldPos.y - this.dragOffset.y;
      this.needsRedraw = true;
    } else if (this.isPanning) {
      // Pan camera
      this.camera.x += dx;
      this.camera.y += dy;
      this.needsRedraw = true;
    } else {
      // Check hover
      const hit = this.getNodeAt(pos.x, pos.y);
      if (hit !== this.hoveredNode) {
        this.hoveredNode = hit;
        this.canvas.style.cursor = hit ? 'pointer' : 'grab';
        this.needsRedraw = true;
      }
    }
    
    this.lastMousePos = pos;
  }

  handleMouseUp(e) {
    if (this.isDragging) {
      this.onNodeDragEnd?.(this.draggedNode.id);
    }
    
    this.isDragging = false;
    this.isPanning = false;
    this.draggedNode = null;
    this.canvas.style.cursor = this.hoveredNode ? 'pointer' : 'grab';
  }

  handleWheel(e) {
    e.preventDefault();
    
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate zoom
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(5, this.camera.scale * delta));
    
    if (newScale !== this.camera.scale) {
      // Zoom towards mouse position
      const factor = newScale / this.camera.scale;
      this.camera.x = mouseX - factor * (mouseX - this.camera.x);
      this.camera.y = mouseY - factor * (mouseY - this.camera.y);
      this.camera.scale = newScale;
      this.needsRedraw = true;
    }
  }

  handleDoubleClick(e) {
    const hit = this.getNodeAt(e.clientX, e.clientY);
    if (hit) {
      this.onNodeDoubleClick?.(hit.id);
    }
  }

  // Touch event handlers
  handleTouchStart(e) {
    e.preventDefault();
    
    if (e.touches.length === 1) {
      // Single touch - simulate mouse down
      const touch = e.touches[0];
      this.handleMouseDown({
        clientX: touch.clientX,
        clientY: touch.clientY,
        shiftKey: false,
        ctrlKey: false
      });
    } else if (e.touches.length === 2) {
      // Two finger touch - prepare for pinch zoom
      this.isDragging = false;
      this.isPanning = false;
      this.lastTouchDistance = this.getTouchDistance(e.touches);
    }
  }

  handleTouchMove(e) {
    e.preventDefault();
    
    if (e.touches.length === 1 && (this.isDragging || this.isPanning)) {
      // Single touch - simulate mouse move
      const touch = e.touches[0];
      this.handleMouseMove({
        clientX: touch.clientX,
        clientY: touch.clientY
      });
    } else if (e.touches.length === 2) {
      // Pinch zoom
      const distance = this.getTouchDistance(e.touches);
      const scale = distance / this.lastTouchDistance;
      
      if (scale !== 1) {
        const center = this.getTouchCenter(e.touches);
        const rect = this.canvas.getBoundingClientRect();
        const centerX = center.x - rect.left;
        const centerY = center.y - rect.top;
        
        const newScale = Math.max(0.1, Math.min(5, this.camera.scale * scale));
        const factor = newScale / this.camera.scale;
        
        this.camera.x = centerX - factor * (centerX - this.camera.x);
        this.camera.y = centerY - factor * (centerY - this.camera.y);
        this.camera.scale = newScale;
        
        this.lastTouchDistance = distance;
        this.needsRedraw = true;
      }
    }
  }

  handleTouchEnd(e) {
    e.preventDefault();
    this.handleMouseUp({});
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

  // Rendering
  startRenderLoop() {
    const render = () => {
      if (this.needsRedraw) {
        this.draw();
        this.needsRedraw = false;
      }
      this.rafId = requestAnimationFrame(render);
    };
    render();
  }

  draw() {
    const ctx = this.ctx;
    const width = this.canvas.width / this.dpr;
    const height = this.canvas.height / this.dpr;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Save state
    ctx.save();
    
    // Apply camera transform
    ctx.translate(this.camera.x, this.camera.y);
    ctx.scale(this.camera.scale, this.camera.scale);
    
    // Draw grid
    this.drawGrid(ctx, width, height);
    
    // Draw connections
    this.drawConnections(ctx);
    
    // Draw nodes
    this.drawNodes(ctx);
    
    // Restore state
    ctx.restore();
  }

  drawGrid(ctx, width, height) {
    const gridSize = this.settings.gridSize;
    const scale = this.camera.scale;
    const offsetX = -this.camera.x / scale;
    const offsetY = -this.camera.y / scale;
    
    const startX = Math.floor(offsetX / gridSize) * gridSize;
    const startY = Math.floor(offsetY / gridSize) * gridSize;
    const endX = offsetX + width / scale;
    const endY = offsetY + height / scale;
    
    ctx.strokeStyle = this.settings.gridColor;
    ctx.lineWidth = 1 / scale;
    
    // Vertical lines
    for (let x = startX; x <= endX; x += gridSize) {
      const isMajor = x % (gridSize * 4) === 0;
      ctx.strokeStyle = isMajor ? this.settings.gridMajorColor : this.settings.gridColor;
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = startY; y <= endY; y += gridSize) {
      const isMajor = y % (gridSize * 4) === 0;
      ctx.strokeStyle = isMajor ? this.settings.gridMajorColor : this.settings.gridColor;
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }
  }

  drawConnections(ctx) {
    ctx.lineWidth = 2;
    
    for (const conn of this.connections) {
      const fromNode = this.nodes.get(conn.from);
      const toNode = this.nodes.get(conn.to);
      
      if (!fromNode || !toNode) continue;
      
      ctx.strokeStyle = conn.type === 'spouse' 
        ? this.settings.spouseConnectionColor 
        : this.settings.connectionColor;
      
      if (conn.type === 'spouse') {
        ctx.setLineDash([4, 2]);
      }
      
      ctx.beginPath();
      ctx.moveTo(fromNode.x, fromNode.y);
      ctx.lineTo(toNode.x, toNode.y);
      ctx.stroke();
      
      ctx.setLineDash([]);
    }
  }

  drawNodes(ctx) {
    for (const [id, node] of this.nodes) {
      const isSelected = this.selectedNodes.has(id);
      const isHovered = this.hoveredNode && this.hoveredNode.id === id;
      
      // Draw shadow
      if (isSelected || isHovered) {
        ctx.save();
        ctx.shadowColor = isSelected ? this.settings.selectedColor : 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = isSelected ? 12 : 8;
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      
      // Draw circle
      ctx.fillStyle = node.color;
      ctx.strokeStyle = isSelected ? this.settings.selectedColor : this.settings.strokeColor;
      ctx.lineWidth = isSelected ? 4 : this.settings.strokeWidth;
      
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Draw text
      this.drawNodeText(ctx, node);
    }
  }

  drawNodeText(ctx, node) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Build name text
    let fullName = node.name;
    if (node.fatherName) fullName += ` ${node.fatherName}`;
    if (node.surname) fullName += ` ${node.surname}`;
    
    // Draw name
    ctx.font = `600 ${this.settings.nameFontSize}px ${this.settings.fontFamily}`;
    ctx.fillStyle = this.settings.nameColor;
    
    const lines = this.wrapText(ctx, fullName, node.radius * 1.8);
    let y = node.y - (lines.length - 1) * 6;
    
    for (const line of lines) {
      ctx.fillText(line, node.x, y);
      y += 12;
    }
    
    // Draw birth name if different
    if (node.birthName && node.birthName !== node.surname) {
      ctx.font = `italic ${this.settings.dobFontSize}px ${this.settings.fontFamily}`;
      ctx.fillStyle = this.settings.nameColor;
      ctx.fillText(`(${node.birthName})`, node.x, y);
      y += 10;
    }
    
    // Draw DOB
    if (node.dob) {
      ctx.font = `${this.settings.dobFontSize}px ${this.settings.fontFamily}`;
      ctx.fillStyle = this.settings.dobColor;
      ctx.fillText(node.dob, node.x, y + 5);
    }
  }

  wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  }

  // Public methods for external control
  setCamera(x, y, scale) {
    this.camera.x = x;
    this.camera.y = y;
    this.camera.scale = scale;
    this.needsRedraw = true;
  }

  getCamera() {
    return { ...this.camera };
  }

  getSelectedNodes() {
    return new Set(this.selectedNodes);
  }

  clearSelection() {
    this.selectedNodes.clear();
    this.needsRedraw = true;
  }

  // Event callbacks
  onNodeClick = null;
  onNodeDoubleClick = null;
  onNodeDragEnd = null;

  // Cleanup
  destroy() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    this.canvas.remove();
  }
}