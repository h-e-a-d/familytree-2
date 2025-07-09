/**
 * TutorialRenderer - Handles highlighting and dimming effects
 * Creates visual emphasis on tutorial target elements
 */
export class TutorialRenderer {
    constructor() {
        this.overlayElement = null;
        this.highlightBox = null;
        this.currentTarget = null;
        this.isActive = false;
        this.animationFrame = null;
        
        this.createOverlay();
    }

    /**
     * Create the overlay elements
     */
    createOverlay() {
        // Create main overlay
        this.overlayElement = document.createElement('div');
        this.overlayElement.id = 'tutorial-overlay';
        this.overlayElement.className = 'tutorial-overlay';
        this.overlayElement.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: rgba(0, 0, 0, 0.8) !important;
            z-index: 99999 !important;
            pointer-events: none !important;
            opacity: 0 !important;
            transition: opacity 0.3s ease !important;
            display: block !important;
            visibility: visible !important;
        `;

        // Create highlight container
        this.highlightBox = document.createElement('div');
        this.highlightBox.id = 'tutorial-highlight';
        this.highlightBox.className = 'tutorial-highlight';
        this.highlightBox.style.cssText = `
            position: absolute;
            border: 3px solid #ffffff;
            border-radius: 8px;
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(255, 255, 255, 0.4);
            pointer-events: none;
            opacity: 0;
            transition: all 0.3s ease;
            z-index: 100001;
            background: transparent;
        `;
    }

    /**
     * Highlight a specific element
     */
    highlightElement(selector, style = 'pulse') {
        console.log('Attempting to highlight element:', selector);
        const element = document.querySelector(selector);
        if (!element) {
            console.warn(`Tutorial target element not found: ${selector}`);
            return false;
        }

        console.log('Found target element:', element);
        console.log('Element rect:', element.getBoundingClientRect());

        this.currentTarget = element;
        this.isActive = true;

        // Add overlay to page (this dims the entire background)
        if (!document.body.contains(this.overlayElement)) {
            document.body.appendChild(this.overlayElement);
            console.log('Added overlay to DOM');
            
            // Force overlay to be visible immediately for debugging
            this.overlayElement.style.opacity = '1';
            console.log('Forced overlay visible with red background');
        }
        if (!document.body.contains(this.highlightBox)) {
            document.body.appendChild(this.highlightBox);
            console.log('Added highlight box to DOM');
        }

        // Position highlight around target element
        this.positionHighlight(element);
        
        // Apply highlight style
        this.applyHighlightStyle(style);

        // Show overlay and highlight
        this.showOverlay();

        // Make the target element appear above the overlay
        this.bringTargetToFront(element);

        // Start update loop for dynamic positioning
        this.startUpdateLoop();

        return true;
    }

    /**
     * Position highlight around target element
     */
    positionHighlight(element) {
        const rect = element.getBoundingClientRect();
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;

        const padding = 8;
        
        this.highlightBox.style.left = `${rect.left + scrollX - padding}px`;
        this.highlightBox.style.top = `${rect.top + scrollY - padding}px`;
        this.highlightBox.style.width = `${rect.width + (padding * 2)}px`;
        this.highlightBox.style.height = `${rect.height + (padding * 2)}px`;
    }

    /**
     * Bring target element to front by setting high z-index
     */
    bringTargetToFront(element) {
        // Store original z-index
        this.originalZIndex = element.style.zIndex;
        
        // Set high z-index to appear above overlay
        element.style.position = element.style.position || 'relative';
        element.style.zIndex = '100000';
        
        // Add class for additional styling
        element.classList.add('tutorial-highlight-active');
    }

    /**
     * Apply highlight animation style
     */
    applyHighlightStyle(style) {
        // Remove existing animation classes
        this.highlightBox.className = 'tutorial-highlight';
        
        switch (style) {
            case 'pulse':
                this.highlightBox.style.animation = 'tutorialPulse 2s infinite';
                break;
            case 'glow':
                this.highlightBox.style.boxShadow = `
                    0 0 0 9999px rgba(0, 0, 0, 0.7),
                    0 0 30px #ffffff,
                    0 0 60px #ffffff,
                    inset 0 0 30px rgba(255, 255, 255, 0.2)
                `;
                break;
            case 'bounce':
                this.highlightBox.style.animation = 'tutorialBounce 1s infinite';
                break;
            case 'solid':
            default:
                this.highlightBox.style.animation = 'none';
                break;
        }
    }

    /**
     * Show overlay
     */
    showOverlay() {
        requestAnimationFrame(() => {
            this.overlayElement.style.opacity = '1';
            this.highlightBox.style.opacity = '1';
            
            // Debug: Check if overlay is actually visible
            setTimeout(() => {
                const overlayRect = this.overlayElement.getBoundingClientRect();
                console.log('Overlay visibility check:', {
                    opacity: this.overlayElement.style.opacity,
                    display: window.getComputedStyle(this.overlayElement).display,
                    zIndex: window.getComputedStyle(this.overlayElement).zIndex,
                    position: window.getComputedStyle(this.overlayElement).position,
                    dimensions: { width: overlayRect.width, height: overlayRect.height }
                });
            }, 100);
        });
    }

    /**
     * Clear all highlighting
     */
    clearHighlight() {
        console.log('clearHighlight() called - this should NOT happen during tutorial');
        console.trace('clearHighlight call stack');
        
        this.isActive = false;
        
        // Restore target element's original styling
        if (this.currentTarget) {
            this.currentTarget.style.zIndex = this.originalZIndex || '';
            this.currentTarget.classList.remove('tutorial-highlight-active');
        }
        
        this.currentTarget = null;
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        // Hide overlay and highlight
        if (this.overlayElement) {
            this.overlayElement.style.opacity = '0';
        }
        if (this.highlightBox) {
            this.highlightBox.style.opacity = '0';
        }

        // Remove from DOM after transition
        setTimeout(() => {
            if (this.overlayElement && document.body.contains(this.overlayElement)) {
                document.body.removeChild(this.overlayElement);
            }
            if (this.highlightBox && document.body.contains(this.highlightBox)) {
                document.body.removeChild(this.highlightBox);
            }
        }, 300);
    }

    /**
     * Start update loop for dynamic positioning
     */
    startUpdateLoop() {
        if (!this.isActive || !this.currentTarget) return;

        this.positionHighlight(this.currentTarget);
        this.animationFrame = requestAnimationFrame(() => this.startUpdateLoop());
    }

    /**
     * Update highlight for element changes
     */
    updateHighlight() {
        if (this.isActive && this.currentTarget) {
            this.positionHighlight(this.currentTarget);
        }
    }

    /**
     * Set overlay opacity
     */
    setOverlayOpacity(opacity) {
        if (this.overlayElement) {
            this.overlayElement.style.background = `rgba(0, 0, 0, ${opacity})`;
        }
    }

    /**
     * Set highlight color
     */
    setHighlightColor(color) {
        if (this.highlightBox) {
            this.highlightBox.style.borderColor = color;
        }
    }

    /**
     * Create custom highlight shape
     */
    createCustomHighlight(element, options = {}) {
        const {
            shape = 'rectangle',
            color = '#ffffff',
            thickness = 3,
            padding = 8,
            animation = 'pulse'
        } = options;

        const rect = element.getBoundingClientRect();
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;

        this.highlightBox.style.borderColor = color;
        this.highlightBox.style.borderWidth = `${thickness}px`;

        if (shape === 'circle') {
            const size = Math.max(rect.width, rect.height) + (padding * 2);
            const centerX = rect.left + scrollX + (rect.width / 2) - (size / 2);
            const centerY = rect.top + scrollY + (rect.height / 2) - (size / 2);
            
            this.highlightBox.style.left = `${centerX}px`;
            this.highlightBox.style.top = `${centerY}px`;
            this.highlightBox.style.width = `${size}px`;
            this.highlightBox.style.height = `${size}px`;
            this.highlightBox.style.borderRadius = '50%';
        } else {
            this.positionHighlight(element);
            this.highlightBox.style.borderRadius = '8px';
        }

        this.applyHighlightStyle(animation);
    }

    /**
     * Cleanup
     */
    destroy() {
        this.clearHighlight();
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }
}

// Add CSS animations to document
const tutorialStyles = document.createElement('style');
tutorialStyles.textContent = `
    @keyframes tutorialPulse {
        0% { 
            transform: scale(1);
            box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7), 0 0 20px rgba(255, 255, 255, 0.5);
        }
        50% { 
            transform: scale(1.05);
            box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7), 0 0 30px rgba(255, 255, 255, 0.8);
        }
        100% { 
            transform: scale(1);
            box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7), 0 0 20px rgba(255, 255, 255, 0.5);
        }
    }

    @keyframes tutorialBounce {
        0%, 20%, 53%, 80%, 100% {
            transform: translateY(0);
        }
        40%, 43% {
            transform: translateY(-10px);
        }
        70% {
            transform: translateY(-5px);
        }
        90% {
            transform: translateY(-2px);
        }
    }

    .tutorial-highlight {
        will-change: transform, opacity;
    }

    .tutorial-overlay {
        will-change: opacity;
    }

    /* Ensure highlighted elements are clickable during tutorial */
    .tutorial-highlight-active {
        pointer-events: auto !important;
        position: relative;
        z-index: 10000;
    }
`;

document.head.appendChild(tutorialStyles);