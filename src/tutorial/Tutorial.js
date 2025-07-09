/**
 * Tutorial - Main tutorial system entry point
 * Combines all components into a complete tutorial system
 */
import { TutorialManager } from './TutorialManager.js';
import { TutorialRenderer } from './TutorialRenderer.js';
import { TutorialUI } from './TutorialUI.js';
import { TutorialSteps } from './TutorialSteps.js';

export class Tutorial {
    constructor() {
        this.manager = new TutorialManager();
        this.renderer = new TutorialRenderer();
        this.ui = new TutorialUI();
        this.isInitialized = false;
        
        this.init();
    }

    /**
     * Initialize the tutorial system
     */
    init() {
        if (this.isInitialized) return;

        console.log('Initializing tutorial system...');
        console.log('Renderer:', this.renderer);
        console.log('UI:', this.ui);
        console.log('Manager:', this.manager);

        // Connect components
        this.manager.init(this.renderer, this.ui);
        
        // Set up UI event handlers
        this.ui.setHandlers({
            onNext: () => this.manager.next(),
            onPrevious: () => this.manager.previous(),
            onSkip: () => this.manager.skip()
        });

        // Load default steps
        this.loadDefaultSteps();
        
        this.isInitialized = true;
        console.log('Tutorial system initialized successfully');
    }

    /**
     * Load the 5 default tutorial steps
     */
    loadDefaultSteps() {
        const steps = TutorialSteps.createAllSteps();
        steps.forEach(step => this.manager.addStep(step));
    }

    /**
     * Start the tutorial
     */
    start() {
        // Always ensure initialization
        this.init();
        
        // Validate steps before starting
        const validation = TutorialSteps.validateAllSteps();
        if (!validation.isValid) {
            console.warn('Tutorial validation failed:', validation.errors);
        }
        
        this.manager.start();
        return this;
    }

    /**
     * Stop the tutorial
     */
    stop() {
        this.manager.stop();
        return this;
    }

    /**
     * Check if tutorial should be shown (first time user)
     */
    shouldShowTutorial() {
        // Check if user has completed tutorial before
        const hasCompletedTutorial = localStorage.getItem('mapmyroots-new-tutorial-completed');
        const hasExistingData = localStorage.getItem('familyTreeData');
        
        // Show tutorial if:
        // 1. User hasn't completed it before
        // 2. And doesn't have existing family tree data
        return !hasCompletedTutorial && !hasExistingData;
    }

    /**
     * Auto-start tutorial for new users
     */
    autoStart() {
        // Always initialize first
        this.init();
        
        if (this.shouldShowTutorial()) {
            // Small delay to let the page fully load
            setTimeout(() => {
                this.start();
            }, 1000);
        }
        return this;
    }

    /**
     * Mark tutorial as completed
     */
    markCompleted() {
        localStorage.setItem('mapmyroots-new-tutorial-completed', 'true');
        localStorage.setItem('mapmyroots-new-tutorial-completed-date', new Date().toISOString());
    }

    /**
     * Reset tutorial progress
     */
    resetProgress() {
        localStorage.removeItem('mapmyroots-new-tutorial-completed');
        localStorage.removeItem('mapmyroots-new-tutorial-completed-date');
    }

    /**
     * Set completion callback
     */
    onComplete(callback) {
        this.manager.onTutorialComplete(() => {
            this.markCompleted();
            if (callback) callback();
        });
        return this;
    }

    /**
     * Set skip callback
     */
    onSkip(callback) {
        this.manager.onTutorialSkip(() => {
            this.markCompleted(); // Mark as completed even if skipped
            if (callback) callback();
        });
        return this;
    }

    /**
     * Add custom step
     */
    addStep(step) {
        this.manager.addStep(step);
        return this;
    }

    /**
     * Remove step by index
     */
    removeStep(index) {
        this.manager.removeStep(index);
        return this;
    }

    /**
     * Insert step at position
     */
    insertStep(index, step) {
        this.manager.insertStep(index, step);
        return this;
    }

    /**
     * Get current progress
     */
    getProgress() {
        return this.manager.getProgress();
    }

    /**
     * Check if tutorial is active
     */
    isActive() {
        return this.manager.getIsActive();
    }

    /**
     * Jump to specific step
     */
    goToStep(stepIndex) {
        this.manager.goToStep(stepIndex);
        return this;
    }

    /**
     * Update step content
     */
    updateStep(index, updates) {
        this.manager.updateStep(index, updates);
        return this;
    }

    /**
     * Get step configuration for debugging
     */
    getStepConfiguration() {
        return {
            totalSteps: this.manager.steps.length,
            currentStep: this.manager.currentStep,
            isActive: this.manager.isActive,
            steps: this.manager.steps.map(step => ({
                id: step.id,
                title: step.title,
                targetSelector: step.targetSelector
            }))
        };
    }

    /**
     * Create tutorial with custom steps
     */
    static createWithSteps(steps) {
        const tutorial = new Tutorial();
        tutorial.manager.steps = []; // Clear default steps
        steps.forEach(step => tutorial.addStep(step));
        return tutorial;
    }

    /**
     * Create tutorial for specific feature
     */
    static createForFeature(feature) {
        const tutorial = new Tutorial();
        tutorial.manager.steps = []; // Clear default steps
        const steps = TutorialSteps.getStepsForFeature(feature);
        steps.forEach(step => tutorial.addStep(step));
        return tutorial;
    }

    /**
     * Quick start tutorial
     */
    static quickStart() {
        const tutorial = new Tutorial();
        return tutorial.start();
    }

    /**
     * Destroy tutorial and cleanup
     */
    destroy() {
        this.manager.stop();
        this.renderer.destroy();
        this.ui.destroy();
        this.isInitialized = false;
    }
}

// Auto-initialize tutorial when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize global tutorial instance
        window.familyTreeTutorial = new Tutorial();
        
        // Auto-start for new users
        window.familyTreeTutorial.autoStart();
    });
} else {
    // DOM already loaded
    window.familyTreeTutorial = new Tutorial();
    window.familyTreeTutorial.autoStart();
}

export default Tutorial;