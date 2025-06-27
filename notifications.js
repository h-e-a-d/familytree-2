// notifications.js - Enhanced with cache support and better formatting compatibility notifications

class NotificationManager {
  constructor() {
    this.container = null;
    this.notifications = new Map();
    this.nextId = 1;
    this.init();
  }

  init() {
    // Create notifications container if it doesn't exist
    this.container = document.getElementById('notificationsContainer');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'notificationsContainer';
      this.container.className = 'notifications-container';
      document.body.appendChild(this.container);
    }
  }

  show(options) {
    const {
      type = 'info',
      title = '',
      message = '',
      duration = 4000,
      showSpinner = false,
      persistent = false
    } = options;

    const id = this.nextId++;
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.setAttribute('data-id', id);

    // Create icon
    const icon = document.createElement('div');
    icon.className = 'notification-icon';
    
    if (showSpinner) {
      icon.innerHTML = '<div class="notification-spinner"></div>';
    } else {
      icon.innerHTML = this.getIcon(type);
    }

    // Create content
    const content = document.createElement('div');
    content.className = 'notification-content';
    
    if (title) {
      const titleEl = document.createElement('div');
      titleEl.className = 'notification-title';
      titleEl.textContent = title;
      content.appendChild(titleEl);
    }

    if (message) {
      const messageEl = document.createElement('div');
      messageEl.className = 'notification-message';
      messageEl.textContent = message;
      content.appendChild(messageEl);
    }

    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'notification-close';
    closeBtn.innerHTML = '×';
    closeBtn.addEventListener('click', () => this.remove(id));

    // Assemble notification
    notification.appendChild(icon);
    notification.appendChild(content);
    notification.appendChild(closeBtn);

    // Add to container
    this.container.appendChild(notification);

    // Store reference
    this.notifications.set(id, {
      element: notification,
      timeout: null,
      persistent
    });

    // Show with animation
    requestAnimationFrame(() => {
      notification.classList.add('show');
    });

    // Auto-remove after duration (unless persistent)
    if (!persistent && duration > 0) {
      const timeout = setTimeout(() => {
        this.remove(id);
      }, duration);
      
      this.notifications.get(id).timeout = timeout;
    }

    return id;
  }

  update(id, options) {
    const notification = this.notifications.get(id);
    if (!notification) return;

    const { title, message, showSpinner = false, type } = options;

    const element = notification.element;
    
    // Update type class if provided
    if (type) {
      element.className = `notification ${type} show`;
    }

    // Update icon
    const iconEl = element.querySelector('.notification-icon');
    if (iconEl) {
      if (showSpinner) {
        iconEl.innerHTML = '<div class="notification-spinner"></div>';
      } else {
        iconEl.innerHTML = this.getIcon(type || 'info');
      }
    }

    // Update content
    const titleEl = element.querySelector('.notification-title');
    const messageEl = element.querySelector('.notification-message');
    
    if (title && titleEl) {
      titleEl.textContent = title;
    }
    
    if (message && messageEl) {
      messageEl.textContent = message;
    }
  }

  remove(id) {
    const notification = this.notifications.get(id);
    if (!notification) return;

    const { element, timeout } = notification;

    // Clear timeout if exists
    if (timeout) {
      clearTimeout(timeout);
    }

    // Remove with animation
    element.classList.remove('show');
    
    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      this.notifications.delete(id);
    }, 300);
  }

  removeAll() {
    for (const id of this.notifications.keys()) {
      this.remove(id);
    }
  }

  getIcon(type) {
    const icons = {
      success: `<svg viewBox="0 0 24 24" fill="none" stroke="#27ae60" stroke-width="2">
                  <polyline points="20,6 9,17 4,12"></polyline>
                </svg>`,
      error: `<svg viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>`,
      warning: `<svg viewBox="0 0 24 24" fill="none" stroke="#f39c12" stroke-width="2">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>`,
      info: `<svg viewBox="0 0 24 24" fill="none" stroke="#3498db" stroke-width="2">
               <circle cx="12" cy="12" r="10"></circle>
               <line x1="12" y1="16" x2="12" y2="12"></line>
               <line x1="12" y1="8" x2="12.01" y2="8"></line>
             </svg>`,
      cache: `<svg viewBox="0 0 24 24" fill="none" stroke="#9b59b6" stroke-width="2">
               <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
               <path d="M21 3v5h-5"/>
               <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
               <path d="M8 16H3v5"/>
             </svg>`,
    };
    
    return icons[type] || icons.info;
  }

  // Convenience methods
  success(title, message, options = {}) {
    return this.show({ type: 'success', title, message, ...options });
  }

  error(title, message, options = {}) {
    return this.show({ type: 'error', title, message, duration: 6000, ...options });
  }

  warning(title, message, options = {}) {
    return this.show({ type: 'warning', title, message, duration: 5000, ...options });
  }

  info(title, message, options = {}) {
    return this.show({ type: 'info', title, message, ...options });
  }

  loading(title, message) {
    return this.show({ 
      type: 'info', 
      title, 
      message, 
      showSpinner: true, 
      persistent: true 
    });
  }

  // Cache-specific notifications
  cache(title, message, options = {}) {
    return this.show({ type: 'cache', title, message, duration: 3000, ...options });
  }


  // Format conversion notifications
  conversion(title, message, options = {}) {
    return this.show({ 
      type: 'info', 
      title: `🔄 ${title}`, 
      message, 
      duration: 5000, 
      ...options 
    });
  }

  // Auto-save notifications (less intrusive)
  autoSave(message = 'Auto-saved') {
    return this.show({
      type: 'cache',
      title: '',
      message,
      duration: 2000
    });
  }

  // Import/Export notifications
  importSuccess(format, count = null) {
    const message = count ? `${count} people imported` : 'Family tree imported successfully';
    return this.success(`${format.toUpperCase()} Import Complete`, message);
  }

  exportSuccess(format) {
    return this.success(`${format.toUpperCase()} Export Complete`, 'File has been downloaded');
  }


  conversionComplete(fromFormat, toFormat) {
    return this.conversion(
      'Format Conversion Complete',
      `Successfully converted from ${fromFormat} to ${toFormat} format`
    );
  }

  // Cache status notifications
  cacheRestored(timestamp) {
    const timeStr = new Date(timestamp).toLocaleString();
    return this.cache('Progress Restored', `Last saved: ${timeStr}`);
  }

  cacheCleared() {
    return this.cache('Cache Cleared', 'All cached progress has been removed');
  }

  autoSaveEnabled() {
    return this.cache('Auto-save Enabled', 'Your progress will be saved automatically');
  }

  autoSaveDisabled() {
    return this.cache('Auto-save Disabled', 'Manual saving required');
  }

  // Batch operations
  showBatchOperation(operationType, count, duration = 4000) {
    return this.show({
      type: 'info',
      title: `Batch ${operationType}`,
      message: `Processing ${count} items...`,
      showSpinner: true,
      duration
    });
  }

  // Connection with progress updates
  showProgress(title, current, total) {
    const percentage = Math.round((current / total) * 100);
    return this.show({
      type: 'info',
      title,
      message: `${current}/${total} (${percentage}%)`,
      persistent: true
    });
  }

  // Error handling with details
  detailedError(title, message, details = null) {
    const fullMessage = details ? `${message}\n\nDetails: ${details}` : message;
    return this.error(title, fullMessage, { duration: 8000 });
  }

  // Validation errors
  validationError(field, issue) {
    return this.warning('Validation Error', `${field}: ${issue}`, { duration: 4000 });
  }

  // Network-related notifications
  networkError(operation) {
    return this.error('Network Error', `Failed to ${operation}. Please check your connection.`);
  }

  // File operations
  fileOperationStart(operation, fileName) {
    return this.loading(`${operation} File`, `Processing ${fileName}...`);
  }

  fileOperationComplete(operation, fileName, success = true) {
    if (success) {
      return this.success(`${operation} Complete`, `${fileName} processed successfully`);
    } else {
      return this.error(`${operation} Failed`, `Could not process ${fileName}`);
    }
  }

  // Compatibility warnings
  compatibilityWarning(feature, recommendation) {
    return this.warning(
      'Compatibility Notice',
      `${feature} may not be fully compatible. ${recommendation}`,
      { duration: 6000 }
    );
  }

  // Feature announcements
  featureAnnouncement(feature, description) {
    return this.info(`New Feature: ${feature}`, description, { duration: 7000 });
  }
}

// Create global instance
export const notifications = new NotificationManager();

// Also make it available globally for easier access
window.notifications = notifications;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  notifications.init();
});
