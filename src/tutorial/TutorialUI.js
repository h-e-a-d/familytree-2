/**
 * TutorialUI - Handles modal positioning and animations
 * Manages tutorial modal display and user interactions
 */
export class TutorialUI {
    constructor() {
        this.modal = null;
        this.isVisible = false;
        this.currentStep = null;
        this.onNext = null;
        this.onPrevious = null;
        this.onSkip = null;
        this.autoAdvanceTimer = null;
        this.currentTargetSelector = null;
        this.currentPosition = 'auto';
        
        this.createModal();
        this.bindEvents();
    }

    /**
     * Create the tutorial modal
     */
    createModal() {
        this.modal = document.createElement('div');
        this.modal.id = 'tutorial-modal';
        this.modal.className = 'tutorial-modal';
        this.modal.innerHTML = `
            <div class="tutorial-modal-content">
                <div class="tutorial-modal-header">
                    <h3 class="tutorial-modal-title"></h3>
                    <div class="tutorial-progress">
                        <span class="tutorial-step-indicator"></span>
                        <div class="tutorial-progress-bar">
                            <div class="tutorial-progress-fill"></div>
                        </div>
                    </div>
                </div>
                <div class="tutorial-modal-body">
                    <div class="tutorial-modal-content-text"></div>
                    <div class="tutorial-sample-content"></div>
                </div>
                <div class="tutorial-modal-footer">
                    <button class="tutorial-btn tutorial-btn-skip">Skip Tutorial</button>
                    <div class="tutorial-navigation">
                        <button class="tutorial-btn tutorial-btn-secondary tutorial-btn-previous">Previous</button>
                        <button class="tutorial-btn tutorial-btn-primary tutorial-btn-next">Next</button>
                    </div>
                </div>
            </div>
            <div class="tutorial-modal-arrow"></div>
        `;

        this.applyStyles();
    }

    /**
     * Apply CSS styles to modal
     */
    applyStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .tutorial-modal {
                position: fixed;
                background: #ffffff;
                border-radius: 12px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                min-width: 320px;
                max-width: 400px;
                opacity: 0;
                transform: scale(0.8) translateY(10px);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                z-index: 100002;
                pointer-events: auto;
                font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
            }

            .tutorial-modal.visible {
                opacity: 1;
                transform: scale(1) translateY(0);
            }

            .tutorial-modal-content {
                padding: 0;
                border-radius: 12px;
                overflow: hidden;
            }

            .tutorial-modal-header {
                padding: 20px 20px 16px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }

            .tutorial-modal-title {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                line-height: 1.3;
            }

            .tutorial-progress {
                margin-top: 12px;
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .tutorial-step-indicator {
                font-size: 12px;
                font-weight: 500;
                opacity: 0.9;
                white-space: nowrap;
            }

            .tutorial-progress-bar {
                flex: 1;
                height: 4px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 2px;
                overflow: hidden;
            }

            .tutorial-progress-fill {
                height: 100%;
                background: #ffffff;
                border-radius: 2px;
                transition: width 0.3s ease;
            }

            .tutorial-modal-body {
                padding: 20px;
            }

            .tutorial-modal-content-text {
                font-size: 15px;
                line-height: 1.5;
                color: #374151;
                margin-bottom: 16px;
            }

            .tutorial-sample-content {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 16px;
                display: none;
            }

            .tutorial-sample-content.visible {
                display: block;
            }

            .tutorial-sample-node {
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: #71be96;
                border: 3px solid #ffffff;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 12px;
                color: white;
                font-weight: 600;
                font-size: 12px;
            }

            .tutorial-sample-line {
                width: 80px;
                height: 3px;
                background: #6b7280;
                margin: 8px auto;
                border-radius: 2px;
            }

            .tutorial-modal-footer {
                padding: 16px 20px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-top: 1px solid #e5e7eb;
            }

            .tutorial-navigation {
                display: flex;
                gap: 8px;
            }

            .tutorial-btn {
                padding: 8px 16px;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                outline: none;
            }

            .tutorial-btn:focus {
                box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.5);
            }

            .tutorial-btn-primary {
                background: #667eea;
                color: white;
            }

            .tutorial-btn-primary:hover {
                background: #5a6fd8;
            }

            .tutorial-btn-primary:disabled {
                background: #9ca3af;
                cursor: not-allowed;
            }

            .tutorial-btn-secondary {
                background: #f3f4f6;
                color: #374151;
            }

            .tutorial-btn-secondary:hover {
                background: #e5e7eb;
            }

            .tutorial-btn-secondary:disabled {
                background: #f9fafb;
                color: #9ca3af;
                cursor: not-allowed;
            }

            .tutorial-btn-skip {
                background: transparent;
                color: #6b7280;
                padding: 4px 8px;
                font-size: 13px;
            }

            .tutorial-btn-skip:hover {
                color: #374151;
                background: #f3f4f6;
            }

            .tutorial-modal-arrow {
                position: absolute;
                width: 12px;
                height: 12px;
                background: #ffffff;
                transform: rotate(45deg);
                z-index: -1;
            }

            .tutorial-modal.position-top .tutorial-modal-arrow {
                bottom: -6px;
                left: 50%;
                margin-left: -6px;
            }

            .tutorial-modal.position-bottom .tutorial-modal-arrow {
                top: -6px;
                left: 50%;
                margin-left: -6px;
            }

            .tutorial-modal.position-left .tutorial-modal-arrow {
                right: -6px;
                top: 50%;
                margin-top: -6px;
            }

            .tutorial-modal.position-right .tutorial-modal-arrow {
                left: -6px;
                top: 50%;
                margin-top: -6px;
            }

            @media (max-width: 768px) {
                .tutorial-modal {
                    min-width: 280px;
                    max-width: 320px;
                    margin: 20px;
                }

                .tutorial-modal-header {
                    padding: 16px 16px 12px;
                }

                .tutorial-modal-title {
                    font-size: 16px;
                }

                .tutorial-modal-body {
                    padding: 16px;
                }

                .tutorial-modal-footer {
                    padding: 12px 16px 16px;
                    flex-direction: column;
                    gap: 12px;
                }

                .tutorial-navigation {
                    width: 100%;
                    justify-content: space-between;
                }

                .tutorial-btn {
                    flex: 1;
                    padding: 12px 16px;
                }
            }

            /* Animation classes */
            .tutorial-modal.animate-bounce {
                animation: tutorialModalBounce 0.5s ease;
            }

            .tutorial-modal.animate-slide {
                animation: tutorialModalSlide 0.4s ease;
            }

            @keyframes tutorialModalBounce {
                0% { transform: scale(0.8) translateY(20px); opacity: 0; }
                60% { transform: scale(1.05) translateY(-5px); opacity: 1; }
                100% { transform: scale(1) translateY(0); opacity: 1; }
            }

            @keyframes tutorialModalSlide {
                0% { transform: translateX(-20px); opacity: 0; }
                100% { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Navigation buttons
        this.modal.querySelector('.tutorial-btn-next').addEventListener('click', () => {
            if (this.onNext) this.onNext();
        });

        this.modal.querySelector('.tutorial-btn-previous').addEventListener('click', () => {
            if (this.onPrevious) this.onPrevious();
        });

        this.modal.querySelector('.tutorial-btn-skip').addEventListener('click', () => {
            if (this.onSkip) this.onSkip();
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!this.isVisible) return;

            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (this.onNext) this.onNext();
            }
        });

        // Window resize handler
        window.addEventListener('resize', () => {
            if (this.isVisible && this.currentTargetSelector) {
                // Reposition modal when window resizes
                setTimeout(() => {
                    this.positionModal(this.currentTargetSelector, this.currentPosition);
                }, 50);
            }
        });
    }

    /**
     * Show modal with step data
     */
    showModal(stepData) {
        this.currentStep = stepData;
        this.currentTargetSelector = stepData.targetSelector;
        this.currentPosition = stepData.position || 'auto';
        this.updateModalContent(stepData);
        
        // Add modal to DOM first so it can be measured
        if (!document.body.contains(this.modal)) {
            document.body.appendChild(this.modal);
        }

        // Apply animation class but keep invisible initially
        this.modal.className = `tutorial-modal ${stepData.animation || 'animate-bounce'}`;
        
        // Position modal after it's in DOM and measurable
        setTimeout(() => {
            this.positionModal(this.currentTargetSelector, this.currentPosition);
            
            // Now make it visible
            requestAnimationFrame(() => {
                this.modal.classList.add('visible');
                this.isVisible = true;
            });
        }, 10);

        // Set up auto-advance if enabled
        this.setupAutoAdvance(stepData);
    }

    /**
     * Update modal content
     */
    updateModalContent(stepData) {
        const title = this.modal.querySelector('.tutorial-modal-title');
        const content = this.modal.querySelector('.tutorial-modal-content-text');
        const stepIndicator = this.modal.querySelector('.tutorial-step-indicator');
        const progressFill = this.modal.querySelector('.tutorial-progress-fill');
        const nextBtn = this.modal.querySelector('.tutorial-btn-next');
        const prevBtn = this.modal.querySelector('.tutorial-btn-previous');
        const sampleContent = this.modal.querySelector('.tutorial-sample-content');

        title.textContent = stepData.title;
        content.innerHTML = stepData.content;
        stepIndicator.textContent = `Step ${stepData.currentStep} of ${stepData.totalSteps}`;
        
        const progress = (stepData.currentStep / stepData.totalSteps) * 100;
        progressFill.style.width = `${progress}%`;

        // Update button states
        nextBtn.disabled = !stepData.canGoNext;
        prevBtn.disabled = !stepData.canGoPrevious;
        
        if (!stepData.canGoNext) {
            nextBtn.textContent = 'Finish';
        } else {
            nextBtn.textContent = 'Next';
        }

        // Show sample content if needed
        this.updateSampleContent(stepData, sampleContent);
    }

    /**
     * Update sample content for visual examples
     */
    updateSampleContent(stepData, container) {
        container.innerHTML = '';
        container.classList.remove('visible');

        if (stepData.title.includes('Add Person')) {
            container.innerHTML = `
                <div class="tutorial-sample-node">John</div>
                <div style="text-align: center; font-size: 12px; color: #6b7280;">Sample Person Node</div>
            `;
            container.classList.add('visible');
        } else if (stepData.title.includes('connection') || stepData.title.includes('line')) {
            container.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; gap: 20px;">
                    <div class="tutorial-sample-node" style="width: 40px; height: 40px; font-size: 10px;">A</div>
                    <div class="tutorial-sample-line"></div>
                    <div class="tutorial-sample-node" style="width: 40px; height: 40px; font-size: 10px;">B</div>
                </div>
                <div style="text-align: center; font-size: 12px; color: #6b7280; margin-top: 8px;">Connection Line</div>
            `;
            container.classList.add('visible');
        } else if (stepData.title.includes('color') || stepData.title.includes('style')) {
            container.innerHTML = `
                <div style="display: flex; justify-content: center; gap: 8px; margin-bottom: 8px;">
                    <div class="tutorial-sample-node" style="width: 30px; height: 30px; background: #71be96;"></div>
                    <div class="tutorial-sample-node" style="width: 30px; height: 30px; background: #a2e4d7;"></div>
                    <div class="tutorial-sample-node" style="width: 30px; height: 30px; background: #94d0c2;"></div>
                </div>
                <div style="text-align: center; font-size: 12px; color: #6b7280;">Color Options</div>
            `;
            container.classList.add('visible');
        }
    }

    /**
     * Position modal relative to target element
     */
    positionModal(targetSelector, position = 'auto') {
        console.log('Positioning modal for:', targetSelector);
        if (!targetSelector) {
            console.log('No target selector, centering modal');
            this.centerModal();
            return;
        }

        const target = document.querySelector(targetSelector);
        if (!target) {
            console.log('Target element not found, centering modal');
            this.centerModal();
            return;
        }

        const targetRect = target.getBoundingClientRect();
        const modalRect = this.modal.getBoundingClientRect();
        const scrollX = window.pageXOffset;
        const scrollY = window.pageYOffset;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        console.log('Target rect:', targetRect);
        console.log('Modal rect:', modalRect);
        console.log('Viewport:', { width: viewportWidth, height: viewportHeight });

        // Fallback if modal has no dimensions yet
        const modalWidth = modalRect.width || 350;
        const modalHeight = modalRect.height || 250;

        let finalPosition = position;
        let left, top;

        // Auto-calculate best position
        if (position === 'auto') {
            const spaceTop = targetRect.top;
            const spaceBottom = viewportHeight - targetRect.bottom;
            const spaceLeft = targetRect.left;
            const spaceRight = viewportWidth - targetRect.right;

            console.log('Space calculation:', { spaceTop, spaceBottom, spaceLeft, spaceRight });

            if (spaceLeft > modalWidth + 40) finalPosition = 'left';
            else if (spaceRight > modalWidth + 40) finalPosition = 'right';
            else if (spaceBottom > modalHeight + 40) finalPosition = 'bottom';
            else if (spaceTop > modalHeight + 40) finalPosition = 'top';
            else finalPosition = 'left'; // fallback
        }

        // Calculate position based on final position
        switch (finalPosition) {
            case 'top':
                left = targetRect.left + scrollX + (targetRect.width / 2) - (modalWidth / 2);
                top = targetRect.top + scrollY - modalHeight - 20;
                break;
            case 'bottom':
                left = targetRect.left + scrollX + (targetRect.width / 2) - (modalWidth / 2);
                top = targetRect.bottom + scrollY + 20;
                break;
            case 'left':
                left = targetRect.left + scrollX - modalWidth - 20;
                top = targetRect.top + scrollY + (targetRect.height / 2) - (modalHeight / 2);
                break;
            case 'right':
                left = targetRect.right + scrollX + 20;
                top = targetRect.top + scrollY + (targetRect.height / 2) - (modalHeight / 2);
                break;
        }

        // Ensure modal stays within viewport with responsive margins
        const margin = Math.min(20, viewportWidth * 0.05); // 5% of viewport width or 20px max
        left = Math.max(margin, Math.min(left, viewportWidth - modalWidth - margin));
        top = Math.max(margin, Math.min(top, viewportHeight - modalHeight - margin));

        console.log('Final position:', finalPosition, 'Left:', left, 'Top:', top);

        // Use fixed positioning for better responsiveness
        this.modal.style.left = `${left}px`;
        this.modal.style.top = `${top}px`;
        this.modal.style.right = 'auto';
        this.modal.style.bottom = 'auto';
        
        // Update modal position class for arrow positioning
        this.modal.className = this.modal.className.replace(/position-\w+/g, '');
        this.modal.classList.add(`position-${finalPosition}`);
    }

    /**
     * Center modal in viewport
     */
    centerModal() {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const modalRect = this.modal.getBoundingClientRect();

        const left = (viewportWidth - modalRect.width) / 2 + window.pageXOffset;
        const top = (viewportHeight - modalRect.height) / 2 + window.pageYOffset;

        this.modal.style.left = `${left}px`;
        this.modal.style.top = `${top}px`;
        
        this.modal.className = this.modal.className.replace(/position-\w+/g, '');
    }

    /**
     * Hide modal
     */
    hideModal() {
        if (!this.isVisible) return;

        this.clearAutoAdvance();
        this.modal.classList.remove('visible');
        this.isVisible = false;
        this.currentTargetSelector = null;
        this.currentPosition = 'auto';

        setTimeout(() => {
            if (this.modal && document.body.contains(this.modal)) {
                document.body.removeChild(this.modal);
            }
        }, 300);
    }

    /**
     * Set up auto-advance timer
     */
    setupAutoAdvance(stepData) {
        this.clearAutoAdvance();
        
        if (stepData.autoAdvance && stepData.autoAdvanceDelay > 0) {
            this.autoAdvanceTimer = setTimeout(() => {
                if (this.onNext) this.onNext();
            }, stepData.autoAdvanceDelay);
        }
    }

    /**
     * Clear auto-advance timer
     */
    clearAutoAdvance() {
        if (this.autoAdvanceTimer) {
            clearTimeout(this.autoAdvanceTimer);
            this.autoAdvanceTimer = null;
        }
    }

    /**
     * Set event handlers
     */
    setHandlers(handlers) {
        this.onNext = handlers.onNext;
        this.onPrevious = handlers.onPrevious;
        this.onSkip = handlers.onSkip;
    }

    /**
     * Cleanup
     */
    destroy() {
        this.hideModal();
        this.clearAutoAdvance();
    }
}