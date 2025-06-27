// canvas-renderer.js - Enhanced with improved export functionality and double-tap detection

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
    this.mouseDownPos = null;
    this.hasDraggedSignificantly = false;
    this.hoveredNode = null;
    
    // Double-tap detection for mobile
    this.lastTapTime = 0;
    this.lastTapPosition = { x: 0, y: 0 };
    this.doubleTapThreshold = 300; // ms
    this.doubleTapDistance = 50; // pixels
    
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
      gridMajorColor: '#e0e0e0',
      nodeStyle: 'circle', // 'circle' or 'rectangle'
      
      // Node outline settings
      showNodeOutline: true,
      outlineColor: '#2c3e50',
      outlineThickness: 2,
      
      // Line style settings
      familyLineStyle: 'solid',
      familyLineThickness: 2,
      familyLineColor: '#7f8c8d',
      
      spouseLineStyle: 'dashed',
      spouseLineThickness: 2,
      spouseLineColor: '#e74c3c',
      
      lineOnlyStyle: 'dash-dot',
      lineOnlyThickness: 2,
      lineOnlyColor: '#9b59b6'
    };
    
    // Display preferences
    this.displayPreferences = {
      showMaidenName: true,
      showDateOfBirth: true,
      showFatherName: true
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

  // Calculate bounding box of all nodes and connections (for export)
  getContentBounds() {
    if (this.nodes.size === 0) {
      return null;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    // Check all nodes
    for (const [id, node] of this.nodes) {
      if (this.settings.nodeStyle === 'rectangle') {
        const width = this.getNodeWidth(node);
        const height = this.getNodeHeight(node);
        
        minX = Math.min(minX, node.x - width/2);
        minY = Math.min(minY, node.y - height/2);
        maxX = Math.max(maxX, node.x + width/2);
        maxY = Math.max(maxY, node.y + height/2);
      } else {
        const radius = node.radius || this.settings.nodeRadius;
        
        minX = Math.min(minX, node.x - radius);
        minY = Math.min(minY, node.y - radius);
        maxX = Math.max(maxX, node.x + radius);
        maxY = Math.max(maxY, node.y + radius);
      }
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  // Export canvas as image without grid and with proper bounds
  exportAsImage(format = 'png') {
    const bounds = this.getContentBounds();
    if (!bounds) {
      throw new Error('No content to export');
    }

    // Add 10px margin/padding as requested
    const margin = 10;
    const exportWidth = bounds.width + (margin * 2);
    const exportHeight = bounds.height + (margin * 2);

    // Create export canvas
    const exportCanvas = document.createElement('canvas');
    const exportCtx = exportCanvas.getContext('2d');
    
    // Set canvas size (use higher resolution for better quality)
    const scale = 2;
    exportCanvas.width = exportWidth * scale;
    exportCanvas.height = exportHeight * scale;
    exportCtx.scale(scale, scale);

    // Only fill background for formats that need it (not PNG when transparent requested)
    if (format !== 'png-transparent') {
      exportCtx.fillStyle = '#ffffff';
      exportCtx.fillRect(0, 0, exportWidth, exportHeight);
    }

    // Save current state
    exportCtx.save();

    // Translate to account for bounds and margin
    exportCtx.translate(margin - bounds.x, margin - bounds.y);

    // Draw only nodes and connections (no grid)
    this.drawConnectionsOnly(exportCtx);
    this.drawNodesOnly(exportCtx);

    // Restore state
    exportCtx.restore();

    return exportCanvas;
  }

  // Export as PNG without background (transparent)
  exportAsPNGTransparent() {
    return this.exportAsImage('png-transparent');
  }

  // Export as JPEG with background
  exportAsJPEG() {
    return this.exportAsImage('jpeg');
  }

  // Draw only connections (for export)
  drawConnectionsOnly(ctx) {
    ctx.lineWidth = 2;
    
    for (const conn of this.connections) {
      const fromNode = this.nodes.get(conn.from);
      const toNode = this.nodes.get(conn.to);
      
      if (!fromNode || !toNode) continue;
      
      if (conn.type === 'spouse') {
        ctx.strokeStyle = this.settings.spouseConnectionColor;
        ctx.setLineDash([4, 2]);
      } else if (conn.type === 'line-only') {
        ctx.strokeStyle = '#9b59b6';
        ctx.setLineDash([8, 4, 2, 4]);
      } else {
        ctx.strokeStyle = this.settings.connectionColor;
        ctx.setLineDash([]);
      }
      
      ctx.beginPath();
      ctx.moveTo(fromNode.x, fromNode.y);
      ctx.lineTo(toNode.x, toNode.y);
      ctx.stroke();
      
      ctx.setLineDash([]);
    }
  }

  // Draw only nodes (for export)
  drawNodesOnly(ctx) {
    for (const [id, node] of this.nodes) {
      if (this.settings.nodeStyle === 'rectangle') {
        this.drawRectangleNodeExport(ctx, id, node);
      } else {
        this.drawCircleNodeExport(ctx, id, node);
      }
    }
  }

  // Draw circle node for export (no selection states)
  drawCircleNodeExport(ctx, id, node) {
    const radius = node.radius || this.settings.nodeRadius;
    
    // Draw circle
    ctx.fillStyle = node.color || this.settings.nodeColor;
    ctx.strokeStyle = this.settings.strokeColor;
    ctx.lineWidth = this.settings.strokeWidth;
    
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Draw text
    this.drawNodeText(ctx, node, radius * 1.8);
  }

  // Draw rectangle node for export (no selection states)
  drawRectangleNodeExport(ctx, id, node) {
    const width = this.getNodeWidth(node);
    const height = this.getNodeHeight(node);
    
    // Draw rectangle
    ctx.fillStyle = node.color || this.settings.nodeColor;
    ctx.strokeStyle = this.settings.strokeColor;
    ctx.lineWidth = this.settings.strokeWidth;
    
    ctx.fillRect(node.x - width/2, node.y - height/2, width, height);
    ctx.strokeRect(node.x - width/2, node.y - height/2, width, height);
    
    // Draw text
    this.drawNodeText(ctx, node, width - 20);
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

  // Find node at position (supports both circle and rectangle)
  getNodeAt(screenX, screenY) {
    const worldPos = this.screenToWorld(screenX, screenY);
    
    for (const [id, node] of this.nodes) {
      if (this.settings.nodeStyle === 'rectangle') {
        // Rectangle hit testing
        const width = this.getNodeWidth(node);
        const height = this.getNodeHeight(node);
        
        if (worldPos.x >= node.x - width/2 && 
            worldPos.x <= node.x + width/2 &&
            worldPos.y >= node.y - height/2 && 
            worldPos.y <= node.y + height/2) {
          return { id, node };
        }
      } else {
        // Circle hit testing
        const dx = worldPos.x - node.x;
        const dy = worldPos.y - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= (node.radius || this.settings.nodeRadius)) {
          return { id, node };
        }
      }
    }
    
    return null;
  }

  // Calculate node width for rectangle style
  getNodeWidth(node) {
    // Base width on the longest text line
    const ctx = this.ctx;
    ctx.font = `600 ${this.settings.nameFontSize}px ${this.settings.fontFamily}`;
    
    let maxWidth = 60; // Minimum width
    
    // Check name width
    const fullName = this.buildFullName(node);
    if (fullName) {
      const nameWidth = ctx.measureText(fullName).width;
      maxWidth = Math.max(maxWidth, nameWidth + 20); // Add padding
    }
    
    // Check maiden name width
    if (this.displayPreferences.showMaidenName && node.maidenName && node.maidenName !== node.surname) {
      const maidenWidth = ctx.measureText(`(${node.maidenName})`).width;
      maxWidth = Math.max(maxWidth, maidenWidth + 20);
    }
    
    // Check DOB width
    if (this.displayPreferences.showDateOfBirth && node.dob) {
      const dobWidth = ctx.measureText(node.dob).width;
      maxWidth = Math.max(maxWidth, dobWidth + 20);
    }
    
    return Math.min(maxWidth, 200); // Cap at reasonable maximum
  }

  // Calculate node height for rectangle style
  getNodeHeight(node) {
    let lines = 0;
    
    // Name lines
    const fullName = this.buildFullName(node);
    if (fullName) {
      const nameLines = this.wrapText(this.ctx, fullName, this.getNodeWidth(node) - 20);
      lines += nameLines.length;
    }
    
    // Maiden name line
    if (this.displayPreferences.showMaidenName && node.maidenName && node.maidenName !== node.surname) {
      lines += 1;
    }
    
    // DOB line
    if (this.displayPreferences.showDateOfBirth && node.dob) {
      lines += 1;
    }
    
    return Math.max(40, lines * 16 + 20); // Base height + line spacing + padding
  }

  // Build full name based on display preferences (FIXED)
  buildFullName(node) {
    let fullName = node.name || '';
    
    // Add father's name if preference is enabled and it exists
    if (this.displayPreferences.showFatherName && node.fatherName) {
      fullName += ` ${node.fatherName}`;
    }
    
    // Add surname if it exists
    if (node.surname) {
      fullName += ` ${node.surname}`;
    }
    
    return fullName.trim();
  }

  // Find connection line at position
  getConnectionAt(screenX, screenY) {
    const worldPos = this.screenToWorld(screenX, screenY);
    const threshold = 8;
    
    for (let i = 0; i < this.connections.length; i++) {
      const conn = this.connections[i];
      const fromNode = this.nodes.get(conn.from);
      const toNode = this.nodes.get(conn.to);
      
      if (!fromNode || !toNode) continue;
      
      const distance = this.distanceToLineSegment(
        worldPos.x, worldPos.y,
        fromNode.x, fromNode.y,
        toNode.x, toNode.y
      );
      
      if (distance <= threshold) {
        return { index: i, connection: conn };
      }
    }
    
    return null;
  }

  // Calculate distance from point to line segment
  distanceToLineSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) {
      const dpx = px - x1;
      const dpy = py - y1;
      return Math.sqrt(dpx * dpx + dpy * dpy);
    }
    
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (length * length)));
    
    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;
    
    const distX = px - closestX;
    const distY = py - closestY;
    return Math.sqrt(distX * distX + distY * distY);
  }

  // Add or update a node - preserve existing data
  setNode(id, data) {
    const existingNode = this.nodes.get(id);
    const nodeData = {
      // Preserve existing data
      ...(existingNode || {}),
      // Apply new data
      ...data,
      // Ensure required fields have defaults
      x: data.x !== undefined ? data.x : (existingNode?.x || 0),
      y: data.y !== undefined ? data.y : (existingNode?.y || 0),
      name: data.name !== undefined ? data.name : (existingNode?.name || ''),
      fatherName: data.fatherName !== undefined ? data.fatherName : (existingNode?.fatherName || ''),
      surname: data.surname !== undefined ? data.surname : (existingNode?.surname || ''),
      maidenName: data.maidenName !== undefined ? data.maidenName : (existingNode?.maidenName || ''),
      dob: data.dob !== undefined ? data.dob : (existingNode?.dob || ''),
      gender: data.gender !== undefined ? data.gender : (existingNode?.gender || ''),
      color: data.color !== undefined ? data.color : (existingNode?.color || this.settings.nodeColor),
      radius: data.radius !== undefined ? data.radius : (existingNode?.radius || this.settings.nodeRadius)
    };
    
    this.nodes.set(id, nodeData);
    this.needsRedraw = true;
  }

  // Update node properties without replacing the entire node
  updateNodeStyle(id, styleData) {
    const node = this.nodes.get(id);
    if (node) {
      if (styleData.color !== undefined) node.color = styleData.color;
      if (styleData.radius !== undefined) node.radius = styleData.radius;
      this.needsRedraw = true;
    }
  }

  // Update display preferences (FIXED)
  updateDisplayPreferences(preferences) {
    devLog('Canvas renderer updating display preferences:', preferences);
    this.displayPreferences = { ...preferences };
    this.needsRedraw = true;
  }

  // Update node style (circle or rectangle) (FIXED)
  setNodeStyle(style) {
    devLog('Canvas renderer setting node style to:', style);
    this.settings.nodeStyle = style;
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

  // Remove a specific connection by index
  removeConnection(index) {
    if (index >= 0 && index < this.connections.length) {
      this.connections.splice(index, 1);
      this.needsRedraw = true;
    }
  }

  // Remove connection by from/to IDs
  removeConnectionByIds(fromId, toId) {
    this.connections = this.connections.filter(conn => 
      !(conn.from === fromId && conn.to === toId) && 
      !(conn.from === toId && conn.to === fromId)
    );
    this.needsRedraw = true;
  }

  // Mouse event handlers
  handleMouseDown(e) {
    const pos = { x: e.clientX, y: e.clientY };
    this.lastMousePos = pos;
    this.mouseDownPos = pos;
    this.hasDraggedSignificantly = false;
    
    const hit = this.getNodeAt(pos.x, pos.y);
    
    if (hit) {
      this.draggedNode = hit;
      const worldPos = this.screenToWorld(pos.x, pos.y);
      this.dragOffset = {
        x: worldPos.x - hit.node.x,
        y: worldPos.y - hit.node.y
      };
      
      this.canvas.style.cursor = 'grabbing';
    } else {
      this.isPanning = true;
      this.canvas.style.cursor = 'grabbing';
    }
    
    this.needsRedraw = true;
  }

  handleMouseMove(e) {
    const pos = { x: e.clientX, y: e.clientY };
    const dx = pos.x - this.lastMousePos.x;
    const dy = pos.y - this.lastMousePos.y;
    
    if (this.mouseDownPos) {
      const totalDx = pos.x - this.mouseDownPos.x;
      const totalDy = pos.y - this.mouseDownPos.y;
      const totalDistance = Math.sqrt(totalDx * totalDx + totalDy * totalDy);
      
      if (totalDistance > 5) {
        this.hasDraggedSignificantly = true;
      }
    }
    
    if (this.draggedNode && this.hasDraggedSignificantly) {
      if (!this.isDragging) {
        this.isDragging = true;
      }
      
      const worldPos = this.screenToWorld(pos.x, pos.y);
      this.draggedNode.node.x = worldPos.x - this.dragOffset.x;
      this.draggedNode.node.y = worldPos.y - this.dragOffset.y;
      this.needsRedraw = true;
    } else if (this.isPanning) {
      this.camera.x += dx;
      this.camera.y += dy;
      this.needsRedraw = true;
    } else {
      if (!this.draggedNode) {
        const hit = this.getNodeAt(pos.x, pos.y);
        if (hit !== this.hoveredNode) {
          this.hoveredNode = hit;
          
          const connectionHit = this.getConnectionAt(pos.x, pos.y);
          
          if (hit) {
            this.canvas.style.cursor = 'pointer';
          } else if (connectionHit) {
            this.canvas.style.cursor = 'pointer';
          } else {
            this.canvas.style.cursor = 'grab';
          }
          
          this.needsRedraw = true;
        }
      }
    }
    
    this.lastMousePos = pos;
  }

  handleMouseUp(e) {
    const pos = { x: e.clientX, y: e.clientY };
    const hit = this.getNodeAt(pos.x, pos.y);
    
    if (hit && !this.hasDraggedSignificantly) {
      if (this.selectedNodes.has(hit.id)) {
        this.selectedNodes.delete(hit.id);
      } else {
        this.selectedNodes.add(hit.id);
      }
      
      this.onNodeClick?.(hit.id, e);
      this.needsRedraw = true;
    } else if (!hit && !this.hasDraggedSignificantly) {
      const connectionHit = this.getConnectionAt(pos.x, pos.y);
      
      if (connectionHit) {
        this.onConnectionClick?.(connectionHit.connection, connectionHit.index);
      } else {
        this.selectedNodes.clear();
        this.onSelectionCleared?.();
        this.needsRedraw = true;
      }
    }
    
    if (this.isDragging && this.draggedNode) {
      this.onNodeDragEnd?.(this.draggedNode.id);
    }
    
    this.isDragging = false;
    this.isPanning = false;
    this.draggedNode = null;
    this.mouseDownPos = null;
    this.hasDraggedSignificantly = false;
    this.canvas.style.cursor = this.hoveredNode ? 'pointer' : 'grab';
  }

  handleWheel(e) {
    e.preventDefault();
    
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(5, this.camera.scale * delta));
    
    if (newScale !== this.camera.scale) {
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

  // Touch event handlers with enhanced double-tap detection
  handleTouchStart(e) {
    if (e.cancelable) {
      e.preventDefault();
    }
    
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const pos = { x: touch.clientX, y: touch.clientY };
      this.lastMousePos = pos;
      this.mouseDownPos = pos;
      this.hasDraggedSignificantly = false;
      
      const hit = this.getNodeAt(pos.x, pos.y);
      
      if (hit) {
        this.draggedNode = hit;
        const worldPos = this.screenToWorld(pos.x, pos.y);
        this.dragOffset = {
          x: worldPos.x - hit.node.x,
          y: worldPos.y - hit.node.y
        };
      } else {
        this.isPanning = true;
      }
    } else if (e.touches.length === 2) {
      this.isDragging = false;
      this.isPanning = false;
      this.draggedNode = null;
      this.lastTouchDistance = this.getTouchDistance(e.touches);
    }
  }

  handleTouchMove(e) {
    if (e.cancelable) {
      e.preventDefault();
    }
    
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const pos = { x: touch.clientX, y: touch.clientY };
      const dx = pos.x - this.lastMousePos.x;
      const dy = pos.y - this.lastMousePos.y;
      
      if (this.mouseDownPos) {
        const totalDx = pos.x - this.mouseDownPos.x;
        const totalDy = pos.y - this.mouseDownPos.y;
        const totalDistance = Math.sqrt(totalDx * totalDx + totalDy * totalDy);
        
        if (totalDistance > 8) {
          this.hasDraggedSignificantly = true;
        }
      }
      
      if (this.draggedNode && this.hasDraggedSignificantly) {
        if (!this.isDragging) {
          this.isDragging = true;
        }
        
        const worldPos = this.screenToWorld(pos.x, pos.y);
        this.draggedNode.node.x = worldPos.x - this.dragOffset.x;
        this.draggedNode.node.y = worldPos.y - this.dragOffset.y;
        this.needsRedraw = true;
      } else if (this.isPanning && this.hasDraggedSignificantly) {
        this.camera.x += dx;
        this.camera.y += dy;
        this.needsRedraw = true;
      }
      
      this.lastMousePos = pos;
    } else if (e.touches.length === 2) {
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

  // Enhanced handleTouchEnd with improved double-tap detection
  handleTouchEnd(e) {
    if (e.cancelable) {
      e.preventDefault();
    }
    
    if (e.touches.length === 0) {
      const lastTouchPos = this.lastMousePos;
      const hit = this.getNodeAt(lastTouchPos.x, lastTouchPos.y);
      
      if (hit && !this.hasDraggedSignificantly) {
        const currentTime = Date.now();
        const timeDiff = currentTime - this.lastTapTime;
        const distance = Math.sqrt(
          Math.pow(lastTouchPos.x - this.lastTapPosition.x, 2) + 
          Math.pow(lastTouchPos.y - this.lastTapPosition.y, 2)
        );
        
        // Check for double-tap
        if (timeDiff < this.doubleTapThreshold && distance < this.doubleTapDistance && this.lastTapTime > 0) {
          // Double-tap detected - trigger edit modal
          devLog('Double-tap detected on node:', hit.id);
          this.onNodeDoubleClick?.(hit.id);
          this.lastTapTime = 0; // Reset to prevent triple-tap
        } else {
          // Single tap - handle selection
          if (this.selectedNodes.has(hit.id)) {
            this.selectedNodes.delete(hit.id);
          } else {
            this.selectedNodes.add(hit.id);
          }
          
          this.onNodeClick?.(hit.id, { clientX: lastTouchPos.x, clientY: lastTouchPos.y });
          this.needsRedraw = true;
          
          // Store tap info for double-tap detection
          this.lastTapTime = currentTime;
          this.lastTapPosition = { x: lastTouchPos.x, y: lastTouchPos.y };
        }
      } else if (!hit && !this.hasDraggedSignificantly) {
        const connectionHit = this.getConnectionAt(lastTouchPos.x, lastTouchPos.y);
        
        if (connectionHit) {
          this.onConnectionClick?.(connectionHit.connection, connectionHit.index);
        } else {
          this.selectedNodes.clear();
          this.onSelectionCleared?.();
          this.needsRedraw = true;
        }
        
        // Reset double-tap detection for background taps
        this.lastTapTime = 0;
      } else {
        // If we dragged significantly, don't update tap detection
        // but still reset if enough time has passed
        const currentTime = Date.now();
        if (currentTime - this.lastTapTime > this.doubleTapThreshold) {
          this.lastTapTime = 0;
        }
      }
      
      if (this.isDragging && this.draggedNode) {
        this.onNodeDragEnd?.(this.draggedNode.id);
      }
      
      this.isDragging = false;
      this.isPanning = false;
      this.draggedNode = null;
      this.mouseDownPos = null;
      this.hasDraggedSignificantly = false;
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
    for (const conn of this.connections) {
      const fromNode = this.nodes.get(conn.from);
      const toNode = this.nodes.get(conn.to);
      
      if (!fromNode || !toNode) continue;
      
      // Set line properties based on connection type
      if (conn.type === 'spouse') {
        ctx.strokeStyle = this.settings.spouseLineColor;
        ctx.lineWidth = this.settings.spouseLineThickness;
        this.setLineDash(ctx, this.settings.spouseLineStyle);
      } else if (conn.type === 'line-only') {
        ctx.strokeStyle = this.settings.lineOnlyColor;
        ctx.lineWidth = this.settings.lineOnlyThickness;
        this.setLineDash(ctx, this.settings.lineOnlyStyle);
      } else {
        // Family connections (parent-child)
        ctx.strokeStyle = this.settings.familyLineColor;
        ctx.lineWidth = this.settings.familyLineThickness;
        this.setLineDash(ctx, this.settings.familyLineStyle);
      }
      
      ctx.beginPath();
      ctx.moveTo(fromNode.x, fromNode.y);
      ctx.lineTo(toNode.x, toNode.y);
      ctx.stroke();
    }
    
    // Reset line dash
    ctx.setLineDash([]);
  }

  // Helper method to set line dash pattern
  setLineDash(ctx, style) {
    switch (style) {
      case 'solid':
        ctx.setLineDash([]);
        break;
      case 'dashed':
        ctx.setLineDash([8, 4]);
        break;
      case 'dotted':
        ctx.setLineDash([2, 4]);
        break;
      case 'dash-dot':
        ctx.setLineDash([8, 4, 2, 4]);
        break;
      default:
        ctx.setLineDash([]);
    }
  }

  drawNodes(ctx) {
    for (const [id, node] of this.nodes) {
      const isSelected = this.selectedNodes.has(id);
      const isHovered = this.hoveredNode && this.hoveredNode.id === id;
      
      if (this.settings.nodeStyle === 'rectangle') {
        this.drawRectangleNode(ctx, id, node, isSelected, isHovered);
      } else {
        this.drawCircleNode(ctx, id, node, isSelected, isHovered);
      }
    }
  }

  drawCircleNode(ctx, id, node, isSelected, isHovered) {
    const radius = node.radius || this.settings.nodeRadius;
    
    // Draw shadow
    if (isSelected || isHovered) {
      ctx.save();
      ctx.shadowColor = isSelected ? this.settings.selectedColor : 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = isSelected ? 12 : 8;
      ctx.fillStyle = node.color || this.settings.nodeColor;
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    
    // Draw circle
    ctx.fillStyle = node.color || this.settings.nodeColor;
    
    // Draw outline only if enabled
    if (this.settings.showNodeOutline) {
      ctx.strokeStyle = isSelected ? this.settings.selectedColor : this.settings.outlineColor;
      ctx.lineWidth = isSelected ? 4 : this.settings.outlineThickness;
      
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      // No outline
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw text
    this.drawNodeText(ctx, node, radius * 1.8);
  }

  drawRectangleNode(ctx, id, node, isSelected, isHovered) {
    const width = this.getNodeWidth(node);
    const height = this.getNodeHeight(node);
    
    // Draw shadow
    if (isSelected || isHovered) {
      ctx.save();
      ctx.shadowColor = isSelected ? this.settings.selectedColor : 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = isSelected ? 12 : 8;
      ctx.fillStyle = node.color || this.settings.nodeColor;
      ctx.fillRect(node.x - width/2, node.y - height/2, width, height);
      ctx.restore();
    }
    
    // Draw rectangle
    ctx.fillStyle = node.color || this.settings.nodeColor;
    
    // Draw outline only if enabled
    if (this.settings.showNodeOutline) {
      ctx.strokeStyle = isSelected ? this.settings.selectedColor : this.settings.outlineColor;
      ctx.lineWidth = isSelected ? 4 : this.settings.outlineThickness;
      
      ctx.fillRect(node.x - width/2, node.y - height/2, width, height);
      ctx.strokeRect(node.x - width/2, node.y - height/2, width, height);
    } else {
      // No outline
      ctx.fillRect(node.x - width/2, node.y - height/2, width, height);
    }
    
    // Draw text
    this.drawNodeText(ctx, node, width - 20);
  }

  drawNodeText(ctx, node, maxWidth) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let y = node.y;
    let lineHeight = 12;
    
    // Calculate total lines to center text vertically
    let totalLines = 0;
    const fullName = this.buildFullName(node);
    if (fullName) {
      const nameLines = this.wrapText(ctx, fullName, maxWidth);
      totalLines += nameLines.length;
    }
    
    // Count maiden name line if it should be shown
    if (this.displayPreferences.showMaidenName && node.maidenName && node.maidenName !== node.surname) {
      totalLines += 1;
    }
    
    // Count DOB line if it should be shown
    if (this.displayPreferences.showDateOfBirth && node.dob) {
      totalLines += 1;
    }
    
    y = node.y - (totalLines - 1) * lineHeight / 2;
    
    // Draw name
    if (fullName) {
      ctx.font = `600 ${this.settings.nameFontSize}px ${this.settings.fontFamily}`;
      ctx.fillStyle = this.settings.nameColor;
      
      const lines = this.wrapText(ctx, fullName, maxWidth);
      
      for (const line of lines) {
        ctx.fillText(line, node.x, y);
        y += lineHeight;
      }
    }
    
    // Draw maiden name if different and show preference is enabled (FIXED)
    if (this.displayPreferences.showMaidenName && node.maidenName && node.maidenName !== node.surname) {
      ctx.font = `italic ${this.settings.dobFontSize}px ${this.settings.fontFamily}`;
      ctx.fillStyle = this.settings.nameColor;
      ctx.fillText(`(${node.maidenName})`, node.x, y);
      y += 10;
    }
    
    // Draw DOB if show preference is enabled (FIXED)
    if (this.displayPreferences.showDateOfBirth && node.dob) {
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
  onSelectionCleared = null;
  onConnectionClick = null;

  // Cleanup
  destroy() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    this.canvas.remove();
  }
}

function devLog(...args) {
  if (window.NODE_ENV !== 'production') {
    console.log(...args);
  }
}
function devWarn(...args) {
  if (window.NODE_ENV !== 'production') {
    console.warn(...args);
  }
}
function devError(...args) {
  if (window.NODE_ENV !== 'production') {
    console.error(...args);
  }
}
