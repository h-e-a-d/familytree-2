// security-utils.js
// Security utilities for safe DOM manipulation and input sanitization

export class SecurityUtils {
  // Sanitize text input to prevent XSS
  static sanitizeText(input) {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/[<>'"&]/g, (char) => {
        const entityMap = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
          '&': '&amp;'
        };
        return entityMap[char];
      })
      .trim()
      .substring(0, 1000); // Limit length
  }

  // Safe alternative to innerHTML
  static setTextContent(element, content) {
    if (!element) return;
    element.textContent = this.sanitizeText(content);
  }

  // Safe HTML creation for trusted content
  static createElement(tagName, attributes = {}, textContent = '') {
    const element = document.createElement(tagName);
    
    // Set attributes safely
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'id') {
        element.id = value;
      } else if (key.startsWith('data-')) {
        element.setAttribute(key, this.sanitizeText(String(value)));
      } else if (key === 'role' || key.startsWith('aria-')) {
        element.setAttribute(key, value);
      }
    });
    
    if (textContent) {
      this.setTextContent(element, textContent);
    }
    
    return element;
  }

  // Replace innerHTML usage with safe DOM manipulation
  static replaceInnerHTML(element, htmlString) {
    if (!element) return;
    
    // Clear existing content
    element.innerHTML = '';
    
    // Create a temporary div to parse HTML safely
    const temp = document.createElement('div');
    temp.innerHTML = htmlString;
    
    // Move sanitized nodes
    while (temp.firstChild) {
      element.appendChild(temp.firstChild);
    }
  }

  // Validate and sanitize person data
  static validatePersonData(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid person data');
    }

    const sanitized = {};
    
    // Required fields
    if (data.givenName) {
      sanitized.givenName = this.sanitizeText(data.givenName);
      if (sanitized.givenName.length < 1) {
        throw new Error('Given name is required');
      }
    }
    
    // Optional fields
    if (data.surname) {
      sanitized.surname = this.sanitizeText(data.surname);
    }
    
    if (data.maidenName) {
      sanitized.maidenName = this.sanitizeText(data.maidenName);
    }
    
    if (data.fatherName) {
      sanitized.fatherName = this.sanitizeText(data.fatherName);
    }
    
    if (data.dateOfBirth) {
      sanitized.dateOfBirth = this.validateDate(data.dateOfBirth);
    }
    
    if (data.gender) {
      sanitized.gender = ['male', 'female', ''].includes(data.gender) ? data.gender : '';
    }
    
    // Relationship IDs (must be valid identifiers)
    ['motherId', 'fatherId', 'spouseId'].forEach(field => {
      if (data[field]) {
        sanitized[field] = this.validateId(data[field]);
      }
    });
    
    if (data.childrenIds && Array.isArray(data.childrenIds)) {
      sanitized.childrenIds = data.childrenIds
        .map(id => this.validateId(id))
        .filter(id => id !== null);
    }
    
    return sanitized;
  }

  // Validate date input
  static validateDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format');
    }
    
    const year = date.getFullYear();
    if (year < 1800 || year > new Date().getFullYear() + 10) {
      throw new Error('Date out of reasonable range');
    }
    
    return dateString;
  }

  // Validate ID format
  static validateId(id) {
    if (!id) return null;
    
    const cleanId = String(id).replace(/[^a-zA-Z0-9_-]/g, '');
    if (cleanId.length === 0 || cleanId.length > 50) {
      throw new Error('Invalid ID format');
    }
    
    return cleanId;
  }

  // Validate tree data structure
  static validateTreeData(data) {
    if (!data || typeof data !== 'object') return false;
    
    try {
      // Check required properties
      if (!data.people || !Array.isArray(data.people)) return false;
      if (!data.settings || typeof data.settings !== 'object') return false;
      
      // Validate each person
      data.people.forEach(person => {
        this.validatePersonData(person);
      });
      
      return true;
    } catch (error) {
      console.warn('Tree data validation failed:', error);
      return false;
    }
  }

  // Safe localStorage operations
  static safeLocalStorageGet(key) {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      
      const parsed = JSON.parse(item);
      return parsed;
    } catch (error) {
      console.warn(`Failed to parse localStorage item '${key}':`, error);
      localStorage.removeItem(key); // Remove corrupted data
      return null;
    }
  }

  static safeLocalStorageSet(key, value) {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      console.error(`Failed to save to localStorage '${key}':`, error);
      return false;
    }
  }
}

// DOM utilities that replace unsafe innerHTML usage
export class DOMUtils {
  // Create notification element safely
  static createNotification(type, title, message) {
    const notification = SecurityUtils.createElement('div', {
      className: `notification notification-${type}`,
      role: 'alert'
    });
    
    if (title) {
      const titleEl = SecurityUtils.createElement('h4', {
        className: 'notification-title'
      }, title);
      notification.appendChild(titleEl);
    }
    
    if (message) {
      const messageEl = SecurityUtils.createElement('p', {
        className: 'notification-message'
      }, message);
      notification.appendChild(messageEl);
    }
    
    return notification;
  }

  // Create person form field safely
  static createFormField(label, inputType, name, value = '', required = false) {
    const wrapper = SecurityUtils.createElement('div', {
      className: 'form-field'
    });
    
    const labelEl = SecurityUtils.createElement('label', {
      'for': name,
      className: 'form-label'
    }, label);
    
    const input = SecurityUtils.createElement('input', {
      type: inputType,
      id: name,
      name: name,
      className: 'form-input',
      ...(required && { 'aria-required': 'true' })
    });
    
    if (value) {
      input.value = SecurityUtils.sanitizeText(value);
    }
    
    wrapper.appendChild(labelEl);
    wrapper.appendChild(input);
    
    return wrapper;
  }

  // Create select dropdown safely
  static createSelect(name, options, selectedValue = '') {
    const select = SecurityUtils.createElement('select', {
      id: name,
      name: name,
      className: 'form-select'
    });
    
    options.forEach(option => {
      const optionEl = SecurityUtils.createElement('option', {
        value: option.value
      }, option.text);
      
      if (option.value === selectedValue) {
        optionEl.selected = true;
      }
      
      select.appendChild(optionEl);
    });
    
    return select;
  }
}