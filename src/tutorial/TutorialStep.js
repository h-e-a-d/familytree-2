/**
 * TutorialStep - Represents an individual tutorial step
 * Contains step configuration, content, and behavior
 */
export class TutorialStep {
    constructor(config = {}) {
        this.id = config.id || this.generateId();
        this.title = config.title || '';
        this.content = config.content || '';
        this.targetSelector = config.targetSelector || null;
        this.position = config.position || 'auto';
        this.animation = config.animation || 'fadeIn';
        this.highlightStyle = config.highlightStyle || 'pulse';
        this.beforeShow = config.beforeShow || null;
        this.afterShow = config.afterShow || null;
        this.beforeHide = config.beforeHide || null;
        this.afterHide = config.afterHide || null;
        this.validation = config.validation || null;
        this.waitForAction = config.waitForAction || false;
        this.actionSelector = config.actionSelector || null;
        this.actionEvent = config.actionEvent || 'click';
        this.canSkip = config.canSkip !== false;
        this.autoAdvance = config.autoAdvance || false;
        this.autoAdvanceDelay = config.autoAdvanceDelay || 3000;
        this.customData = config.customData || {};
    }

    /**
     * Generate unique ID for step
     */
    generateId() {
        return 'step_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Validate step configuration
     */
    validate() {
        const errors = [];

        if (!this.title) {
            errors.push('Step title is required');
        }

        if (!this.content) {
            errors.push('Step content is required');
        }

        if (this.waitForAction && !this.actionSelector) {
            errors.push('actionSelector is required when waitForAction is true');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Execute before show callback
     */
    async executeBeforeShow() {
        if (this.beforeShow && typeof this.beforeShow === 'function') {
            try {
                await this.beforeShow(this);
            } catch (error) {
                console.warn('Error in beforeShow callback:', error);
            }
        }
    }

    /**
     * Execute after show callback
     */
    async executeAfterShow() {
        if (this.afterShow && typeof this.afterShow === 'function') {
            try {
                await this.afterShow(this);
            } catch (error) {
                console.warn('Error in afterShow callback:', error);
            }
        }
    }

    /**
     * Execute before hide callback
     */
    async executeBeforeHide() {
        if (this.beforeHide && typeof this.beforeHide === 'function') {
            try {
                await this.beforeHide(this);
            } catch (error) {
                console.warn('Error in beforeHide callback:', error);
            }
        }
    }

    /**
     * Execute after hide callback
     */
    async executeAfterHide() {
        if (this.afterHide && typeof this.afterHide === 'function') {
            try {
                await this.afterHide(this);
            } catch (error) {
                console.warn('Error in afterHide callback:', error);
            }
        }
    }

    /**
     * Check if step should auto-advance
     */
    shouldAutoAdvance() {
        return this.autoAdvance && !this.waitForAction;
    }

    /**
     * Get target element
     */
    getTargetElement() {
        if (!this.targetSelector) return null;
        return document.querySelector(this.targetSelector);
    }

    /**
     * Check if target element exists
     */
    hasValidTarget() {
        return this.targetSelector ? this.getTargetElement() !== null : true;
    }

    /**
     * Update step configuration
     */
    update(config) {
        Object.assign(this, config);
        return this;
    }

    /**
     * Clone step with optional overrides
     */
    clone(overrides = {}) {
        const config = {
            id: this.id,
            title: this.title,
            content: this.content,
            targetSelector: this.targetSelector,
            position: this.position,
            animation: this.animation,
            highlightStyle: this.highlightStyle,
            beforeShow: this.beforeShow,
            afterShow: this.afterShow,
            beforeHide: this.beforeHide,
            afterHide: this.afterHide,
            validation: this.validation,
            waitForAction: this.waitForAction,
            actionSelector: this.actionSelector,
            actionEvent: this.actionEvent,
            canSkip: this.canSkip,
            autoAdvance: this.autoAdvance,
            autoAdvanceDelay: this.autoAdvanceDelay,
            customData: { ...this.customData },
            ...overrides
        };

        return new TutorialStep(config);
    }

    /**
     * Convert to JSON
     */
    toJSON() {
        return {
            id: this.id,
            title: this.title,
            content: this.content,
            targetSelector: this.targetSelector,
            position: this.position,
            animation: this.animation,
            highlightStyle: this.highlightStyle,
            waitForAction: this.waitForAction,
            actionSelector: this.actionSelector,
            actionEvent: this.actionEvent,
            canSkip: this.canSkip,
            autoAdvance: this.autoAdvance,
            autoAdvanceDelay: this.autoAdvanceDelay,
            customData: this.customData
        };
    }

    /**
     * Create step from JSON
     */
    static fromJSON(json) {
        return new TutorialStep(json);
    }
}

/**
 * TutorialStepBuilder - Fluent interface for building tutorial steps
 */
export class TutorialStepBuilder {
    constructor() {
        this.config = {};
    }

    id(id) {
        this.config.id = id;
        return this;
    }

    title(title) {
        this.config.title = title;
        return this;
    }

    content(content) {
        this.config.content = content;
        return this;
    }

    target(selector) {
        this.config.targetSelector = selector;
        return this;
    }

    position(position) {
        this.config.position = position;
        return this;
    }

    animation(animation) {
        this.config.animation = animation;
        return this;
    }

    highlightStyle(style) {
        this.config.highlightStyle = style;
        return this;
    }

    beforeShow(callback) {
        this.config.beforeShow = callback;
        return this;
    }

    afterShow(callback) {
        this.config.afterShow = callback;
        return this;
    }

    beforeHide(callback) {
        this.config.beforeHide = callback;
        return this;
    }

    afterHide(callback) {
        this.config.afterHide = callback;
        return this;
    }

    waitFor(selector, event = 'click') {
        this.config.waitForAction = true;
        this.config.actionSelector = selector;
        this.config.actionEvent = event;
        return this;
    }

    autoAdvance(delay = 3000) {
        this.config.autoAdvance = true;
        this.config.autoAdvanceDelay = delay;
        return this;
    }

    canSkip(canSkip = true) {
        this.config.canSkip = canSkip;
        return this;
    }

    data(customData) {
        this.config.customData = customData;
        return this;
    }

    build() {
        return new TutorialStep(this.config);
    }
}