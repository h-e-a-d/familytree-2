/**
 * TutorialManager - Core controller for the modular tutorial system
 * Manages tutorial flow, step progression, and overall state
 */
export class TutorialManager {
    constructor() {
        this.currentStep = 0;
        this.steps = [];
        this.isActive = false;
        this.renderer = null;
        this.ui = null;
        this.onComplete = null;
        this.onSkip = null;
        
        this.bindEvents();
    }

    /**
     * Initialize the tutorial system with dependencies
     */
    init(renderer, ui) {
        this.renderer = renderer;
        this.ui = ui;
        return this;
    }

    /**
     * Add a tutorial step
     */
    addStep(step) {
        this.steps.push(step);
        return this;
    }

    /**
     * Remove a tutorial step by index
     */
    removeStep(index) {
        if (index >= 0 && index < this.steps.length) {
            this.steps.splice(index, 1);
            if (this.currentStep >= index && this.currentStep > 0) {
                this.currentStep--;
            }
        }
        return this;
    }

    /**
     * Insert a step at specific position
     */
    insertStep(index, step) {
        this.steps.splice(index, 0, step);
        if (this.currentStep >= index) {
            this.currentStep++;
        }
        return this;
    }

    /**
     * Start the tutorial
     */
    start() {
        if (this.steps.length === 0) {
            console.warn('No tutorial steps defined');
            return;
        }

        this.isActive = true;
        this.currentStep = 0;
        this.showCurrentStep();
        return this;
    }

    /**
     * Stop the tutorial
     */
    stop() {
        if (!this.isActive) return;

        this.isActive = false;
        this.renderer?.clearHighlight();
        this.ui?.hideModal();
        return this;
    }

    /**
     * Move to next step
     */
    next() {
        if (!this.isActive) return;

        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.showCurrentStep();
        } else {
            this.complete();
        }
        return this;
    }

    /**
     * Move to previous step
     */
    previous() {
        if (!this.isActive || this.currentStep <= 0) return;

        this.currentStep--;
        this.showCurrentStep();
        return this;
    }

    /**
     * Jump to specific step
     */
    goToStep(stepIndex) {
        if (!this.isActive || stepIndex < 0 || stepIndex >= this.steps.length) return;

        this.currentStep = stepIndex;
        this.showCurrentStep();
        return this;
    }

    /**
     * Skip the tutorial
     */
    skip() {
        this.stop();
        if (this.onSkip) {
            this.onSkip();
        }
        return this;
    }

    /**
     * Complete the tutorial
     */
    complete() {
        this.stop();
        if (this.onComplete) {
            this.onComplete();
        }
        return this;
    }

    /**
     * Show current step
     */
    showCurrentStep() {
        if (!this.isActive || this.currentStep >= this.steps.length) return;

        // Check if renderer and ui are properly initialized
        if (!this.renderer) {
            console.error('TutorialRenderer not initialized');
            return;
        }
        if (!this.ui) {
            console.error('TutorialUI not initialized');
            return;
        }

        const step = this.steps[this.currentStep];
        
        // Clear previous highlighting only if we're switching steps
        if (this.currentStep > 0) {
            this.renderer.clearHighlight();
        }
        
        // Apply new highlighting
        if (step.targetSelector) {
            console.log('Highlighting element:', step.targetSelector);
            this.renderer.highlightElement(step.targetSelector, step.highlightStyle);
        }
        
        // Show modal with step content
        this.ui.showModal({
            title: step.title,
            content: step.content,
            targetSelector: step.targetSelector,
            position: step.position || 'auto',
            currentStep: this.currentStep + 1,
            totalSteps: this.steps.length,
            canGoNext: this.currentStep < this.steps.length - 1,
            canGoPrevious: this.currentStep > 0,
            animation: step.animation
        });
    }

    /**
     * Set completion callback
     */
    onTutorialComplete(callback) {
        this.onComplete = callback;
        return this;
    }

    /**
     * Set skip callback
     */
    onTutorialSkip(callback) {
        this.onSkip = callback;
        return this;
    }

    /**
     * Get current progress
     */
    getProgress() {
        return {
            currentStep: this.currentStep + 1,
            totalSteps: this.steps.length,
            percentage: ((this.currentStep + 1) / this.steps.length) * 100
        };
    }

    /**
     * Check if tutorial is active
     */
    getIsActive() {
        return this.isActive;
    }

    /**
     * Get current step data
     */
    getCurrentStep() {
        return this.isActive ? this.steps[this.currentStep] : null;
    }

    /**
     * Bind keyboard events
     */
    bindEvents() {
        document.addEventListener('keydown', (e) => {
            if (!this.isActive) return;

            switch (e.key) {
                case 'ArrowRight':
                case 'Space':
                    e.preventDefault();
                    this.next();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.previous();
                    break;
                case 'Escape':
                    e.preventDefault();
                    this.skip();
                    break;
            }
        });
    }

    /**
     * Reset tutorial to beginning
     */
    reset() {
        this.currentStep = 0;
        if (this.isActive) {
            this.showCurrentStep();
        }
        return this;
    }

    /**
     * Update step content dynamically
     */
    updateStep(index, updates) {
        if (index >= 0 && index < this.steps.length) {
            Object.assign(this.steps[index], updates);
            if (this.isActive && this.currentStep === index) {
                this.showCurrentStep();
            }
        }
        return this;
    }
}