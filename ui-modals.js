// ui-modals.js
// Modal and dialog manager for family tree

import { notifications } from './notifications.js';

export function setupModals(treeCore) {
  // --- Style Modal ---
  treeCore.setupStyleModal = function() {
    const styleModal = document.getElementById('styleModal');
    const cancelBtn = document.getElementById('cancelStyleModal');
    const applyBtn = document.getElementById('applySelectedStyle');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        treeCore.closeStyleModal();
      });
    }
    if (applyBtn) {
      applyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        treeCore.applySelectedStyles();
      });
    }
    if (styleModal) {
      styleModal.addEventListener('click', (e) => {
        if (e.target === styleModal) {
          treeCore.closeStyleModal();
        }
      });
    }
    const modalContent = styleModal?.querySelector('.modal-content');
    if (modalContent) {
      modalContent.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
  };

  treeCore.openStyleModal = function() {
    const styleModal = document.getElementById('styleModal');
    if (styleModal) {
      styleModal.classList.remove('hidden');
      styleModal.style.display = 'flex';
    }
  };

  treeCore.closeStyleModal = function() {
    const styleModal = document.getElementById('styleModal');
    if (styleModal) {
      styleModal.classList.add('hidden');
      styleModal.style.display = 'none';
    }
  };

  // --- Line Removal Modal ---
  treeCore.setupLineRemovalModal = function() {
    treeCore.createLineRemovalModal();
    const lineRemovalModal = document.getElementById('lineRemovalModal');
    const cancelBtn = document.getElementById('cancelLineRemoval');
    const confirmBtn = document.getElementById('confirmLineRemoval');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        treeCore.closeLineRemovalModal();
      });
    }
    if (confirmBtn) {
      confirmBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        treeCore.confirmLineRemoval();
      });
    }
    if (lineRemovalModal) {
      lineRemovalModal.addEventListener('click', (e) => {
        if (e.target === lineRemovalModal) {
          treeCore.closeLineRemovalModal();
        }
      });
    }
    const modalContent = lineRemovalModal?.querySelector('.modal-content');
    if (modalContent) {
      modalContent.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
  };

  treeCore.createLineRemovalModal = function() {
    if (document.getElementById('lineRemovalModal')) return;
    const modal = document.createElement('div');
    modal.id = 'lineRemovalModal';
    modal.className = 'modal hidden';
    modal.innerHTML = `
      <div class="modal-content">
        <h2>Remove Connection Line</h2>
        <p style="margin-bottom: 20px; color: #666; font-size: 14px; line-height: 1.5;">
          This will hide the visual connection line but preserve the relationship data. 
          The family relationship will remain intact and can be restored later.
        </p>
        <div class="form-actions">
          <button type="button" id="cancelLineRemoval">Cancel</button>
          <button type="button" id="confirmLineRemoval" class="btn-danger">Hide Line</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  };

  treeCore.openLineRemovalModal = function(connection) {
    const lineRemovalModal = document.getElementById('lineRemovalModal');
    if (!lineRemovalModal) return;
    lineRemovalModal.classList.remove('hidden');
    lineRemovalModal.style.display = 'flex';
  };

  treeCore.closeLineRemovalModal = function() {
    const lineRemovalModal = document.getElementById('lineRemovalModal');
    if (lineRemovalModal) {
      lineRemovalModal.classList.add('hidden');
      lineRemovalModal.style.display = 'none';
    }
    treeCore.currentConnectionToRemove = null;
  };

  treeCore.confirmLineRemoval = function() {
    if (!treeCore.currentConnectionToRemove) {
      treeCore.closeLineRemovalModal();
      return;
    }
    const { connection, index } = treeCore.currentConnectionToRemove;
    const connectionKey = treeCore.getConnectionKey(connection.from, connection.to);
    treeCore.hiddenConnections.add(connectionKey);
    treeCore.renderer.removeConnection(index);
    notifications.info('Line Hidden', 'Connection line hidden (relationship data preserved)');
    treeCore.closeLineRemovalModal();
    treeCore.undoRedoManager.pushUndoState();
  };

  // Initialize modals
  treeCore.setupStyleModal();
  treeCore.setupLineRemovalModal();
}

// ================== MODAL UX ENHANCER ==================
// Enhanced Modal UX/UI system for Family Tree Builder
// Provides advanced interactions, animations, and mobile optimizations

class ModalUXEnhancer {
  constructor() {
    this.isMobile = window.innerWidth <= 768;
    this.activeModal = null;
    this.originalBodyOverflow = '';
    this.focusTrap = null;
    this.rippleEffects = new Set();
    this.loadingStates = new Map();
    this.touchStartTime = 0;
    this.touchStartPos = { x: 0, y: 0 };
    this.isProcessingModal = false; // Prevent infinite loops in mutation observer
    this.isEnhancingModal = false; // Prevent enhancement loops
    
    // Animation settings
    this.animationDuration = {
      short: 200,
      medium: 300,
      long: 500
    };
    
    // Touch interaction settings
    this.doubleTapThreshold = 300; // ms
    this.touchDistanceThreshold = 10; // px
    
    this.init();
  }

  init() {
    console.log('🎨 Initializing Modal UX Enhancer...');
    
    this.setupGlobalEventListeners();
    this.enhanceExistingModals();
    this.setupMobileOptimizations();
    this.setupAccessibilityFeatures();
    this.injectEnhancedStyles();
    this.setupPerformanceOptimizations();
    
    console.log('✅ Modal UX Enhancer initialized successfully');
  }

  setupGlobalEventListeners() {
    // Enhanced resize handling with debouncing
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.isMobile = window.innerWidth <= 768;
        this.updateModalForScreenSize();
        this.recalculateModalPositions();
        this.adjustMobileViewport();
      }, 100);
    });

    // Initial mobile viewport adjustment
    this.adjustMobileViewport();

    // Enhanced escape key handling
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeModal) {
        this.closeModalWithAnimation(this.activeModal);
      }
    });

    // Modal state observer with enhanced detection
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Skip if we're currently processing a modal to prevent infinite loops
        if (this.isProcessingModal || this.isEnhancingModal) return;
        
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const modal = mutation.target;
          if (modal.classList.contains('modal')) {
            // Skip enhancement-related class changes
            if (mutation.oldValue && mutation.oldValue.includes('modal-enhanced')) return;
            
            const isVisible = !modal.classList.contains('hidden') && modal.style.display !== 'none';
            
            if (isVisible && this.activeModal !== modal) {
              this.isProcessingModal = true;
              this.onModalOpen(modal);
              this.isProcessingModal = false;
            } else if (!isVisible && this.activeModal === modal) {
              this.isProcessingModal = true;
              this.onModalClose(modal);
              this.isProcessingModal = false;
            }
          }
        }
        
        // Watch for style changes too
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const modal = mutation.target;
          if (modal.classList.contains('modal')) {
            const isVisible = modal.style.display === 'flex' || 
                            (modal.style.display !== 'none' && !modal.classList.contains('hidden'));
            
            if (isVisible && this.activeModal !== modal) {
              this.isProcessingModal = true;
              this.onModalOpen(modal);
              this.isProcessingModal = false;
            } else if (!isVisible && this.activeModal === modal) {
              this.isProcessingModal = true;
              this.onModalClose(modal);
              this.isProcessingModal = false;
            }
          }
        }
      });
    });

    // Observe all existing and future modals
    document.querySelectorAll('.modal').forEach(modal => {
      observer.observe(modal, { 
        attributes: true, 
        attributeFilter: ['class', 'style'],
        subtree: true 
      });
    });

    // Observe document for new modals
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Store observer for cleanup
    this.observer = observer;
  }

  enhanceExistingModals() {
    document.querySelectorAll('.modal').forEach(modal => {
      this.enhanceModal(modal);
    });
  }

  enhanceModal(modal) {
    if (this.isEnhancingModal) return; // Prevent enhancement loops
    
    // Skip enhancement for personModal - it has custom styling in modal.css
    if (modal && modal.id === 'personModal') {
      console.log('🚫 Skipping enhancement for personModal - using custom modal.css styles');
      return;
    }

    // Skip enhancement for sidebar elements - they have their own styling
    if (modal && modal.closest('.sidebar')) {
      console.log('🚫 Skipping enhancement for sidebar elements - using custom sidebar styles');
      return;
    }
    
    this.isEnhancingModal = true;

    console.log('🔧 Enhancing modal:', modal.id || 'unnamed');

    // Add enhanced class and processing flag
    modal.classList.add('modal-enhanced', 'modal-enhanced-processed');

    // Enhance modal content structure
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
      this.ensureModalStructure(modalContent);
      this.enhanceFormActions(modalContent);
      this.enhanceGenderRadioButtons(modalContent);
      this.enhanceFormInputs(modalContent);
      this.addSmoothScrolling(modalContent);
      this.addLoadingStateSupport(modalContent);
    }

    // Enhanced click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeModalWithAnimation(modal);
      }
    });

    // Prevent modal content clicks from closing modal
    if (modalContent) {
      modalContent.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    // Add touch support for mobile
    if (this.isMobile) {
      this.addMobileTouchSupport(modal);
    }

    this.isEnhancingModal = false;
  }

  ensureModalStructure(modalContent) {
    // Ensure proper header structure
    const title = modalContent.querySelector('h2');
    if (title && !title.closest('.modal-header')) {
      const header = document.createElement('div');
      header.className = 'modal-header';
      
      // Move title to header
      title.parentNode.insertBefore(header, title);
      header.appendChild(title);
    }

    // Ensure modal body structure
    const form = modalContent.querySelector('form');
    if (form && !form.closest('.modal-body')) {
      const body = document.createElement('div');
      body.className = 'modal-body';
      
      // Move form to body
      form.parentNode.insertBefore(body, form);
      body.appendChild(form);
    }
  }

  enhanceFormActions(modalContent) {
    const formActions = modalContent.querySelector('.form-actions');
    if (!formActions) return;

    // Skip enhancement for person modal - it has custom styling in modal.css
    const modal = modalContent.closest('.modal');
    if (modal && modal.id === 'personModal') {
      console.log('Skipping enhancement for personModal - using custom modal.css styles');
      return;
    }

    // Skip enhancement for sidebar buttons - they have their own styling
    if (modalContent.closest('.sidebar')) {
      console.log('Skipping enhancement for sidebar buttons - using custom sidebar styles');
      return;
    }

    // Add enhanced class
    formActions.classList.add('form-actions-enhanced');

    // Ensure proper button organization
    this.organizeActionButtons(formActions);

    // Enhance buttons
    const buttons = formActions.querySelectorAll('button');
    buttons.forEach(button => {
      this.enhanceButton(button);
    });

    // Better mobile layout
    if (this.isMobile) {
      this.optimizeFormActionsForMobile(formActions);
    }
  }

  organizeActionButtons(formActions) {
    // Ensure .form-actions-right exists for proper layout
    let rightActions = formActions.querySelector('.form-actions-right');
    if (!rightActions) {
      rightActions = document.createElement('div');
      rightActions.className = 'form-actions-right';
      formActions.appendChild(rightActions);
    }

    // Move appropriate buttons to right side
    const cancelBtn = formActions.querySelector('[id*="cancel"]');
    const saveBtn = formActions.querySelector('[id*="save"], [id*="apply"]');
    
    if (cancelBtn && !rightActions.contains(cancelBtn)) {
      rightActions.appendChild(cancelBtn);
    }
    if (saveBtn && !rightActions.contains(saveBtn)) {
      rightActions.appendChild(saveBtn);
    }
  }

  enhanceButton(button) {
    if (button.classList.contains('button-enhanced')) {
      return; // Already enhanced
    }

    // Skip UI control buttons - they have their own styling
    if (button.closest('.sidebar') || 
        button.closest('.zoom-controls') || 
        button.closest('.top-toolbar') || 
        button.closest('.floating-buttons')) {
      return;
    }

    button.classList.add('button-enhanced');

    // Add ripple effect on click
    button.addEventListener('click', (e) => {
      this.createRippleEffect(button, e);
    });

    // Add loading state functionality for specific buttons
    // DISABLED: This automatic button loading management conflicts with modal.js
    // The buttons (savePerson, confirmDeletePerson, applySelectedStyle) are already
    // properly managed by their respective modal handlers in modal.js
    // Keeping this code would cause the critical bug where buttons become permanently disabled
    /*
    if (button.id === 'savePerson' || 
        button.id === 'confirmDeletePerson' || 
        button.id === 'applySelectedStyle') {
      
      button.addEventListener('click', () => {
        this.setButtonLoading(button, true);
        
        // Auto-clear loading state after reasonable time
        setTimeout(() => {
          this.setButtonLoading(button, false);
        }, 3000);
      });
    }
    */

    // Improve button accessibility
    if (!button.getAttribute('aria-label') && button.textContent) {
      button.setAttribute('aria-label', button.textContent.trim());
    }

    // Add keyboard interaction improvements
    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        button.click();
      }
    });

    // Add focus enhancements
    button.addEventListener('focus', () => {
      button.style.transform = 'translateY(-1px)';
    });

    button.addEventListener('blur', () => {
      button.style.transform = '';
    });
  }

  optimizeFormActionsForMobile(formActions) {
    // Skip mobile optimization for person modal - it has custom styling in modal.css
    const modal = formActions.closest('.modal');
    if (modal && modal.id === 'personModal') {
      console.log('Skipping mobile optimization for personModal - using custom modal.css styles');
      return;
    }

    const buttons = formActions.querySelectorAll('button');
    
    // Ensure proper touch targets (skip if this is in UI control areas)
    if (!formActions.closest('.sidebar') && 
        !formActions.closest('.zoom-controls') && 
        !formActions.closest('.top-toolbar') && 
        !formActions.closest('.floating-buttons')) {
      buttons.forEach(button => {
        const currentHeight = parseFloat(getComputedStyle(button).height);
        if (currentHeight < 44) { // iOS minimum touch target
          button.style.minHeight = '44px';
          button.style.padding = '12px 20px';
        }
      });
    }

    // Stack buttons vertically on very small screens
    if (window.innerWidth < 480) {
      formActions.style.flexDirection = 'column-reverse';
      formActions.style.gap = '12px';
      
      const rightActions = formActions.querySelector('.form-actions-right');
      if (rightActions) {
        rightActions.style.flexDirection = 'column';
        rightActions.style.width = '100%';
      }
    }
  }

  enhanceGenderRadioButtons(modalContent) {
    const genderGroup = modalContent.querySelector('.gender-radio-group');
    if (!genderGroup || genderGroup.classList.contains('gender-enhanced')) {
      return;
    }

    // Add enhanced class
    genderGroup.classList.add('gender-enhanced');

    // Enhance radio options
    const radioOptions = genderGroup.querySelectorAll('.gender-radio-option');
    radioOptions.forEach(option => {
      this.enhanceGenderRadioOption(option);
    });
  }

  enhanceGenderRadioOption(option) {
    // Add click handler for better UX
    option.addEventListener('click', (e) => {
      const radio = option.querySelector('input[type="radio"]');
      if (radio && !radio.checked) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
        this.updateGenderRadioStyles(option.closest('.gender-radio-group'));
      }
    });

    // Add keyboard navigation
    option.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        option.click();
      }
    });

    // Make focusable for keyboard navigation
    if (!option.getAttribute('tabindex')) {
      option.setAttribute('tabindex', '0');
    }
  }

  updateGenderRadioStyles(genderGroup) {
    const options = genderGroup.querySelectorAll('.gender-radio-option');
    options.forEach(option => {
      const radio = option.querySelector('input[type="radio"]');
      if (radio && radio.checked) {
        option.classList.add('selected');
      } else {
        option.classList.remove('selected');
      }
    });
  }

  enhanceFormInputs(modalContent) {
    const inputs = modalContent.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      this.enhanceFormInput(input);
    });
  }

  enhanceFormInput(input) {
    // Add focus enhancements
    input.addEventListener('focus', () => {
      const formGroup = input.closest('.form-group');
      if (formGroup) {
        formGroup.classList.add('focused');
        this.clearFieldError(formGroup);
      }
    });

    input.addEventListener('blur', () => {
      const formGroup = input.closest('.form-group');
      if (formGroup) {
        formGroup.classList.remove('focused');
      }
    });

    // Add validation feedback
    input.addEventListener('input', () => {
      const formGroup = input.closest('.form-group');
      if (formGroup && formGroup.classList.contains('error')) {
        this.clearFieldError(formGroup);
      }
    });
  }

  clearFieldError(formGroup) {
    formGroup.classList.remove('error');
    const errorMessage = formGroup.querySelector('.error-message');
    if (errorMessage) {
      errorMessage.remove();
    }
  }

  addSmoothScrolling(modalContent) {
    modalContent.style.scrollBehavior = 'smooth';
    modalContent.style.overflowY = 'auto';
    modalContent.style.maxHeight = '80vh';
  }

  addLoadingStateSupport(modalContent) {
    // Add loading state management
    modalContent.addEventListener('submit', () => {
      const submitBtn = modalContent.querySelector('button[type="submit"]');
      if (submitBtn) {
        this.setButtonLoading(submitBtn, true);
      }
    });
  }

  addMobileTouchSupport(modal) {
    // Add touch gesture support
    let touchStartY = 0;
    let touchStartTime = 0;

    modal.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    }, { passive: true });

    modal.addEventListener('touchend', (e) => {
      const touchEndY = e.changedTouches[0].clientY;
      const touchEndTime = Date.now();
      const deltaY = touchEndY - touchStartY;
      const deltaTime = touchEndTime - touchStartTime;

      // Swipe down to close (if touch started at top of modal)
      if (deltaY > 100 && deltaTime < 300 && touchStartY < 100) {
        this.closeModalWithAnimation(modal);
      }
    }, { passive: true });
  }

  setupMobileOptimizations() {
    if (!this.isMobile) return;

    // Prevent viewport zoom on input focus
    this.preventViewportZoom();

    // Optimize touch targets
    this.optimizeTouchTargets();
  }

  preventViewportZoom() {
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        input.style.fontSize = '16px'; // Prevents iOS zoom
      });
    });
  }

  optimizeTouchTargets() {
    const buttons = document.querySelectorAll('button, .btn, [role="button"]');
    buttons.forEach(button => {
      // Skip UI controls - they have their own sizing
      if (button.closest('.sidebar') || 
          button.closest('.zoom-controls') || 
          button.closest('.top-toolbar') || 
          button.closest('.floating-buttons')) {
        return;
      }
      
      const rect = button.getBoundingClientRect();
      if (rect.height < 44 || rect.width < 44) {
        button.style.minHeight = '44px';
        button.style.minWidth = '44px';
        button.style.padding = '12px 16px';
      }
    });
  }

  setupAccessibilityFeatures() {
    // Add skip links for keyboard navigation
    this.addModalSkipLinks();

    // Add ARIA labels and roles
    document.querySelectorAll('.modal').forEach(modal => {
      if (!modal.getAttribute('role')) {
        modal.setAttribute('role', 'dialog');
      }
      if (!modal.getAttribute('aria-modal')) {
        modal.setAttribute('aria-modal', 'true');
      }
    });
  }

  addModalSkipLinks() {
    // Add skip to content links for accessibility
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link';
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      background: #000;
      color: white;
      padding: 8px;
      text-decoration: none;
      z-index: 10000;
      border-radius: 4px;
    `;
    
    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '6px';
    });
    
    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px';
    });
    
    document.body.appendChild(skipLink);
  }

  injectEnhancedStyles() {
    const styleId = 'modal-enhancement-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Modal Enhancement Styles */
      .modal-enhanced {
        backdrop-filter: blur(4px);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .modal-enhanced .modal-content {
        transform: scale(0.9);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .modal-enhanced:not(.hidden) .modal-content {
        transform: scale(1);
        opacity: 1;
      }

      .modal-closing .modal-content {
        transform: scale(0.9);
        opacity: 0;
      }

      .form-actions-enhanced {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid #e5e7eb;
      }

      .form-actions-right {
        display: flex;
        gap: 8px;
      }

      .button-enhanced {
        position: relative;
        overflow: hidden;
        transition: all 0.2s ease;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
      }

      /* Exclude UI control buttons from enhancement styles */
      .sidebar .button-enhanced,
      .zoom-controls .button-enhanced,
      .top-toolbar .button-enhanced,
      .floating-buttons .button-enhanced {
        position: unset !important;
        overflow: unset !important;
        transition: unset !important;
        border-radius: unset !important;
        font-weight: unset !important;
        cursor: unset !important;
        transform: unset !important;
        box-shadow: unset !important;
      }

      .button-enhanced:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      /* Don't apply hover effects to UI control buttons */
      .sidebar .button-enhanced:hover,
      .zoom-controls .button-enhanced:hover,
      .top-toolbar .button-enhanced:hover,
      .floating-buttons .button-enhanced:hover {
        transform: unset !important;
        box-shadow: unset !important;
      }

      .button-enhanced:active {
        transform: translateY(0);
      }

      /* Don't apply active effects to UI control buttons */
      .sidebar .button-enhanced:active,
      .zoom-controls .button-enhanced:active,
      .top-toolbar .button-enhanced:active,
      .floating-buttons .button-enhanced:active {
        transform: unset !important;
      }

      .button-enhanced.loading {
        pointer-events: none;
        opacity: 0.7;
      }

      .button-enhanced.loading::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 16px;
        height: 16px;
        margin: -8px 0 0 -8px;
        border: 2px solid transparent;
        border-top: 2px solid currentColor;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      .gender-enhanced {
        display: flex;
        gap: 12px;
        margin: 16px 0;
      }

      .gender-radio-option {
        flex: 1;
        padding: 12px;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: center;
        position: relative;
      }

      .gender-radio-option:hover {
        border-color: #3b82f6;
        background-color: #f8fafc;
      }

      .gender-radio-option.selected {
        border-color: #3b82f6;
        background-color: #eff6ff;
        color: #1d4ed8;
      }

      .gender-radio-option input[type="radio"] {
        position: absolute;
        opacity: 0;
        pointer-events: none;
      }

      .form-group.focused {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      .form-group.error {
        border-color: #ef4444;
      }

      .error-message {
        color: #ef4444;
        font-size: 14px;
        margin-top: 4px;
      }

      .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: scale(0);
        animation: ripple 0.6s ease-out;
        pointer-events: none;
      }

      @keyframes ripple {
        to {
          transform: scale(4);
          opacity: 0;
        }
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .skip-link:focus {
        top: 6px !important;
      }

      /* Mobile optimizations */
      @media (max-width: 768px) {
        .modal-enhanced .modal-content {
          margin: 16px;
          max-height: calc(100vh - 32px);
          width: calc(100vw - 32px);
        }

        .form-actions-enhanced {
          flex-direction: column-reverse;
          gap: 12px;
        }

        .form-actions-right {
          width: 100%;
          flex-direction: column;
        }

        .gender-enhanced {
          flex-direction: column;
        }
      }
    `;

    document.head.appendChild(style);
  }

  setupPerformanceOptimizations() {
    // Preload modal assets
    this.preloadModalAssets();

    // Optimize modal rendering
    this.optimizeModalRendering();
  }

  preloadModalAssets() {
    // Preload critical modal assets
    const assets = [
      // Add any critical assets here
    ];

    assets.forEach(asset => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = asset;
      document.head.appendChild(link);
    });
  }

  optimizeModalRendering() {
    // Use requestAnimationFrame for smooth animations
    const originalShowModal = this.showModalWithAnimation;
    this.showModalWithAnimation = (modal) => {
      requestAnimationFrame(() => {
        originalShowModal.call(this, modal);
      });
    };
  }

  onModalOpen(modal) {
    console.log('🔒 onModalOpen called for:', modal.id || 'unnamed', 'Active modal:', this.activeModal?.id);
    
    // Prevent duplicate processing
    if (this.activeModal === modal) {
      console.log('⚠️ Modal already active, skipping');
      return;
    }
    
    this.activeModal = modal;
    this.originalBodyOverflow = document.body.style.overflow;
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
    
    // Add mobile optimizations
    if (this.isMobile) {
      this.optimizeForMobile(modal);
      this.adjustMobileViewport(); // Ensure proper viewport handling
    }
    
    // Setup focus trap
    this.setupFocusTrap(modal);
    
    // Focus first input
    this.focusFirstInput(modal);
    
    // Add entrance animation
    this.addEntranceAnimation(modal);
    
    console.log('🔒 Modal opened:', modal.id || 'unnamed');
  }

  onModalClose(modal) {
    this.activeModal = null;
    
    // Restore body scroll
    document.body.style.overflow = this.originalBodyOverflow;
    document.body.classList.remove('modal-open');
    
    // Remove mobile optimizations
    if (this.isMobile) {
      this.removeMobileOptimizations(modal);
    }
    
    // Clear loading states
    this.clearAllLoadingStates(modal);
    
    // Clear ripple effects
    this.clearRippleEffects(modal);
    
    console.log('🔒 Modal closed:', modal.id || 'unnamed');
  }

  setupFocusTrap(modal) {
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    const trapFocus = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };
    
    modal.addEventListener('keydown', trapFocus);
    this.focusTrap = trapFocus;
  }

  focusFirstInput(modal) {
    setTimeout(() => {
      const firstInput = modal.querySelector('input, textarea, select');
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
  }

  optimizeForMobile(modal) {
    document.body.classList.add('mobile-enhanced');
    
    // Add mobile-specific styles
    modal.style.fontSize = '16px'; // Prevent zoom on iOS
    
    // Ensure proper viewport handling
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
    }
  }

  removeMobileOptimizations(modal) {
    document.body.classList.remove('mobile-enhanced');
    
    // Restore viewport
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1');
    }
  }

  addEntranceAnimation(modal) {
    modal.classList.add('modal-entering');
    
    setTimeout(() => {
      modal.classList.remove('modal-entering');
    }, this.animationDuration.medium);
  }

  updateModalForScreenSize() {
    if (this.activeModal) {
      if (this.isMobile) {
        this.optimizeForMobile(this.activeModal);
      } else {
        this.removeMobileOptimizations(this.activeModal);
      }
    }
  }

  recalculateModalPositions() {
    document.querySelectorAll('.modal').forEach(modal => {
      if (!modal.classList.contains('hidden')) {
        // Recalculate position if needed
        const rect = modal.getBoundingClientRect();
        if (rect.top < 0) {
          modal.style.top = '16px';
        }
      }
    });
  }

  createRippleEffect(button, event) {
    // Clean up any existing ripples
    const existingRipples = button.querySelectorAll('.ripple');
    existingRipples.forEach(ripple => ripple.remove());
    
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.className = 'ripple';
    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple 0.6s ease-out;
      pointer-events: none;
      z-index: 1;
    `;
    
    button.style.position = 'relative';
    button.style.overflow = 'hidden';
    button.appendChild(ripple);
    
    this.rippleEffects.add(ripple);
    
    setTimeout(() => {
      ripple.remove();
      this.rippleEffects.delete(ripple);
    }, 600);
  }

  clearRippleEffects(modal) {
    modal.querySelectorAll('.ripple').forEach(ripple => {
      ripple.remove();
      this.rippleEffects.delete(ripple);
    });
  }

  // Loading state management
  setButtonLoading(button, isLoading) {
    if (isLoading) {
      // Store original state BEFORE modifying the button
      this.loadingStates.set(button, {
        text: button.textContent,
        html: button.innerHTML,
        disabled: button.disabled  // Capture state before we change it
      });
      
      // Now set loading state
      button.classList.add('loading');
      button.disabled = true;
      button.setAttribute('aria-label', 'Loading...');
    } else {
      button.classList.remove('loading');
      
      // Restore original state
      const originalState = this.loadingStates.get(button);
      if (originalState) {
        button.disabled = originalState.disabled;
        button.removeAttribute('aria-label');
        this.loadingStates.delete(button);
      } else {
        // Safety fallback: enable button if no stored state
        button.disabled = false;
        button.removeAttribute('aria-label');
      }
      
      console.log('🔄 Button loading state cleared:', button.id || button.textContent, 'disabled:', button.disabled);
    }
  }

  clearAllLoadingStates(modal) {
    modal.querySelectorAll('.loading').forEach(button => {
      this.setButtonLoading(button, false);
    });
  }

  // Modal control methods
  closeModalWithAnimation(modal) {
    modal.classList.add('modal-closing');
    
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('modal-enhanced', 'modal-closing');
      modal.style.display = 'none';
      
      // Trigger modal close event
      modal.dispatchEvent(new CustomEvent('modalClosed'));
    }, this.animationDuration.medium);
  }

  // Public API methods
  static enhance() {
    if (!window.modalUXEnhancer) {
      window.modalUXEnhancer = new ModalUXEnhancer();
    }
    return window.modalUXEnhancer;
  }

  static setButtonLoading(buttonId, isLoading) {
    const button = document.getElementById(buttonId);
    if (button && window.modalUXEnhancer) {
      window.modalUXEnhancer.setButtonLoading(button, isLoading);
    }
  }

  static closeActiveModal() {
    if (window.modalUXEnhancer && window.modalUXEnhancer.activeModal) {
      window.modalUXEnhancer.closeModalWithAnimation(window.modalUXEnhancer.activeModal);
    }
  }

  static getActiveModal() {
    return window.modalUXEnhancer ? window.modalUXEnhancer.activeModal : null;
  }

  // Mobile viewport adjustment for URL bar issues
  adjustMobileViewport() {
    if (!this.isMobile) return;
    
    // Set CSS custom property for actual viewport height
    const actualVH = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${actualVH}px`);
    
    // Adjust active modal if exists
    if (this.activeModal) {
      const modal = this.activeModal;
      const modalContent = modal.querySelector('.modal-content');
      
      if (modalContent) {
        // Calculate safe area for modal content
        const safeHeight = window.innerHeight - 120; // Conservative spacing
        modalContent.style.maxHeight = `${safeHeight}px`;
        
        // Ensure form actions are positioned safely
        const formActions = modalContent.querySelector('.form-actions');
        if (formActions) {
          // Make sure form actions are sticky and visible
          formActions.style.position = 'sticky';
          formActions.style.bottom = '0';
          formActions.style.zIndex = '30';
          formActions.style.backgroundColor = '#ffffff';
          formActions.style.borderTop = '1px solid #f1f5f9';
        }
      }
    }
    
    console.log('📱 Mobile viewport adjusted:', { 
      innerHeight: window.innerHeight, 
      vh: actualVH,
      isMobile: this.isMobile 
    });
  }

  // Cleanup
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    if (this.focusTrap) {
      this.focusTrap.remove();
    }
    
    // Clear all loading states
    this.loadingStates.clear();
    
    // Clear ripple effects
    this.rippleEffects.forEach(ripple => ripple.remove());
    this.rippleEffects.clear();
    
    // Restore body scroll
    document.body.style.overflow = this.originalBodyOverflow;
    document.body.classList.remove('modal-open', 'mobile-enhanced');
    
    console.log('🧹 Modal UX Enhancer destroyed');
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    ModalUXEnhancer.enhance();
  });
} else {
  ModalUXEnhancer.enhance();
}

// Handle dynamic modal creation
const dynamicModalObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.classList && node.classList.contains('modal')) {
          // New modal added
          if (window.modalUXEnhancer) {
            window.modalUXEnhancer.enhanceModal(node);
          }
        } else if (node.querySelector) {
          // Check for modals in added subtree
          const modals = node.querySelectorAll('.modal');
          modals.forEach(modal => {
            if (window.modalUXEnhancer) {
              window.modalUXEnhancer.enhanceModal(modal);
            }
          });
        }
      }
    });
  });
});

dynamicModalObserver.observe(document.body, {
  childList: true,
  subtree: true
});

// Export for external use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ModalUXEnhancer;
} else if (typeof window !== 'undefined') {
  window.ModalUXEnhancer = ModalUXEnhancer;
}

// Add global utility functions
window.modalUtils = {
  setLoading: (buttonId, isLoading) => ModalUXEnhancer.setButtonLoading(buttonId, isLoading),
  closeActive: () => ModalUXEnhancer.closeActiveModal(),
  getActive: () => ModalUXEnhancer.getActiveModal(),
  enhance: () => ModalUXEnhancer.enhance()
};

console.log('🎨 Modal Enhancement Module loaded successfully');
console.log('📱 Mobile optimizations:', window.innerWidth <= 768 ? 'enabled' : 'disabled');
console.log('🎯 Available utilities: window.modalUtils'); 