# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MapMyRoots is a free online family tree builder and genealogy software built with vanilla JavaScript. It features a canvas-based interactive family tree visualization with drag-and-drop functionality, multi-format export capabilities, and comprehensive person management.

## Key Entry Points

- `index.html` - Marketing/landing page with internationalization
- `builder.html` - Main family tree builder application
- `tree.js` - Main application entry point with lazy loading
- `tree-core-canvas.js` - Core application controller and state manager

## Development Commands

Since this is a static web application, no build process is required. Simply open the HTML files in a web browser or serve them through a local web server:

```bash
# For development, use a simple HTTP server
python3 -m http.server 8000
# or
npx serve .
```

## Recent Security & Architecture Improvements

The codebase has been enhanced with several critical improvements:

- **Security**: All `innerHTML` usage replaced with safe DOM manipulation
- **Input Validation**: Comprehensive data sanitization for user inputs
- **Architecture**: Event-driven system replacing window globals
- **Error Handling**: Robust retry mechanisms and recovery strategies
- **Accessibility**: Full keyboard navigation and screen reader support
- **Configuration**: Centralized config system with feature flags

## Core Architecture

### Module System
The application uses ES6 modules with clear separation of concerns:

- **Core Engine**: `tree-core-canvas.js` (main controller), `canvas-renderer.js` (rendering)
- **Data Layer**: `core-cache.js` (auto-save), `core-undoRedo.js` (state management)
- **UI Layer**: `modal.js` (person editing), `table.js` (table view), `ui-*.js` (UI components)
- **Features**: `exporter.js` (multi-format export), `search.js`, `i18n.js` (internationalization)

### State Management
- Central state managed by `TreeCoreCanvas` class in `tree-core-canvas.js`
- Auto-save functionality saves to localStorage every 30 seconds
- Undo/redo system tracks state changes with configurable limits
- Observer pattern for state updates between modules

### Canvas Rendering
- High-performance canvas-based family tree visualization
- Supports pan, zoom, drag operations with mobile optimization
- Multiple node styles (circle/rectangle) and connection line types
- Canvas renderer is initialized and managed by the core controller

## Key Features

- **Interactive Family Tree**: Canvas-based drag-and-drop interface
- **Person Management**: Comprehensive profiles with relationships
- **Dual Views**: Graphic (canvas) and table views with seamless switching
- **Export Options**: SVG, PNG, PDF, GEDCOM formats
- **Auto-save**: Automatic persistence to localStorage
- **Internationalization**: Support for EN, ES, RU, DE languages
- **Search**: Real-time family member search functionality
- **Undo/Redo**: Full state management for user actions

## Data Structure

Family tree data is stored as:
- **People array**: Each person object contains personal data and relationship IDs
- **Relationships**: Parent-child and spouse connections via person IDs
- **Display preferences**: Node styling, font settings, visibility options
- **Canvas state**: Pan, zoom, and layout information

## File Organization

```
Core Application:
├── tree.js                 # Enhanced entry point with event-driven architecture
├── tree-core-canvas.js     # Application controller
├── canvas-renderer.js      # Canvas rendering engine
├── style.css              # Main stylesheet

Architecture & Infrastructure:
├── event-bus.js           # Event-driven communication system
├── security-utils.js      # Input sanitization and safe DOM manipulation
├── error-handling.js      # Comprehensive error handling with retry logic
├── accessibility.js       # Full accessibility and keyboard navigation
├── config.js              # Centralized configuration and constants

Data & State:
├── core-cache.js          # Enhanced auto-save with validation
├── core-undoRedo.js       # Undo/redo functionality
├── core-export.js         # Export coordination

UI Components:
├── modal.js               # Person editing forms (security enhanced)
├── table.js               # Table view implementation
├── ui-buttons.js          # Button interactions
├── ui-settings.js         # Settings panel
├── ui-modals.js           # Modal management
├── notifications.js       # User notifications

Features:
├── exporter.js            # Multi-format export
├── search.js              # Search functionality
├── i18n.js                # Internationalization
├── language-switcher.js   # Language switching
├── searchableSelect.js    # Enhanced dropdowns

Assets:
├── locales/               # Translation files
├── fonts/                 # Custom fonts
└── glossary/              # Genealogy glossary
```

## Common Patterns

1. **Event-Driven Architecture**: Use the EventBus system for module communication instead of window globals
2. **Security First**: Always use SecurityUtils for DOM manipulation and input sanitization
3. **Error Handling**: Use RetryManager for operations that might fail, comprehensive error recovery
4. **Dependency Injection**: Use the ServiceContainer pattern instead of direct imports where possible
5. **Data Validation**: Always validate data before processing or storage
6. **Accessibility**: Follow WCAG guidelines, provide keyboard navigation and ARIA labels

## New Architecture Examples

```javascript
// Use EventBus instead of window globals
import { appContext, EVENTS } from './event-bus.js';

// Emit events
appContext.getEventBus().emit(EVENTS.TREE_PERSON_ADDED, { person: personData });

// Listen for events
appContext.getEventBus().on(EVENTS.CANVAS_NODE_SELECTED, (data) => {
  console.log('Node selected:', data.nodeId);
});

// Use SecurityUtils for safe DOM manipulation
import { SecurityUtils, DOMUtils } from './security-utils.js';

// Safe text content
SecurityUtils.setTextContent(element, userInput);

// Safe element creation
const button = SecurityUtils.createElement('button', {
  className: 'btn-primary',
  'aria-label': 'Save family tree'
}, 'Save');

// Use RetryManager for operations that might fail
import { RetryManager } from './error-handling.js';

const result = await RetryManager.retry(async () => {
  return await riskyOperation();
}, {
  maxRetries: 3,
  baseDelay: 1000
});
```

## Important Notes

- The application runs entirely client-side with no backend dependencies
- All data is stored in browser localStorage until explicitly exported
- Canvas rendering is optimized for performance with large family trees
- Internationalization uses JSON translation files in the `locales/` directory
- Export functionality supports industry-standard GEDCOM format for genealogy software compatibility