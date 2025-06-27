// error-handling.js
// Comprehensive error handling system with retry mechanisms and recovery strategies

import { CONFIG, ERROR_MESSAGES } from './config.js';
import { EVENTS } from './event-bus.js';

// Custom error classes for better error categorization
export class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class CanvasError extends Error {
  constructor(message, context = null) {
    super(message);
    this.name = 'CanvasError';
    this.context = context;
  }
}

export class DataError extends Error {
  constructor(message, operation = null) {
    super(message);
    this.name = 'DataError';
    this.operation = operation;
  }
}

export class NetworkError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = 'NetworkError';
    this.status = status;
  }
}

// Retry mechanism with exponential backoff
export class RetryManager {
  static async retry(
    operation,
    options = {}
  ) {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 30000,
      backoffFactor = 2,
      jitter = true,
      shouldRetry = () => true,
      onRetry = () => {},
      context = null
    } = options;

    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation(attempt, context);
        return result;
      } catch (error) {
        lastError = error;
        
        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break;
        }
        
        // Check if we should retry this error
        if (!shouldRetry(error, attempt)) {
          throw error;
        }
        
        // Calculate delay with exponential backoff
        let delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt), maxDelay);
        
        // Add jitter to prevent thundering herd
        if (jitter) {
          delay = delay * (0.5 + Math.random() * 0.5);
        }
        
        // Call retry callback
        onRetry(error, attempt, delay);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  // Specialized retry for DOM operations
  static async retryDOMOperation(operation, maxRetries = 10) {
    return this.retry(operation, {
      maxRetries,
      baseDelay: 100,
      maxDelay: 2000,
      shouldRetry: (error, attempt) => {
        // Retry DOM operations if elements are not ready
        return error.message.includes('not found') || 
               error.message.includes('not ready');
      },
      onRetry: (error, attempt, delay) => {
        console.log(`DOM operation retry ${attempt + 1}/${maxRetries} in ${delay}ms: ${error.message}`);
      }
    });
  }

  // Specialized retry for async module loading
  static async retryModuleLoad(moduleLoader, maxRetries = 3) {
    return this.retry(moduleLoader, {
      maxRetries,
      baseDelay: 500,
      shouldRetry: (error, attempt) => {
        // Retry network-related module loading errors
        return error.message.includes('Failed to fetch') ||
               error.message.includes('Loading chunk') ||
               error.message.includes('Network error');
      },
      onRetry: (error, attempt, delay) => {
        console.warn(`Module loading retry ${attempt + 1}/${maxRetries}: ${error.message}`);
      }
    });
  }
}

// Circuit breaker pattern for preventing cascading failures
export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000;
    this.monitoringPeriod = options.monitoringPeriod || 10000;
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
  }

  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= 2) {
        this.state = 'CLOSED';
      }
    }
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState() {
    return this.state;
  }
}

// Error recovery strategies
export class ErrorRecovery {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.recoveryStrategies = new Map();
    this.setupDefaultStrategies();
  }

  setupDefaultStrategies() {
    // Canvas recovery
    this.addStrategy(CanvasError, async (error, context) => {
      console.warn('Canvas error detected, attempting recovery:', error.message);
      
      if (context.renderer) {
        try {
          // Try to reinitialize the canvas
          await context.renderer.initialize();
          this.eventBus.emit(EVENTS.ERROR_RECOVERED, { type: 'canvas', strategy: 'reinitialize' });
          return true;
        } catch (reinitError) {
          // Fall back to SVG rendering
          console.warn('Canvas reinit failed, falling back to SVG');
          try {
            const SVGRenderer = await import('./svg-renderer.js');
            context.renderer = new SVGRenderer.default(context.container);
            this.eventBus.emit(EVENTS.ERROR_RECOVERED, { type: 'canvas', strategy: 'fallback_svg' });
            return true;
          } catch (svgError) {
            console.error('SVG fallback also failed:', svgError);
            return false;
          }
        }
      }
      return false;
    });

    // Data recovery
    this.addStrategy(DataError, async (error, context) => {
      console.warn('Data error detected, attempting recovery:', error.message);
      
      if (error.operation === 'load') {
        // Try to load from backup
        try {
          const backupData = localStorage.getItem(CONFIG.CACHE.BACKUP_KEY);
          if (backupData) {
            const parsed = JSON.parse(backupData);
            this.eventBus.emit(EVENTS.ERROR_RECOVERED, { type: 'data', strategy: 'backup_restore' });
            return parsed;
          }
        } catch (backupError) {
          console.warn('Backup recovery failed:', backupError);
        }
        
        // Create empty tree as last resort
        const emptyTree = {
          people: [],
          settings: { ...CONFIG.CANVAS },
          version: CONFIG.APP.VERSION
        };
        this.eventBus.emit(EVENTS.ERROR_RECOVERED, { type: 'data', strategy: 'empty_tree' });
        return emptyTree;
      }
      
      return false;
    });

    // Validation error recovery
    this.addStrategy(ValidationError, async (error, context) => {
      console.warn('Validation error detected:', error.message);
      
      if (context.data && context.field) {
        // Try to sanitize the problematic field
        try {
          const { SecurityUtils } = await import('./security-utils.js');
          const sanitized = { ...context.data };
          sanitized[context.field] = SecurityUtils.sanitizeText(sanitized[context.field]);
          
          this.eventBus.emit(EVENTS.ERROR_RECOVERED, { type: 'validation', strategy: 'sanitize' });
          return sanitized;
        } catch (sanitizeError) {
          console.error('Sanitization failed:', sanitizeError);
        }
      }
      
      return false;
    });
  }

  addStrategy(ErrorClass, strategyFn) {
    this.recoveryStrategies.set(ErrorClass, strategyFn);
  }

  async attemptRecovery(error, context = {}) {
    const ErrorClass = error.constructor;
    const strategy = this.recoveryStrategies.get(ErrorClass);
    
    if (strategy) {
      try {
        const result = await strategy(error, context);
        if (result !== false) {
          return result;
        }
      } catch (recoveryError) {
        console.error('Recovery strategy failed:', recoveryError);
      }
    }
    
    // No recovery strategy or strategy failed
    return false;
  }
}

// Global error handler
export class GlobalErrorHandler {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.errorRecovery = new ErrorRecovery(eventBus);
    this.errorLog = [];
    this.maxLogSize = 100;
    
    this.setupGlobalHandlers();
  }

  setupGlobalHandlers() {
    // Handle uncaught JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError(new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, { type: 'unhandled_promise' });
      event.preventDefault(); // Prevent console error
    });

    // Handle canvas context lost
    document.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.handleError(new CanvasError('WebGL context lost'), { type: 'webgl_context_lost' });
    });
  }

  async handleError(error, context = {}) {
    // Log the error
    this.logError(error, context);
    
    // Emit error event
    this.eventBus.emit(EVENTS.ERROR_OCCURRED, { error, context });
    
    // Attempt recovery
    const recovered = await this.errorRecovery.attemptRecovery(error, context);
    
    if (!recovered) {
      // Show user-friendly error message
      this.showErrorToUser(error, context);
    }
    
    return recovered;
  }

  logError(error, context) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      type: error.name || 'Error',
      context,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    this.errorLog.push(logEntry);
    
    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }
    
    // Log to console in development
    if (CONFIG.DEBUG.ENABLED) {
      console.error('Error logged:', logEntry);
    }
  }

  showErrorToUser(error, context) {
    // Get user-friendly error message
    let message = this.getUserFriendlyMessage(error);
    
    // Show notification if available
    if (window.notifications) {
      window.notifications.error('Error', message, {
        duration: 8000,
        actions: [{
          text: 'Report Issue',
          action: () => this.reportError(error, context)
        }]
      });
    } else {
      // Fallback to alert
      alert(`Error: ${message}`);
    }
  }

  getUserFriendlyMessage(error) {
    // Map technical errors to user-friendly messages
    const errorMap = {
      'ValidationError': ERROR_MESSAGES.VALIDATION.INVALID_NAME,
      'CanvasError': ERROR_MESSAGES.CANVAS.RENDER_ERROR,
      'DataError': ERROR_MESSAGES.DATA.SAVE_FAILED,
      'NetworkError': ERROR_MESSAGES.NETWORK.CONNECTION_LOST
    };
    
    return errorMap[error.name] || 'An unexpected error occurred. Please try again.';
  }

  reportError(error, context) {
    // Create error report
    const report = {
      error: {
        message: error.message,
        stack: error.stack,
        type: error.name
      },
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      appVersion: CONFIG.APP.VERSION
    };
    
    // In a real app, this would send to an error reporting service
    console.log('Error report:', report);
    
    // For now, copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(report, null, 2))
      .then(() => {
        if (window.notifications) {
          window.notifications.success('Error Report', 'Error details copied to clipboard');
        }
      })
      .catch(err => console.warn('Failed to copy error report:', err));
  }

  getErrorLog() {
    return [...this.errorLog];
  }

  clearErrorLog() {
    this.errorLog = [];
  }
}