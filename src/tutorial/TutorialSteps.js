/**
 * TutorialSteps - Defines the 5 initial tutorial steps
 * Uses real node and line styles from default.json
 */
import { TutorialStep, TutorialStepBuilder } from './TutorialStep.js';

export class TutorialSteps {
    /**
     * Create all tutorial steps
     */
    static createAllSteps() {
        return [
            this.createAddPersonStep(),
            this.createAddConnectionStep(),
            this.createChangeColorStep(),
            this.createSaveToJSONStep(),
            this.createExportToPNGStep()
        ];
    }

    /**
     * Step 1: Add Person
     */
    static createAddPersonStep() {
        return new TutorialStepBuilder()
            .id('add-person-step')
            .title('Add a Person')
            .content(`
                <p>Start building your family tree by adding a person. Click the <strong>Add Person</strong> button to create your first family member.</p>
                <p>This button is located at the bottom-right corner of the screen and is your main tool for adding people to the tree.</p>
            `)
            .target('#addPersonBtn')
            .position('left')
            .highlightStyle('pulse')
            .animation('animate-bounce')
            .beforeShow(async (step) => {
                // Ensure the add person button is visible
                const addBtn = document.querySelector('#addPersonBtn');
                if (addBtn) {
                    addBtn.style.display = 'flex';
                    addBtn.classList.add('tutorial-highlight-active');
                }
            })
            .afterHide(async (step) => {
                // Clean up highlighting
                const addBtn = document.querySelector('#addPersonBtn');
                if (addBtn) {
                    addBtn.classList.remove('tutorial-highlight-active');
                }
            })
            .data({
                buttonText: 'Add Person',
                expectedAction: 'click_add_person',
                sampleNode: {
                    color: '#71be96',
                    radius: 60,
                    name: 'John'
                }
            })
            .build();
    }

    /**
     * Step 2: Add Connection/Line
     */
    static createAddConnectionStep() {
        return new TutorialStepBuilder()
            .id('add-connection-step')
            .title('Create Connections')
            .content(`
                <p>To create connections, you need people in your tree first. Once you have people:</p>
                <ol>
                    <li>Click to select the first person</li>
                    <li>Hold Ctrl/Cmd and click to select the second person</li>
                    <li>Click the <strong>Link</strong> button that appears</li>
                </ol>
                <p>The Link button creates family relationships between selected people.</p>
            `)
            .target('#connectBtn')
            .position('left')
            .highlightStyle('glow')
            .animation('animate-slide')
            .beforeShow(async (step) => {
                // Force show and position the connect button for tutorial
                const connectBtn = document.querySelector('#connectBtn');
                if (connectBtn) {
                    connectBtn.classList.remove('hidden');
                    connectBtn.style.display = 'flex';
                    connectBtn.style.position = 'fixed';
                    connectBtn.style.bottom = '80px';
                    connectBtn.style.right = '20px';
                    connectBtn.style.zIndex = '10000';
                    connectBtn.classList.add('tutorial-highlight-active');
                }
            })
            .afterHide(async (step) => {
                const connectBtn = document.querySelector('#connectBtn');
                if (connectBtn) {
                    connectBtn.classList.remove('tutorial-highlight-active');
                    connectBtn.classList.add('hidden');
                    connectBtn.style.position = '';
                    connectBtn.style.bottom = '';
                    connectBtn.style.right = '';
                    connectBtn.style.zIndex = '';
                }
            })
            .data({
                buttonText: 'Link',
                expectedAction: 'click_connect',
                requiresSelection: true,
                sampleConnection: {
                    color: '#6b7280',
                    type: 'parent-child'
                }
            })
            .build();
    }

    /**
     * Step 3: Change Color using Style Button
     */
    static createChangeColorStep() {
        return new TutorialStepBuilder()
            .id('change-color-step')
            .title('Customize Node Appearance')
            .content(`
                <p>Personalize your family tree by changing node colors and styles.</p>
                <ol>
                    <li>Click on a person in your tree to select them</li>
                    <li>Click the <strong>Style</strong> button that appears</li>
                    <li>Choose from various colors and styles</li>
                </ol>
                <div style="display: flex; gap: 8px; justify-content: center; margin: 12px 0;">
                    <div style="width: 24px; height: 24px; border-radius: 50%; background: #71be96; border: 2px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></div>
                    <div style="width: 24px; height: 24px; border-radius: 50%; background: #a2e4d7; border: 2px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></div>
                    <div style="width: 24px; height: 24px; border-radius: 50%; background: #94d0c2; border: 2px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></div>
                    <div style="width: 24px; height: 24px; border-radius: 50%; background: #87c4b8; border: 2px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></div>
                </div>
            `)
            .target('#styleBtn')
            .position('left')
            .highlightStyle('pulse')
            .animation('animate-bounce')
            .beforeShow(async (step) => {
                // Force show and position the style button for tutorial
                const styleBtn = document.querySelector('#styleBtn');
                if (styleBtn) {
                    styleBtn.classList.remove('hidden');
                    styleBtn.style.display = 'flex';
                    styleBtn.style.position = 'fixed';
                    styleBtn.style.bottom = '140px';
                    styleBtn.style.right = '20px';
                    styleBtn.style.zIndex = '10000';
                    styleBtn.classList.add('tutorial-highlight-active');
                }
            })
            .afterHide(async (step) => {
                const styleBtn = document.querySelector('#styleBtn');
                if (styleBtn) {
                    styleBtn.classList.remove('tutorial-highlight-active');
                    styleBtn.classList.add('hidden');
                    styleBtn.style.position = '';
                    styleBtn.style.bottom = '';
                    styleBtn.style.right = '';
                    styleBtn.style.zIndex = '';
                }
            })
            .data({
                buttonText: 'Style',
                expectedAction: 'click_style',
                requiresSelection: true,
                availableColors: ['#71be96', '#a2e4d7', '#94d0c2', '#87c4b8', '#7bc4a8', '#6bb49a', '#5fa48c']
            })
            .build();
    }

    /**
     * Step 4: Save to JSON
     */
    static createSaveToJSONStep() {
        return new TutorialStepBuilder()
            .id('save-json-step')
            .title('Save Your Family Tree')
            .content(`
                <p>Preserve your work by saving your family tree to a JSON file. Click the <strong>Save</strong> button in the toolbar to download your tree data.</p>
                <p>This creates a backup file that you can load later to continue working on your family tree or share with others.</p>
            `)
            .target('#saveBtn')
            .position('bottom')
            .highlightStyle('glow')
            .animation('animate-bounce')
            .beforeShow(async (step) => {
                const saveBtn = document.querySelector('#saveBtn');
                if (saveBtn) {
                    saveBtn.classList.add('tutorial-highlight-active');
                }
            })
            .afterHide(async (step) => {
                const saveBtn = document.querySelector('#saveBtn');
                if (saveBtn) {
                    saveBtn.classList.remove('tutorial-highlight-active');
                }
            })
            .data({
                buttonText: 'Save',
                expectedAction: 'click_save',
                fileFormat: 'JSON',
                description: 'Saves the complete family tree data including all people, relationships, and styling'
            })
            .build();
    }

    /**
     * Step 5: Export to PNG
     */
    static createExportToPNGStep() {
        return new TutorialStepBuilder()
            .id('export-png-step')
            .title('Export as Image')
            .content(`
                <p>Share your beautiful family tree by exporting it as an image. Click the <strong>Export</strong> button, then select <strong>PNG</strong> format.</p>
                <p>This creates a high-quality image file perfect for printing, sharing on social media, or including in documents.</p>
            `)
            .target('#exportBtn')
            .position('bottom')
            .highlightStyle('pulse')
            .animation('animate-slide')
            .beforeShow(async (step) => {
                const exportBtn = document.querySelector('#exportBtn');
                if (exportBtn) {
                    exportBtn.classList.add('tutorial-highlight-active');
                }
            })
            .afterShow(async (step) => {
                // Show additional guidance about the PNG option
                const exportMenu = document.querySelector('#exportMenu');
                if (exportMenu && !exportMenu.style.display) {
                    step.update({
                        content: `
                            <p>Great! Now you can see the export options. Look for the <strong>PNG</strong> option in the export menu.</p>
                            <p>PNG format provides:</p>
                            <ul>
                                <li>High-quality images with transparent backgrounds</li>
                                <li>Perfect for web sharing and printing</li>
                                <li>Preserves all colors and details from your tree</li>
                            </ul>
                        `,
                        targetSelector: '[data-format="png"]'
                    });
                }
            })
            .afterHide(async (step) => {
                const exportBtn = document.querySelector('#exportBtn');
                if (exportBtn) {
                    exportBtn.classList.remove('tutorial-highlight-active');
                }
                // Also clean up PNG option if highlighted
                const pngOption = document.querySelector('[data-format="png"]');
                if (pngOption) {
                    pngOption.classList.remove('tutorial-highlight-active');
                }
            })
            .data({
                buttonText: 'Export',
                expectedAction: 'click_export',
                primaryFormat: 'PNG',
                alternativeFormats: ['PNG Transparent', 'JPEG', 'SVG', 'PDF'],
                description: 'Exports the visual family tree as a high-resolution image file'
            })
            .build();
    }

    /**
     * Create a custom step with default styling
     */
    static createCustomStep(config) {
        return new TutorialStepBuilder()
            .id(config.id || 'custom-step')
            .title(config.title || 'Tutorial Step')
            .content(config.content || 'Step content')
            .target(config.targetSelector || null)
            .position(config.position || 'auto')
            .highlightStyle(config.highlightStyle || 'pulse')
            .animation(config.animation || 'animate-bounce')
            .data(config.customData || {})
            .build();
    }

    /**
     * Get step by ID
     */
    static getStepById(id) {
        const steps = this.createAllSteps();
        return steps.find(step => step.id === id);
    }

    /**
     * Get steps for specific feature
     */
    static getStepsForFeature(feature) {
        const allSteps = this.createAllSteps();
        
        switch (feature) {
            case 'basic':
                return [allSteps[0], allSteps[1]]; // Add person, add connection
            case 'styling':
                return [allSteps[2]]; // Change color
            case 'export':
                return [allSteps[3], allSteps[4]]; // Save, export
            default:
                return allSteps;
        }
    }

    /**
     * Validate all steps
     */
    static validateAllSteps() {
        const steps = this.createAllSteps();
        const results = steps.map(step => ({
            id: step.id,
            validation: step.validate()
        }));
        
        const isValid = results.every(result => result.validation.isValid);
        const errors = results.filter(result => !result.validation.isValid);
        
        return {
            isValid,
            errors,
            results
        };
    }
}