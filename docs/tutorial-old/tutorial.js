/**
 * Tutorial System for MapMyRoots Family Tree Builder
 * Provides guided introduction to the application features
 */

class TutorialManager {
    constructor() {
        this.currentStep = 0;
        this.isActive = false;
        this.steps = [
            {
                id: 'welcome',
                title: 'Welcome to MapMyRoots!',
                content: 'Create beautiful family trees with our interactive canvas-based builder.',
                animation: 'fadeInWelcome',
                duration: 3000
            },
            {
                id: 'add-person',
                title: 'Add Your First Person',
                content: 'Click the "Add Person" button to create your first family member.',
                animation: 'highlightAddButton',
                duration: 4000,
                target: '#addPersonBtn'
            },
            {
                id: 'fill-details',
                title: 'Fill Person Details',
                content: 'Enter name, birth date, and other information in the person form.',
                animation: 'showPersonForm',
                duration: 4000
            },
            {
                id: 'drag-move',
                title: 'Move People Around',
                content: 'Drag and drop people on the canvas to arrange your family tree.',
                animation: 'demonstrateDrag',
                duration: 4000
            },
            {
                id: 'connect-people',
                title: 'Create Relationships',
                content: 'Select two people and click "Link" to create family relationships.',
                animation: 'demonstrateConnection',
                duration: 4000
            },
            {
                id: 'save-export',
                title: 'Save and Export',
                content: 'Your tree auto-saves. Export to PNG, SVG, PDF, or GEDCOM formats.',
                animation: 'highlightExport',
                duration: 4000
            },
            {
                id: 'complete',
                title: 'Ready to Start!',
                content: 'You\'re all set to build your family tree. Have fun exploring!',
                animation: 'celebrationAnimation',
                duration: 3000
            }
        ];
        
        this.init();
    }

    init() {
        // Check if this is the first time user is visiting
        if (this.isFirstTimeUser()) {
            this.showTutorial();
        }
        
        // Set up event listeners
        this.setupEventListeners();
    }

    isFirstTimeUser() {
        // Check localStorage for previous visits
        const hasVisited = localStorage.getItem('mapmyroots-tutorial-completed');
        return !hasVisited;
    }

    showTutorial() {
        this.isActive = true;
        this.currentStep = 0;
        
        // Create and show tutorial modal
        this.createTutorialModal();
        this.showCurrentStep();
    }

    createTutorialModal() {
        // Remove existing modal if present
        const existingModal = document.getElementById('tutorialModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal HTML
        const modalHTML = `
            <div id="tutorialModal" class="tutorial-modal">
                <div class="tutorial-overlay"></div>
                <div class="tutorial-content">
                    <div class="tutorial-header">
                        <h2 id="tutorialTitle">MapMyRoots Tutorial</h2>
                        <button id="tutorialSkip" class="tutorial-skip-btn">Skip Tutorial</button>
                    </div>
                    
                    <div class="tutorial-body">
                        <div id="tutorialAnimation" class="tutorial-animation">
                            <!-- Animation content will be inserted here -->
                        </div>
                        
                        <div class="tutorial-text">
                            <h3 id="tutorialStepTitle">Welcome</h3>
                            <p id="tutorialStepContent">Loading tutorial...</p>
                        </div>
                    </div>
                    
                    <div class="tutorial-footer">
                        <div class="tutorial-progress">
                            <div class="progress-bar">
                                <div id="tutorialProgressFill" class="progress-fill"></div>
                            </div>
                            <span id="tutorialStepCount">1 / 7</span>
                        </div>
                        
                        <div class="tutorial-controls">
                            <button id="tutorialPrev" class="tutorial-btn tutorial-btn-secondary">Previous</button>
                            <button id="tutorialNext" class="tutorial-btn tutorial-btn-primary">Next</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Insert modal into DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add to DOM and trigger entrance animation
        setTimeout(() => {
            document.getElementById('tutorialModal').classList.add('active');
        }, 100);
    }

    setupEventListeners() {
        // Use event delegation for dynamically created elements
        document.addEventListener('click', (e) => {
            if (e.target.id === 'tutorialSkip') {
                this.skipTutorial();
            } else if (e.target.id === 'tutorialNext') {
                this.nextStep();
            } else if (e.target.id === 'tutorialPrev') {
                this.prevStep();
            }
        });

        // Close modal on overlay click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tutorial-overlay')) {
                this.skipTutorial();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!this.isActive) return;
            
            switch(e.key) {
                case 'Escape':
                    this.skipTutorial();
                    break;
                case 'ArrowRight':
                    this.nextStep();
                    break;
                case 'ArrowLeft':
                    this.prevStep();
                    break;
            }
        });
    }

    showCurrentStep() {
        const step = this.steps[this.currentStep];
        if (!step) return;

        // Update content
        document.getElementById('tutorialStepTitle').textContent = step.title;
        document.getElementById('tutorialStepContent').textContent = step.content;
        document.getElementById('tutorialStepCount').textContent = `${this.currentStep + 1} / ${this.steps.length}`;

        // Update progress bar
        const progressPercent = ((this.currentStep + 1) / this.steps.length) * 100;
        document.getElementById('tutorialProgressFill').style.width = `${progressPercent}%`;

        // Update button states
        const prevBtn = document.getElementById('tutorialPrev');
        const nextBtn = document.getElementById('tutorialNext');
        
        prevBtn.disabled = this.currentStep === 0;
        nextBtn.textContent = this.currentStep === this.steps.length - 1 ? 'Start Building!' : 'Next';

        // Show animation
        this.showStepAnimation(step);

        // Update control buttons visibility
        this.updateButtonStates();
    }

    showStepAnimation(step) {
        const animationContainer = document.getElementById('tutorialAnimation');
        animationContainer.className = 'tutorial-animation';
        
        // Clear previous animation
        animationContainer.innerHTML = '';

        // Create animation based on step
        switch(step.animation) {
            case 'fadeInWelcome':
                this.createWelcomeAnimation(animationContainer);
                break;
            case 'highlightAddButton':
                this.createAddButtonAnimation(animationContainer);
                break;
            case 'showPersonForm':
                this.createPersonFormAnimation(animationContainer);
                break;
            case 'demonstrateDrag':
                this.createDragAnimation(animationContainer);
                break;
            case 'demonstrateConnection':
                this.createConnectionAnimation(animationContainer);
                break;
            case 'highlightExport':
                this.createExportAnimation(animationContainer);
                break;
            case 'celebrationAnimation':
                this.createCelebrationAnimation(animationContainer);
                break;
        }

        // Add animation class
        animationContainer.classList.add(step.animation);
    }

    createWelcomeAnimation(container) {
        container.innerHTML = `
            <div class="welcome-animation">
                <div class="family-tree-logo">
                    <div class="tree-node root">👨‍👩‍👧‍👦</div>
                    <div class="tree-branches">
                        <div class="branch branch-1"></div>
                        <div class="branch branch-2"></div>
                    </div>
                    <div class="tree-node child-1">👨</div>
                    <div class="tree-node child-2">👩</div>
                </div>
                <div class="welcome-text">
                    <h3>Build Your Family Story</h3>
                </div>
            </div>
        `;
    }

    createAddButtonAnimation(container) {
        container.innerHTML = `
            <div class="add-button-demo">
                <div class="mock-toolbar">
                    <button class="mock-btn mock-add-btn pulsing">
                        <span>+</span> Add Person
                    </button>
                    <button class="mock-btn">Settings</button>
                    <button class="mock-btn">Export</button>
                </div>
                <div class="click-indicator">
                    <div class="click-circle"></div>
                    <div class="click-text">Click here!</div>
                </div>
            </div>
        `;
    }

    createPersonFormAnimation(container) {
        container.innerHTML = `
            <div class="person-form-demo">
                <div class="mock-form">
                    <div class="form-group">
                        <label>First Name</label>
                        <input type="text" class="typing-animation" data-text="John">
                    </div>
                    <div class="form-group">
                        <label>Last Name</label>
                        <input type="text" class="typing-animation" data-text="Smith" data-delay="1000">
                    </div>
                    <div class="form-group">
                        <label>Birth Date</label>
                        <input type="date" class="typing-animation" data-text="1990-01-01" data-delay="2000">
                    </div>
                </div>
            </div>
        `;
        
        // Trigger typing animations
        setTimeout(() => this.startTypingAnimations(), 500);
    }

    createDragAnimation(container) {
        container.innerHTML = `
            <div class="drag-demo">
                <div class="mock-canvas">
                    <div class="mock-person draggable" id="dragPerson">
                        <div class="person-circle">JS</div>
                        <div class="person-name">John Smith</div>
                    </div>
                    <div class="drag-path"></div>
                </div>
                <div class="drag-instruction">
                    <div class="drag-icon">✋</div>
                    <div class="drag-text">Drag to move</div>
                </div>
            </div>
        `;
        
        // Start drag animation
        setTimeout(() => this.startDragAnimation(), 1000);
    }

    createConnectionAnimation(container) {
        container.innerHTML = `
            <div class="connection-demo">
                <div class="mock-canvas">
                    <div class="mock-person selected" style="left: 50px; top: 50px;">
                        <div class="person-circle">👨</div>
                        <div class="person-name">Father</div>
                    </div>
                    <div class="mock-person selected" style="left: 150px; top: 50px;">
                        <div class="person-circle">👩</div>
                        <div class="person-name">Mother</div>
                    </div>
                    <div class="connection-line animating"></div>
                </div>
                <div class="link-button pulsing">
                    <button class="mock-btn">Link</button>
                </div>
            </div>
        `;
    }

    createExportAnimation(container) {
        container.innerHTML = `
            <div class="export-demo">
                <div class="mock-tree">
                    <div class="tree-visualization">
                        <div class="node">👨‍👩‍👧‍👦</div>
                        <div class="connections"></div>
                    </div>
                </div>
                <div class="export-options">
                    <div class="export-btn">📁 PNG</div>
                    <div class="export-btn">📄 SVG</div>
                    <div class="export-btn">📋 PDF</div>
                    <div class="export-btn">💾 GEDCOM</div>
                </div>
            </div>
        `;
    }

    createCelebrationAnimation(container) {
        container.innerHTML = `
            <div class="celebration-animation">
                <div class="confetti">
                    <div class="confetti-piece"></div>
                    <div class="confetti-piece"></div>
                    <div class="confetti-piece"></div>
                    <div class="confetti-piece"></div>
                    <div class="confetti-piece"></div>
                </div>
                <div class="success-message">
                    <div class="checkmark">✓</div>
                    <h3>You're Ready to Start!</h3>
                    <p>Have fun building your family tree</p>
                </div>
            </div>
        `;
    }

    startTypingAnimations() {
        const typingElements = document.querySelectorAll('.typing-animation');
        
        typingElements.forEach(element => {
            const text = element.getAttribute('data-text');
            const delay = parseInt(element.getAttribute('data-delay')) || 0;
            
            setTimeout(() => {
                this.typeText(element, text);
            }, delay);
        });
    }

    typeText(element, text) {
        let index = 0;
        element.value = '';
        
        const typing = setInterval(() => {
            element.value += text[index];
            index++;
            
            if (index >= text.length) {
                clearInterval(typing);
            }
        }, 100);
    }

    startDragAnimation() {
        const dragPerson = document.getElementById('dragPerson');
        const dragPath = document.querySelector('.drag-path');
        
        if (!dragPerson || !dragPath) return;
        
        // Show drag path
        dragPath.style.display = 'block';
        
        // Animate person movement
        dragPerson.style.transition = 'all 2s ease-in-out';
        dragPerson.style.transform = 'translate(100px, 50px)';
        
        // Reset after animation
        setTimeout(() => {
            dragPerson.style.transform = 'translate(0, 0)';
            dragPath.style.display = 'none';
        }, 2500);
    }

    updateButtonStates() {
        const prevBtn = document.getElementById('tutorialPrev');
        const nextBtn = document.getElementById('tutorialNext');
        
        if (prevBtn) {
            prevBtn.style.opacity = this.currentStep === 0 ? '0.5' : '1';
            prevBtn.style.cursor = this.currentStep === 0 ? 'not-allowed' : 'pointer';
        }
    }

    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.showCurrentStep();
        } else {
            this.completeTutorial();
        }
    }

    prevStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.showCurrentStep();
        }
    }

    skipTutorial() {
        this.closeTutorial();
        this.markTutorialCompleted();
    }

    completeTutorial() {
        this.closeTutorial();
        this.markTutorialCompleted();
        
        // Show completion message
        setTimeout(() => {
            this.showCompletionMessage();
        }, 500);
    }

    closeTutorial() {
        const modal = document.getElementById('tutorialModal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
        
        this.isActive = false;
    }

    markTutorialCompleted() {
        localStorage.setItem('mapmyroots-tutorial-completed', 'true');
        localStorage.setItem('mapmyroots-tutorial-completed-date', new Date().toISOString());
    }

    showCompletionMessage() {
        // Show a brief success notification
        const notification = document.createElement('div');
        notification.className = 'tutorial-completion-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">🎉</span>
                <span class="notification-text">Tutorial completed! Ready to build your family tree.</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // Public method to reset tutorial (for testing or user request)
    resetTutorial() {
        localStorage.removeItem('mapmyroots-tutorial-completed');
        localStorage.removeItem('mapmyroots-tutorial-completed-date');
    }

    // Public method to manually show tutorial
    showTutorialManually() {
        this.showTutorial();
    }
}

// Initialize tutorial when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.tutorialManager = new TutorialManager();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TutorialManager;
}