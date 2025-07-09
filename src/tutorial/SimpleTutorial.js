/**
 * SimpleTutorial - A lightweight, CSS-driven tutorial system
 * Single file, no complex dependencies, just works.
 */
export class SimpleTutorial {
    constructor() {
        this.currentStep = 0;
        this.isActive = false;
        this.overlay = null;
        this.modal = null;
        
        // Define tutorial steps
        this.steps = [
            {
                target: '#addPersonBtn',
                title: 'Add a Person',
                content: 'Start building your family tree by clicking the <strong>Add Person</strong> button located at the bottom-right corner.',
                position: 'left'
            },
            {
                target: '#connectBtn-tutorial',
                title: 'Create Connections',
                content: 'Connect family members by selecting two people, then clicking the <strong>Link</strong> button to create relationships.',
                position: 'left',
                beforeShow: () => this.showHiddenButton('#connectBtn', 'bottom: 80px; right: 20px;')
            },
            {
                target: '#styleBtn-tutorial',
                title: 'Customize Appearance',
                content: 'Change colors and styles by selecting a person and clicking the <strong>Style</strong> button.',
                position: 'left',
                beforeShow: () => this.showHiddenButton('#styleBtn', 'bottom: 140px; right: 20px;')
            },
            {
                target: '#saveBtn',
                title: 'Save Your Tree',
                content: 'Save your family tree as a JSON file by clicking the <strong>Save</strong> button in the toolbar.',
                position: 'bottom'
            },
            {
                target: '#exportBtn',
                title: 'Export as Image',
                content: 'Export your family tree as PNG, SVG, or PDF by clicking the <strong>Export</strong> button.',
                position: 'bottom'
            }
        ];
        
        this.createStyles();
    }

    /**
     * Create CSS styles
     */
    createStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .simple-tutorial-overlay {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                background: rgba(0, 0, 0, 0.8) !important;
                z-index: 99999 !important;
                pointer-events: none !important;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .simple-tutorial-overlay.visible {
                opacity: 1;
            }

            .simple-tutorial-highlight {
                position: relative !important;
                z-index: 100000 !important;
                box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.8), 0 0 0 4px #ffffff, 0 0 30px rgba(255, 255, 255, 0.8) !important;
                pointer-events: auto !important;
                animation: simpleTutorialPulse 2s infinite;
            }

            .simple-tutorial-modal {
                position: fixed !important;
                background: #ffffff;
                border-radius: 12px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
                min-width: 320px;
                max-width: 400px;
                z-index: 100001 !important;
                pointer-events: auto !important;
                font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
                opacity: 0;
                transform: scale(0.9);
                transition: all 0.3s ease;
            }
            
            .simple-tutorial-modal.visible {
                opacity: 1;
                transform: scale(1);
            }

            .simple-tutorial-modal-header {
                padding: 20px 20px 16px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 12px 12px 0 0;
            }

            .simple-tutorial-modal-title {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
            }

            .simple-tutorial-progress {
                margin-top: 12px;
                font-size: 12px;
                opacity: 0.9;
            }

            .simple-tutorial-modal-body {
                padding: 20px;
                line-height: 1.5;
                color: #374151;
            }

            .simple-tutorial-modal-footer {
                padding: 16px 20px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-top: 1px solid #e5e7eb;
            }

            .simple-tutorial-btn {
                padding: 8px 16px;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .simple-tutorial-btn-primary {
                background: #667eea;
                color: white;
            }

            .simple-tutorial-btn-primary:hover {
                background: #5a6fd8;
            }

            .simple-tutorial-btn-secondary {
                background: #f3f4f6;
                color: #374151;
            }

            .simple-tutorial-btn-secondary:hover {
                background: #e5e7eb;
            }

            .simple-tutorial-btn-skip {
                background: transparent;
                color: #6b7280;
                padding: 4px 8px;
                font-size: 13px;
            }

            /* Position classes */
            .simple-tutorial-modal.pos-left {
                right: 20px;
                top: 50%;
                transform: translateY(-50%) scale(0.9);
            }
            
            .simple-tutorial-modal.pos-left.visible {
                transform: translateY(-50%) scale(1);
            }

            .simple-tutorial-modal.pos-right {
                left: 20px;
                top: 50%;
                transform: translateY(-50%) scale(0.9);
            }
            
            .simple-tutorial-modal.pos-right.visible {
                transform: translateY(-50%) scale(1);
            }

            .simple-tutorial-modal.pos-bottom {
                left: 50%;
                top: 20px;
                transform: translateX(-50%) scale(0.9);
            }
            
            .simple-tutorial-modal.pos-bottom.visible {
                transform: translateX(-50%) scale(1);
            }

            .simple-tutorial-modal.pos-top {
                left: 50%;
                bottom: 20px;
                transform: translateX(-50%) scale(0.9);
            }
            
            .simple-tutorial-modal.pos-top.visible {
                transform: translateX(-50%) scale(1);
            }

            .simple-tutorial-modal.pos-center {
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%) scale(0.9);
            }
            
            .simple-tutorial-modal.pos-center.visible {
                transform: translate(-50%, -50%) scale(1);
            }

            @keyframes simpleTutorialPulse {
                0% { box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.8), 0 0 0 4px #ffffff, 0 0 30px rgba(255, 255, 255, 0.8); }
                50% { box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.8), 0 0 0 6px #ffffff, 0 0 40px rgba(255, 255, 255, 1); }
                100% { box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.8), 0 0 0 4px #ffffff, 0 0 30px rgba(255, 255, 255, 0.8); }
            }

            @media (max-width: 768px) {
                .simple-tutorial-modal {
                    min-width: 280px;
                    max-width: 300px;
                    margin: 20px;
                }
                
                .simple-tutorial-modal.pos-left,
                .simple-tutorial-modal.pos-right {
                    left: 10px;
                    right: 10px;
                    top: auto;
                    bottom: 20px;
                    transform: scale(0.9);
                }
                
                .simple-tutorial-modal.pos-left.visible,
                .simple-tutorial-modal.pos-right.visible {
                    transform: scale(1);
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Start the tutorial
     */
    start() {
        if (this.isActive) return;
        
        this.isActive = true;
        this.currentStep = 0;
        this.createOverlay();
        this.createModal();
        this.showStep();
    }

    /**
     * Stop the tutorial
     */
    stop() {
        if (!this.isActive) return;
        
        this.isActive = false;
        this.cleanup();
    }

    /**
     * Create overlay - DISABLED for single-element highlighting
     */
    createOverlay() {
        // Don't create overlay - use box-shadow instead
        console.log('Overlay creation disabled - using box-shadow highlighting');
    }

    /**
     * Create modal
     */
    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'simple-tutorial-modal';
        this.modal.innerHTML = `
            <div class="simple-tutorial-modal-header">
                <h3 class="simple-tutorial-modal-title"></h3>
                <div class="simple-tutorial-progress"></div>
            </div>
            <div class="simple-tutorial-modal-body"></div>
            <div class="simple-tutorial-modal-footer">
                <button class="simple-tutorial-btn simple-tutorial-btn-skip">Skip Tutorial</button>
                <div>
                    <button class="simple-tutorial-btn simple-tutorial-btn-secondary simple-tutorial-btn-prev">Previous</button>
                    <button class="simple-tutorial-btn simple-tutorial-btn-primary simple-tutorial-btn-next">Next</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.modal);
        this.bindModalEvents();
    }

    /**
     * Bind modal events
     */
    bindModalEvents() {
        this.modal.querySelector('.simple-tutorial-btn-next').onclick = () => this.next();
        this.modal.querySelector('.simple-tutorial-btn-prev').onclick = () => this.previous();
        this.modal.querySelector('.simple-tutorial-btn-skip').onclick = () => this.stop();
        
        // Keyboard navigation
        document.addEventListener('keydown', this.handleKeyPress.bind(this));
        
        // Window resize handler
        window.addEventListener('resize', () => {
            if (this.isActive && this.modal && this.modal.classList.contains('visible')) {
                // Reposition modal on resize
                const step = this.steps[this.currentStep];
                const target = document.querySelector(step.target);
                if (target) {
                    this.positionModalNearTarget(target, step.position);
                }
            }
        });
    }

    /**
     * Handle keyboard navigation
     */
    handleKeyPress(e) {
        if (!this.isActive) return;
        
        switch (e.key) {
            case 'ArrowRight':
            case ' ':
                e.preventDefault();
                this.next();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.previous();
                break;
            case 'Escape':
                e.preventDefault();
                this.stop();
                break;
        }
    }

    /**
     * Show current step
     */
    showStep() {
        const step = this.steps[this.currentStep];
        if (!step) return;

        console.log('Showing step:', step.title, 'Target:', step.target);

        // Clear previous highlights
        document.querySelectorAll('.simple-tutorial-highlight').forEach(el => {
            el.classList.remove('simple-tutorial-highlight');
        });

        // Run beforeShow if exists
        if (step.beforeShow) step.beforeShow();

        // Small delay to let button styling apply
        setTimeout(() => {
            // Highlight target element
            const target = document.querySelector(step.target);
            console.log('Target element found:', target);
            if (target) {
                target.classList.add('simple-tutorial-highlight');
                console.log('Added highlight class to:', target);
                console.log('Target rect after delay:', target.getBoundingClientRect());
            } else {
                console.warn('Target element not found:', step.target);
            }

            // Update modal content
            this.modal.querySelector('.simple-tutorial-modal-title').textContent = step.title;
            this.modal.querySelector('.simple-tutorial-progress').textContent = 
                `Step ${this.currentStep + 1} of ${this.steps.length}`;
            this.modal.querySelector('.simple-tutorial-modal-body').innerHTML = step.content;

            // Update buttons
            const prevBtn = this.modal.querySelector('.simple-tutorial-btn-prev');
            const nextBtn = this.modal.querySelector('.simple-tutorial-btn-next');
            
            prevBtn.style.display = this.currentStep > 0 ? 'inline-block' : 'none';
            nextBtn.textContent = this.currentStep === this.steps.length - 1 ? 'Finish' : 'Next';

            // Show modal first (invisible) to get dimensions
            this.modal.style.opacity = '0';
            this.modal.style.visibility = 'hidden';
            this.modal.classList.add('visible');
            
            // Position modal after it's rendered
            setTimeout(() => {
                if (target) {
                    this.positionModalNearTarget(target, step.position);
                } else {
                    // Fallback to center if no target
                    this.centerModal();
                }
                
                // Now make it visible
                this.modal.style.opacity = '1';
                this.modal.style.visibility = 'visible';
                this.modal.style.transform = 'scale(1)';
            }, 100);
        }, step.beforeShow ? 100 : 0);
    }

    /**
     * Position modal near target element
     */
    positionModalNearTarget(target, preferredPosition) {
        if (!target) {
            // No target element, center the modal
            this.centerModal();
            return;
        }
        
        const targetRect = target.getBoundingClientRect();
        const modalRect = this.modal.getBoundingClientRect();
        const modalWidth = modalRect.width || 350;
        const modalHeight = modalRect.height || 250;
        const margin = 20;
        
        console.log('Target rect:', targetRect);
        console.log('Modal rect:', modalRect);
        console.log('Viewport:', window.innerWidth, 'x', window.innerHeight);
        
        let left, top;
        let position = 'auto';
        
        // Calculate available space in each direction
        const spaceLeft = targetRect.left;
        const spaceRight = window.innerWidth - targetRect.right;
        const spaceTop = targetRect.top;
        const spaceBottom = window.innerHeight - targetRect.bottom;
        
        console.log('Available space:', { spaceLeft, spaceRight, spaceTop, spaceBottom });
        
        // Special handling for Add Person button (bottom-right corner)
        if (target.id === 'addPersonBtn' || targetRect.bottom > window.innerHeight * 0.8) {
            // For bottom-right buttons, always position to the upper-left to avoid overlap
            left = targetRect.left - modalWidth - margin;
            top = targetRect.top - modalHeight - margin;
            position = 'upper-left';
            
            // If modal would go off screen, adjust position
            if (left < margin) {
                left = margin;
            }
            if (top < margin) {
                top = margin;
            }
        } else {
            // Normal positioning logic for other elements
            if (spaceLeft >= modalWidth + margin && spaceLeft > spaceRight) {
                // Position to the left
                left = targetRect.left - modalWidth - margin;
                top = targetRect.top + (targetRect.height / 2) - (modalHeight / 2);
                position = 'left';
            } else if (spaceRight >= modalWidth + margin) {
                // Position to the right
                left = targetRect.right + margin;
                top = targetRect.top + (targetRect.height / 2) - (modalHeight / 2);
                position = 'right';
            } else if (spaceTop >= modalHeight + margin) {
                // Position above
                left = targetRect.left + (targetRect.width / 2) - (modalWidth / 2);
                top = targetRect.top - modalHeight - margin;
                position = 'top';
            } else if (spaceBottom >= modalHeight + margin) {
                // Position below
                left = targetRect.left + (targetRect.width / 2) - (modalWidth / 2);
                top = targetRect.bottom + margin;
                position = 'bottom';
            } else {
                // Not enough space anywhere, use the side with most space
                if (spaceLeft > spaceRight) {
                    left = margin;
                    top = targetRect.top + (targetRect.height / 2) - (modalHeight / 2);
                    position = 'left-constrained';
                } else {
                    left = window.innerWidth - modalWidth - margin;
                    top = targetRect.top + (targetRect.height / 2) - (modalHeight / 2);
                    position = 'right-constrained';
                }
            }
        }
        
        // Ensure modal stays within viewport boundaries
        left = Math.max(margin, Math.min(left, window.innerWidth - modalWidth - margin));
        top = Math.max(margin, Math.min(top, window.innerHeight - modalHeight - margin));
        
        console.log('Final modal position:', { left, top, position });
        
        // Apply position
        this.modal.className = 'simple-tutorial-modal';
        this.modal.style.left = left + 'px';
        this.modal.style.top = top + 'px';
        this.modal.style.transform = 'scale(1)';
        this.modal.style.right = 'auto';
        this.modal.style.bottom = 'auto';
    }
    
    /**
     * Center modal in viewport
     */
    centerModal() {
        const modalRect = this.modal.getBoundingClientRect();
        const modalWidth = modalRect.width || 350;
        const modalHeight = modalRect.height || 250;
        
        const left = (window.innerWidth - modalWidth) / 2;
        const top = (window.innerHeight - modalHeight) / 2;
        
        console.log('Centering modal at:', { left, top });
        
        this.modal.className = 'simple-tutorial-modal';
        this.modal.style.left = left + 'px';
        this.modal.style.top = top + 'px';
        this.modal.style.transform = 'scale(1)';
        this.modal.style.right = 'auto';
        this.modal.style.bottom = 'auto';
    }

    /**
     * Next step
     */
    next() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.modal.classList.remove('visible');
            setTimeout(() => this.showStep(), 200);
        } else {
            this.complete();
        }
    }

    /**
     * Previous step
     */
    previous() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.modal.classList.remove('visible');
            setTimeout(() => this.showStep(), 200);
        }
    }

    /**
     * Complete tutorial
     */
    complete() {
        localStorage.setItem('family-tree-tutorial-completed', 'true');
        this.stop();
    }

    /**
     * Show hidden button temporarily by creating a duplicate
     */
    showHiddenButton(selector, styles) {
        const originalBtn = document.querySelector(selector);
        if (!originalBtn) return;
        
        // Remove any existing tutorial button
        const existingTutorialBtn = document.querySelector(selector + '-tutorial');
        if (existingTutorialBtn) {
            existingTutorialBtn.remove();
        }
        
        // Create a new visible button for tutorial
        const tutorialBtn = originalBtn.cloneNode(true);
        tutorialBtn.id = originalBtn.id + '-tutorial';
        tutorialBtn.classList.remove('hidden');
        
        // Apply tutorial-specific styles
        tutorialBtn.style.cssText = `
            display: flex !important; 
            position: fixed !important; 
            ${styles} 
            z-index: 100000 !important;
            width: 80px !important;
            height: 40px !important;
            padding: 8px 16px !important;
            border-radius: 20px !important;
            background: #6c757d !important;
            color: white !important;
            border: none !important;
            font-size: 14px !important;
            align-items: center !important;
            justify-content: center !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
            visibility: visible !important;
            opacity: 1 !important;
        `;
        
        // Add to DOM
        document.body.appendChild(tutorialBtn);
        
        console.log('Tutorial button created:', tutorialBtn.id, 'Rect:', tutorialBtn.getBoundingClientRect());
        
        // Update the step target to point to the new button
        return tutorialBtn.id;
    }

    /**
     * Cleanup
     */
    cleanup() {
        // Remove highlights
        document.querySelectorAll('.simple-tutorial-highlight').forEach(el => {
            el.classList.remove('simple-tutorial-highlight');
        });

        // Remove tutorial buttons
        ['#connectBtn-tutorial', '#styleBtn-tutorial'].forEach(selector => {
            const btn = document.querySelector(selector);
            if (btn) {
                btn.remove();
            }
        });

        // No overlay to remove since we use box-shadow highlighting

        if (this.modal) {
            this.modal.classList.remove('visible');
            setTimeout(() => {
                if (this.modal && this.modal.parentNode) {
                    this.modal.parentNode.removeChild(this.modal);
                }
                this.modal = null;
            }, 300);
        }
    }

    /**
     * Check if should auto-start
     */
    static shouldAutoStart() {
        return !localStorage.getItem('family-tree-tutorial-completed') && 
               !localStorage.getItem('familyTreeData');
    }

    /**
     * Auto-start for new users
     */
    static autoStart() {
        if (SimpleTutorial.shouldAutoStart()) {
            setTimeout(() => {
                const tutorial = new SimpleTutorial();
                tutorial.start();
            }, 1000);
        }
    }
}

// Auto-initialization disabled - handled by builder.html

export default SimpleTutorial;