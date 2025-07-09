# Tutorial System Documentation

A modular, flexible tutorial system for the MapMyRoots family tree application. This system provides contextual guidance by highlighting specific UI elements while dimming the background, with positioned modals showing step-by-step instructions.

## Features

- **Contextual Highlighting**: Dims the entire interface while highlighting target elements
- **Modular Architecture**: Easy to add, remove, or modify tutorial steps
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Real Visual Examples**: Uses actual node and line styles from the application
- **Keyboard Navigation**: Full keyboard support with arrow keys and escape
- **Auto-Detection**: Automatically shows for first-time users
- **Flexible Positioning**: Smart modal positioning relative to target elements

## Architecture

### Core Components

1. **TutorialManager** - Central controller managing tutorial flow and state
2. **TutorialStep** - Individual step configuration and behavior
3. **TutorialRenderer** - Handles highlighting and dimming effects
4. **TutorialUI** - Modal display and positioning system
5. **TutorialSteps** - Predefined step definitions using real app styles

### File Structure

```
src/tutorial/
├── Tutorial.js          # Main entry point
├── TutorialManager.js    # Core controller
├── TutorialStep.js       # Step configuration classes
├── TutorialRenderer.js   # Visual highlighting system
├── TutorialUI.js         # Modal and positioning
├── TutorialSteps.js      # Predefined steps
└── README.md            # This documentation
```

## Quick Start

### Basic Usage

```javascript
import Tutorial from './src/tutorial/Tutorial.js';

// Auto-initialize and start for new users
const tutorial = new Tutorial();
tutorial.autoStart();

// Or manually start
tutorial.start();
```

### Integration in HTML

Add to your `builder.html`:

```html
<!-- Add before closing </body> tag -->
<script type="module">
  import Tutorial from './src/tutorial/Tutorial.js';
  
  // Initialize tutorial system
  window.familyTreeTutorial = new Tutorial();
  window.familyTreeTutorial.autoStart();
</script>
```

## Built-in Steps

The system comes with 5 predefined steps:

1. **Add Person** - Highlights the Add Person button (`#addPersonBtn`)
2. **Add Connection** - Shows how to link people (`#connectBtn`)
3. **Change Color** - Demonstrates styling options (`#styleBtn`)
4. **Save to JSON** - Explains saving functionality (`#saveBtn`)
5. **Export to PNG** - Shows export options (`#exportBtn`)

Each step uses real visual examples matching the application's design system.

## Customization

### Adding Custom Steps

```javascript
import { TutorialStepBuilder } from './src/tutorial/TutorialStep.js';

const customStep = new TutorialStepBuilder()
  .id('my-custom-step')
  .title('Custom Feature')
  .content('<p>This explains a custom feature...</p>')
  .target('#my-button')
  .position('bottom')
  .highlightStyle('pulse')
  .build();

tutorial.addStep(customStep);
```

### Creating Feature-Specific Tutorials

```javascript
// Tutorial for just basic features
const basicTutorial = Tutorial.createForFeature('basic');

// Tutorial for styling features only
const stylingTutorial = Tutorial.createForFeature('styling');

// Tutorial for export features
const exportTutorial = Tutorial.createForFeature('export');
```

### Modifying Existing Steps

```javascript
// Update step content dynamically
tutorial.updateStep(0, {
  title: 'Updated Title',
  content: '<p>New content...</p>'
});

// Remove a step
tutorial.removeStep(2);

// Insert step at specific position
tutorial.insertStep(1, customStep);
```

## Advanced Configuration

### Step Builder Options

```javascript
const step = new TutorialStepBuilder()
  .id('unique-step-id')
  .title('Step Title')
  .content('<p>HTML content with <strong>formatting</strong></p>')
  .target('#css-selector')
  .position('auto') // 'auto', 'top', 'bottom', 'left', 'right'
  .highlightStyle('pulse') // 'pulse', 'glow', 'bounce', 'solid'
  .animation('animate-bounce') // CSS animation class
  .beforeShow(async (step) => {
    // Code to run before showing step
  })
  .afterShow(async (step) => {
    // Code to run after showing step
  })
  .waitFor('#button-selector', 'click') // Wait for user action
  .autoAdvance(3000) // Auto-advance after 3 seconds
  .canSkip(true) // Allow skipping this step
  .data({ customProperty: 'value' }) // Custom data
  .build();
```

### Event Handling

```javascript
tutorial
  .onComplete(() => {
    console.log('Tutorial completed!');
    // Show celebration or redirect
  })
  .onSkip(() => {
    console.log('Tutorial skipped');
    // Track analytics
  });
```

### Highlighting Styles

- **pulse**: Gentle pulsing animation with glow
- **glow**: Strong glow effect with enhanced shadows
- **bounce**: Bouncing animation to draw attention
- **solid**: Static highlight without animation

### Modal Positioning

- **auto**: Smart positioning based on available space
- **top**: Position above the target element
- **bottom**: Position below the target element  
- **left**: Position to the left of the target
- **right**: Position to the right of the target

## API Reference

### Tutorial Class

#### Methods

- `start()` - Start the tutorial
- `stop()` - Stop and hide tutorial
- `autoStart()` - Start only for new users
- `addStep(step)` - Add a tutorial step
- `removeStep(index)` - Remove step by index
- `insertStep(index, step)` - Insert step at position
- `goToStep(index)` - Jump to specific step
- `getProgress()` - Get current progress info
- `isActive()` - Check if tutorial is running
- `onComplete(callback)` - Set completion handler
- `onSkip(callback)` - Set skip handler

#### Static Methods

- `Tutorial.quickStart()` - Create and start tutorial immediately
- `Tutorial.createForFeature(feature)` - Create feature-specific tutorial
- `Tutorial.createWithSteps(steps)` - Create with custom step array

### TutorialManager Class

Controls tutorial flow and state management.

#### Properties

- `currentStep` - Current step index
- `steps` - Array of tutorial steps
- `isActive` - Whether tutorial is running

#### Methods

- `next()` - Move to next step
- `previous()` - Move to previous step
- `reset()` - Reset to first step

### TutorialRenderer Class

Handles visual highlighting effects.

#### Methods

- `highlightElement(selector, style)` - Highlight an element
- `clearHighlight()` - Remove all highlighting
- `setOverlayOpacity(opacity)` - Adjust dim overlay opacity
- `createCustomHighlight(element, options)` - Create custom highlight shapes

### TutorialUI Class

Manages modal display and positioning.

#### Methods

- `showModal(stepData)` - Display step modal
- `hideModal()` - Hide modal
- `setHandlers(handlers)` - Set event handlers

## Browser Support

- **Modern Browsers**: Chrome 70+, Firefox 65+, Safari 12+, Edge 79+
- **Mobile**: iOS Safari 12+, Chrome Mobile 70+
- **Features**: ES6 modules, CSS Grid, Flexbox, Canvas API

## Performance Considerations

- Lazy loading: Tutorial modules only load when needed
- Efficient animations: CSS-based animations with hardware acceleration
- Memory management: Automatic cleanup of event listeners and timers
- Responsive: Optimized for all screen sizes

## Accessibility

- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Proper ARIA labels and roles
- **Focus Management**: Maintains focus within tutorial modals
- **High Contrast**: Compatible with high contrast modes

## Troubleshooting

### Common Issues

1. **Target element not found**
   ```javascript
   // Check if element exists before highlighting
   if (!document.querySelector('#my-button')) {
     console.warn('Tutorial target not found');
   }
   ```

2. **Modal positioning issues**
   ```javascript
   // Force specific position if auto-positioning fails
   step.position = 'bottom';
   ```

3. **Z-index conflicts**
   ```css
   /* Ensure tutorial elements have highest z-index */
   .tutorial-overlay { z-index: 9998; }
   .tutorial-highlight { z-index: 9999; }
   .tutorial-modal { z-index: 10000; }
   ```

### Debug Mode

```javascript
// Enable debug logging
tutorial.manager.debug = true;

// Get current configuration
console.log(tutorial.getStepConfiguration());
```

## Examples

### Simple Custom Tutorial

```javascript
import { Tutorial, TutorialStepBuilder } from './src/tutorial/Tutorial.js';

const myTutorial = new Tutorial();

// Clear default steps and add custom ones
myTutorial.manager.steps = [];

myTutorial.addStep(
  new TutorialStepBuilder()
    .title('Welcome!')
    .content('<p>Welcome to our amazing app!</p>')
    .target('#welcome-button')
    .build()
);

myTutorial.start();
```

### Conditional Steps

```javascript
const steps = [];

// Add basic steps
steps.push(TutorialSteps.getStepById('add-person-step'));

// Add advanced steps for power users
if (userLevel === 'advanced') {
  steps.push(
    new TutorialStepBuilder()
      .title('Advanced Features')
      .content('<p>Explore advanced functionality...</p>')
      .target('#advanced-panel')
      .build()
  );
}

const tutorial = Tutorial.createWithSteps(steps);
tutorial.start();
```

### Integration with Analytics

```javascript
tutorial
  .onComplete(() => {
    analytics.track('tutorial_completed');
    showCelebration();
  })
  .onSkip(() => {
    analytics.track('tutorial_skipped', {
      step: tutorial.getProgress().currentStep
    });
  });
```

## Contributing

When adding new tutorial features:

1. **Follow the existing architecture** - Use the builder pattern for steps
2. **Test on all devices** - Ensure mobile compatibility
3. **Validate accessibility** - Check keyboard navigation and screen readers
4. **Update documentation** - Keep this README current
5. **Consider performance** - Minimize DOM manipulation and memory usage

## License

This tutorial system is part of the MapMyRoots family tree application and follows the same licensing terms.