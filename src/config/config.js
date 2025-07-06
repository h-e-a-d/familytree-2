// config.js
// Centralized configuration and constants for the MapMyRoots application

export const CONFIG = {
  // Application metadata
  APP: {
    NAME: 'MapMyRoots',
    VERSION: '2.6',
    BUILD: new Date().toISOString().slice(0, 10)
  },

  // Canvas rendering settings
  CANVAS: {
    DEFAULT_NODE_RADIUS: 50,
    MIN_NODE_RADIUS: 20,
    MAX_NODE_RADIUS: 100,
    
    MIN_ZOOM: 0.1,
    MAX_ZOOM: 5.0,
    DEFAULT_ZOOM: 1.0,
    ZOOM_STEP: 0.1,
    
    DEFAULT_NODE_COLOR: '#3498db',
    SELECTED_NODE_COLOR: '#e74c3c',
    STROKE_COLOR: '#2c3e50',
    STROKE_WIDTH: 2,
    
    FONT_FAMILY: 'Inter, sans-serif',
    NAME_FONT_SIZE: 11,
    DOB_FONT_SIZE: 10,
    NAME_COLOR: '#ffffff',
    DOB_COLOR: '#f0f0f0',
    
    CONNECTION_COLOR: '#7f8c8d',
    SPOUSE_CONNECTION_COLOR: '#e74c3c',
    
    GRID_SIZE: 50,
    GRID_COLOR: '#f0f0f0',
    GRID_MAJOR_COLOR: '#e0e0e0',
    
    // Performance settings
    MAX_RENDER_FPS: 60,
    RENDER_DEBOUNCE_MS: 16, // ~60fps
    
    // Touch/interaction settings
    DOUBLE_TAP_THRESHOLD: 300,
    DOUBLE_TAP_DISTANCE: 50,
    DRAG_THRESHOLD: 5,
    LONG_PRESS_DURATION: 500
  },

  // Cache and persistence settings
  CACHE: {
    AUTO_SAVE_INTERVAL: 30000, // 30 seconds
    CACHE_KEY: 'familyTreeCanvas_state',
    VERSION_KEY: 'familyTreeCanvas_version',
    BACKUP_KEY: 'familyTreeCanvas_backup',
    
    MAX_CACHE_SIZE: 5 * 1024 * 1024, // 5MB
    MAX_BACKUP_COUNT: 5,
    
    COMPRESSION_ENABLED: true,
    ENCRYPTION_ENABLED: false // Could be enabled for sensitive data
  },

  // Data validation limits
  VALIDATION: {
    MAX_TEXT_LENGTH: 1000,
    MAX_NAME_LENGTH: 100,
    MAX_ID_LENGTH: 50,
    
    MIN_BIRTH_YEAR: 1800,
    MAX_BIRTH_YEAR: new Date().getFullYear() + 10,
    
    MAX_TREE_SIZE: 10000, // Maximum people in a tree
    MAX_RELATIONSHIP_DEPTH: 20 // Prevent infinite loops
  },

  // UI settings
  UI: {
    MODAL_ANIMATION_DURATION: 300,
    NOTIFICATION_DURATION: 4000,
    LOADING_SPINNER_DELAY: 500,
    
    MOBILE_BREAKPOINT: 768,
    TABLET_BREAKPOINT: 1024,
    
    MAX_UNDO_STACK_SIZE: 50,
    UNDO_THROTTLE_MS: 1000,
    
    SEARCH_DEBOUNCE_MS: 300,
    SEARCH_MIN_CHARS: 2
  },

  // Export settings
  EXPORT: {
    IMAGE_QUALITY: 0.9,
    PDF_MARGINS: 20,
    SVG_PRECISION: 2,
    
    MAX_EXPORT_SIZE: 4096, // pixels
    DEFAULT_EXPORT_FORMAT: 'png',
    
    SUPPORTED_FORMATS: ['png', 'jpg', 'svg', 'pdf', 'gedcom'],
    
    GEDCOM_VERSION: '5.5.1',
    GEDCOM_CHARACTER_SET: 'UTF-8'
  },

  // Performance monitoring
  PERFORMANCE: {
    MEMORY_CHECK_INTERVAL: 60000, // 1 minute
    MAX_MEMORY_USAGE: 100 * 1024 * 1024, // 100MB
    
    FPS_MONITORING: true,
    FPS_SAMPLE_SIZE: 60,
    MIN_FPS_THRESHOLD: 30,
    
    CONNECTION_MONITOR_INTERVAL: 10000, // 10 seconds
    CONNECTION_LOSS_THRESHOLD: 5 // connections
  },

  // Accessibility settings
  A11Y: {
    HIGH_CONTRAST_MODE: false,
    REDUCE_MOTION: false,
    SCREEN_READER_ANNOUNCEMENTS: true,
    
    FOCUS_OUTLINE_WIDTH: 3,
    FOCUS_OUTLINE_COLOR: '#007acc',
    
    MIN_TOUCH_TARGET_SIZE: 44, // pixels (WCAG AA)
    MIN_COLOR_CONTRAST_RATIO: 4.5 // WCAG AA
  },

  // Internationalization
  I18N: {
    DEFAULT_LOCALE: 'en',
    SUPPORTED_LOCALES: ['en', 'es', 'ru', 'de'],
    FALLBACK_LOCALE: 'en',
    
    STORAGE_KEY: 'mapmyroots_locale',
    AUTO_DETECT: true,
    
    DATE_FORMAT: 'YYYY-MM-DD',
    NUMBER_FORMAT: 'en-US'
  },

  // Security settings
  SECURITY: {
    CSP_ENABLED: true,
    XSS_PROTECTION: true,
    
    MAX_INPUT_LENGTH: 10000,
    ALLOWED_HTML_TAGS: [],
    
    LOCAL_STORAGE_ENCRYPTION: false,
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000 // 24 hours
  },

  // Development settings
  DEBUG: {
    ENABLED: false, // Set to true in development
    LOG_LEVEL: 'warn', // 'debug', 'info', 'warn', 'error'
    PERFORMANCE_LOGGING: false,
    
    MOCK_DATA: false,
    SKIP_VALIDATIONS: false,
    
    CANVAS_DEBUG_MODE: false,
    SHOW_GRID: false,
    SHOW_BOUNDS: false
  }
};

// Node styles configuration
export const NODE_STYLES = {
  CIRCLE: {
    type: 'circle',
    borderRadius: '50%'
  },
  RECTANGLE: {
    type: 'rectangle',
    borderRadius: '8px'
  },
  ROUNDED_RECTANGLE: {
    type: 'rounded-rectangle',
    borderRadius: '12px'
  }
};

// Connection line styles
export const LINE_STYLES = {
  SOLID: {
    type: 'solid',
    lineDash: []
  },
  DASHED: {
    type: 'dashed',
    lineDash: [5, 5]
  },
  DOTTED: {
    type: 'dotted',
    lineDash: [2, 2]
  },
  DASH_DOT: {
    type: 'dash-dot',
    lineDash: [10, 5, 2, 5]
  }
};

// Color themes
export const THEMES = {
  DEFAULT: {
    name: 'Default',
    colors: {
      primary: '#3498db',
      secondary: '#2c3e50',
      accent: '#e74c3c',
      background: '#f4f4f4',
      surface: '#ffffff',
      text: '#2c3e50',
      textLight: '#7f8c8d'
    }
  },
  DARK: {
    name: 'Dark Mode',
    colors: {
      primary: '#5dade2',
      secondary: '#34495e',
      accent: '#ec7063',
      background: '#2c3e50',
      surface: '#34495e',
      text: '#ecf0f1',
      textLight: '#bdc3c7'
    }
  },
  HIGH_CONTRAST: {
    name: 'High Contrast',
    colors: {
      primary: '#000000',
      secondary: '#ffffff',
      accent: '#ff0000',
      background: '#ffffff',
      surface: '#ffffff',
      text: '#000000',
      textLight: '#333333'
    }
  }
};

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  // File operations
  SAVE: { key: 's', ctrl: true },
  EXPORT_GEDCOM: { key: 'g', ctrl: true, shift: true },
  EXPORT_PDF: { key: 'p', ctrl: true, shift: true },
  
  // Edit operations
  UNDO: { key: 'z', ctrl: true },
  REDO: { key: 'y', ctrl: true },
  DELETE: { key: 'Delete' },
  
  // Navigation
  SEARCH: { key: '/', ctrl: true },
  ZOOM_IN: { key: '+', ctrl: true },
  ZOOM_OUT: { key: '-', ctrl: true },
  ZOOM_RESET: { key: '0', ctrl: true },
  
  // View
  TOGGLE_VIEW: { key: 'Tab', ctrl: true },
  FULLSCREEN: { key: 'F11' },
  
  // Canvas navigation
  ARROW_UP: { key: 'ArrowUp' },
  ARROW_DOWN: { key: 'ArrowDown' },
  ARROW_LEFT: { key: 'ArrowLeft' },
  ARROW_RIGHT: { key: 'ArrowRight' }
};

// Error messages
export const ERROR_MESSAGES = {
  VALIDATION: {
    REQUIRED_FIELD: 'This field is required',
    INVALID_DATE: 'Please enter a valid date',
    INVALID_NAME: 'Name contains invalid characters',
    TOO_LONG: 'Text is too long (maximum {max} characters)',
    INVALID_RELATIONSHIP: 'Invalid family relationship'
  },
  
  CANVAS: {
    INITIALIZATION_FAILED: 'Failed to initialize canvas renderer',
    RENDER_ERROR: 'Error occurred while rendering family tree',
    EXPORT_FAILED: 'Failed to export family tree'
  },
  
  DATA: {
    SAVE_FAILED: 'Failed to save family tree data',
    LOAD_FAILED: 'Failed to load family tree data',
    CORRUPTED_DATA: 'Family tree data appears to be corrupted',
    IMPORT_FAILED: 'Failed to import family tree file'
  },
  
  NETWORK: {
    CONNECTION_LOST: 'Connection lost',
    TIMEOUT: 'Request timed out',
    SERVER_ERROR: 'Server error occurred'
  }
};

// Success messages
export const SUCCESS_MESSAGES = {
  DATA: {
    SAVED: 'Family tree saved successfully',
    EXPORTED: 'Family tree exported successfully',
    IMPORTED: 'Family tree imported successfully'
  },
  
  PERSON: {
    ADDED: 'Family member added successfully',
    UPDATED: 'Family member updated successfully',
    DELETED: 'Family member deleted successfully'
  }
};

// Feature flags for gradual rollout
export const FEATURE_FLAGS = {
  NEW_EXPORT_DIALOG: true,
  ENHANCED_SEARCH: true,
  COLLABORATIVE_EDITING: false,
  ADVANCED_ANALYTICS: false,
  CLOUD_SYNC: false,
  AI_SUGGESTIONS: false
};