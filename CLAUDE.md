# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MapMyRoots is a free online family tree builder and genealogy software built with vanilla JavaScript. It features a canvas-based interactive family tree visualization with drag-and-drop functionality, multi-format export capabilities, and comprehensive person management.

**Latest Version**: 2.1.0 (Updated December 2024)

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

## Recent Security & Architecture Improvements (2024)

The codebase has been significantly enhanced with critical improvements:

- **Security**: All `innerHTML` usage replaced with safe DOM manipulation
- **Input Validation**: Comprehensive data sanitization for user inputs
- **Architecture**: Event-driven system replacing window globals
- **Error Handling**: Robust retry mechanisms and recovery strategies
- **Accessibility**: Full keyboard navigation and screen reader support
- **Configuration**: Centralized config system with feature flags
- **Code Organization**: Modal styles separated into dedicated CSS file for better maintainability
- **Legacy Code Removal**: Cleaned up all legacy data format support for simplified codebase

## Recent Refactoring (December 2024)

### Modal System Refactoring
- **Separated modal styles**: Extracted all modal-related CSS from `style.css` into dedicated `modal.css`
- **Improved maintainability**: Modal styles are now organized in a single file
- **Updated references**: `builder.html` now includes both `style.css` and `modal.css`
- **Clean separation**: Main stylesheet no longer contains modal-specific code

### Legacy Code Removal
- **Removed legacy data format support**: Application now only supports current JSON format
- **Cleaned JavaScript**: Removed `processLegacyData()` and `checkForLegacyData()` methods
- **Updated error handling**: Unrecognized data formats are now properly rejected
- **Simplified notifications**: Removed legacy-specific notification types
- **Cleaned HTML**: Removed legacy import modal and related UI elements
- **Updated translations**: Removed legacy-related translations from all locale files

### Smart Node Positioning Fix
- **Fixed coordinate mismatch issue**: New nodes now appear at screen center for immediate visibility
- **Center-screen placement**: New nodes are positioned at the current viewport center with small offsets
- **Auto-camera centering**: Camera automatically centers on loaded JSON content when no saved position
- **Better user experience**: New nodes always appear in the user's current view

### Critical Bug Fixes (December 2024)
- **Button State Management Conflict**: Fixed critical issue where multiple button management systems conflicted
- **Permanent Button Disabling**: Resolved bug where Save/Delete buttons became disabled after one use
- **Conflicting State Systems**: Disabled automatic button enhancement that competed with modal.js management
- **Comprehensive Button Reset**: Added button state reset on modal open/close to prevent state corruption
- **Race Condition Fix**: Eliminated timing conflicts between different button loading state managers
- **UI Reliability**: Ensured all modal buttons work consistently without requiring page refresh

### Modal UX/UI Redesign (December 2024)
- **Complete Modal Redesign**: Completely redesigned Add Person and Edit Person modals with modern UI patterns
- **Enhanced Button System**: Implemented three-tier button design with gradients, animations, and proper hierarchy
- **Mobile-First Layout**: Optimized modal layout for mobile devices with compact single-row button arrangement
- **Modern Form Design**: Enhanced form fields with progressive animations, improved spacing, and better visual hierarchy
- **Confirmation Modal Enhancement**: Redesigned delete/clear confirmations with visual impact and clear consequence lists
- **ModalUXEnhancer Conflict Resolution**: Fixed CSS conflicts where ui-modals.js automatic enhancement interfered with custom modal.css styles
- **CSS Specificity Management**: Prevented inline style conflicts by exempting personModal from automatic enhancement
- **Responsive Design**: Comprehensive mobile optimization with proper touch targets and compact layouts

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
- **Data Format**: Only supports current JSON format (legacy format support removed)

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
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices

## Data Structure

Family tree data is stored as:
- **People array**: Each person object contains personal data and relationship IDs
- **Relationships**: Parent-child and spouse connections via person IDs
- **Display preferences**: Node styling, font settings, visibility options
- **Canvas state**: Pan, zoom, and layout information
- **Format**: JSON structure with version information for data validation

## File Organization

```
Core Application:
├── tree.js                 # Enhanced entry point with event-driven architecture
├── tree-core-canvas.js     # Application controller
├── canvas-renderer.js      # Canvas rendering engine
├── style.css              # Main stylesheet (modal styles removed)
├── modal.css              # Modal-specific styles (NEW - separated from main CSS)

Architecture & Infrastructure:
├── event-bus.js           # Event-driven communication system
├── security-utils.js      # Input sanitization and safe DOM manipulation
├── error-handling.js      # Comprehensive error handling with retry logic
├── accessibility.js       # Full accessibility and keyboard navigation
├── config.js              # Centralized configuration and constants

Data & State:
├── core-cache.js          # Enhanced auto-save with validation (legacy support removed)
├── core-undoRedo.js       # Undo/redo functionality
├── core-export.js         # Export coordination

UI Components:
├── modal.js               # Person editing forms (security enhanced)
├── table.js               # Table view implementation
├── ui-buttons.js          # Button interactions
├── ui-settings.js         # Settings panel
├── ui-modals.js           # Modal management
├── notifications.js       # User notifications (legacy methods removed)

Features:
├── exporter.js            # Multi-format export
├── search.js              # Search functionality
├── i18n.js                # Internationalization
├── language-switcher.js   # Language switching
├── searchableSelect.js    # Enhanced dropdowns

Assets:
├── locales/               # Translation files (legacy entries removed)
├── fonts/                 # Custom fonts
└── glossary/              # Genealogy glossary
```

## CSS Architecture

### Main Stylesheets
- **`style.css`**: Core application styles (navigation, layout, forms, responsive design)
- **`modal.css`**: All modal-related styles (dialogs, overlays, form actions)
- **`homepage.css`**: Landing page specific styles (used only by index.html)

### Modal System
- All modal styles are now in `modal.css` for better organization
- Includes: modal containers, content, headers, form actions, responsive behavior
- Referenced in `builder.html` after main stylesheet for proper cascade

## Common Patterns

1. **Event-Driven Architecture**: Use the EventBus system for module communication instead of window globals
2. **Security First**: Always use SecurityUtils for DOM manipulation and input sanitization
3. **Error Handling**: Use RetryManager for operations that might fail, comprehensive error recovery
4. **Dependency Injection**: Use the ServiceContainer pattern instead of direct imports where possible
5. **Data Validation**: Always validate data before processing or storage
6. **Accessibility**: Follow WCAG guidelines, provide keyboard navigation and ARIA labels
7. **CSS Organization**: Keep modal styles in modal.css, main styles in style.css

## Data Format Standards

### Current JSON Format (Only Supported)
```javascript
{
  "version": "2.1.0",
  "cacheFormat": "enhanced",
  "persons": [...],
  "fontSettings": {...},
  "canvasState": {...}
}
```

### Data Validation
- All loaded data must include version or persons properties
- Unrecognized formats are rejected with appropriate error messages
- Auto-save only works with current format specifications

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

## Development Guidelines

### When Working with Modals
- Always add modal styles to `modal.css`, not `style.css`
- Test modal functionality across desktop and mobile devices
- Ensure proper keyboard navigation and screen reader support
- Use existing modal patterns for consistency

### Data Handling
- Only process data that matches current JSON format
- Always validate data structure before processing
- Use appropriate error messages for invalid data
- Log warnings for unrecognized formats but don't attempt processing

### CSS Organization
- Main application styles go in `style.css`
- Modal-specific styles go in `modal.css`
- Homepage styles stay in `homepage.css`
- Maintain responsive design patterns across all stylesheets

## Browser Compatibility

- **Modern Browsers**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **Mobile**: iOS Safari 13+, Chrome Mobile 80+
- **Features Used**: ES6 modules, Canvas API, localStorage, CSS Grid, Flexbox
- **Fallbacks**: Graceful degradation for older browsers where possible

## Performance Considerations

- Canvas rendering optimized for trees with 100+ people
- Auto-save throttled to prevent excessive localStorage writes
- Lazy loading for non-critical UI components
- Optimized CSS with minimal reflows and repaints
- Separate CSS files allow for better caching strategies

## Important Notes

- The application runs entirely client-side with no backend dependencies
- All data is stored in browser localStorage until explicitly exported
- Canvas rendering is optimized for performance with large family trees
- Internationalization uses JSON translation files in the `locales/` directory
- Export functionality supports industry-standard GEDCOM format for genealogy software compatibility
- **Legacy data formats are no longer supported** - only current JSON format is accepted
- Modal styles are separated for better maintainability and organization

## Testing Recommendations

When testing the application:
1. **Data Import**: Test only with current JSON format files
2. **Modal Functionality**: Verify all modals work correctly after CSS separation
3. **Responsive Design**: Test modal behavior on mobile devices
4. **Error Handling**: Ensure graceful handling of invalid data formats
5. **Performance**: Test with large family trees (50+ people)
6. **Accessibility**: Verify keyboard navigation and screen reader compatibility