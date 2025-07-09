# MapMyRoots Tutorial System

A comprehensive, interactive tutorial system that guides new users through the family tree builder's key features.

## Overview

The tutorial system provides an onboarding experience for first-time users with:

- **Animated demonstrations** of core features
- **Step-by-step guidance** through the interface
- **Skip functionality** for experienced users
- **Responsive design** for all devices
- **Automatic first-visit detection**

## Files Structure

```
tutorial/
├── tutorial.js       # Main tutorial controller and logic
├── tutorial.css      # Complete styling and animations
└── README.md         # This documentation file
```

## Features

### 🎯 Smart Detection
- Automatically detects first-time users
- Uses localStorage to track tutorial completion
- Only shows for genuinely new users

### 🎨 Rich Animations
- **Welcome Animation**: Animated family tree logo with connecting branches
- **Add Person Demo**: Pulsing button with click indicators
- **Form Filling**: Realistic typing animations in form fields
- **Drag & Drop**: Floating person nodes with movement paths
- **Connections**: Animated relationship line drawing
- **Export Options**: Sequential display of export formats
- **Celebration**: Confetti and success animations

### 📱 Responsive Design
- Mobile-optimized layouts
- Touch-friendly controls
- Adaptive animation sizes
- Compact modal for small screens

### ⌨️ Accessibility
- Full keyboard navigation (Arrow keys, Escape)
- Screen reader compatible
- Focus management
- ARIA labels and roles

## Tutorial Steps

1. **Welcome** (3s) - Introduction to MapMyRoots
2. **Add Person** (4s) - How to create your first family member
3. **Fill Details** (4s) - Entering person information
4. **Drag & Move** (4s) - Arranging people on the canvas
5. **Create Relationships** (4s) - Linking family members
6. **Save & Export** (4s) - Saving and exporting options
7. **Complete** (3s) - Ready to start building

## Integration

### Automatic Integration
The tutorial is automatically integrated into `builder.html`:

```html
<!-- CSS -->
<link rel="stylesheet" href="tutorial/tutorial.css" />

<!-- JavaScript -->
<script src="tutorial/tutorial.js"></script>
```

### Manual Controls
Developers can programmatically control the tutorial:

```javascript
// Reset tutorial for testing
window.tutorialManager.resetTutorial();

// Manually show tutorial
window.tutorialManager.showTutorialManually();

// Check if user has completed tutorial
const hasCompleted = localStorage.getItem('mapmyroots-tutorial-completed');
```

## User Experience Flow

### First Visit
1. User opens family tree builder for the first time
2. Tutorial modal appears automatically after DOM loads
3. User can choose to follow the tutorial or skip it
4. Progress is tracked through each step
5. Completion is stored in localStorage

### Return Visits
1. Tutorial checks localStorage for completion flag
2. If completed, no tutorial is shown
3. User proceeds directly to the application

### Manual Access
- Tutorial can be triggered manually through developer tools
- Useful for testing or support scenarios

## Customization

### Adding New Steps
To add a new tutorial step:

1. **Add step definition** in `tutorial.js`:
```javascript
{
    id: 'new-feature',
    title: 'New Feature Title',
    content: 'Description of the new feature',
    animation: 'newFeatureAnimation',
    duration: 4000
}
```

2. **Create animation method**:
```javascript
createNewFeatureAnimation(container) {
    container.innerHTML = `
        <div class="new-feature-demo">
            <!-- Animation HTML -->
        </div>
    `;
}
```

3. **Add CSS animations** in `tutorial.css`:
```css
.new-feature-demo {
    /* Animation styles */
}
```

### Styling Customization
All visual elements can be customized through CSS variables and classes in `tutorial.css`:

- **Colors**: Update gradient colors and theme colors
- **Timing**: Modify animation durations and delays
- **Layout**: Adjust modal sizing and positioning
- **Typography**: Change fonts and text styling

## Browser Compatibility

- **Modern Browsers**: Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- **Mobile**: iOS Safari 12+, Chrome Mobile 60+
- **Features Used**: CSS Grid, Flexbox, ES6 Classes, localStorage

## Performance

- **Lightweight**: ~15KB total (CSS + JS)
- **Lazy Loading**: Animations created on-demand
- **Memory Efficient**: Modal removed from DOM after completion
- **No Dependencies**: Pure vanilla JavaScript and CSS

## Testing

To test the tutorial system:

1. **Reset completion status**:
```javascript
localStorage.removeItem('mapmyroots-tutorial-completed');
```

2. **Reload the page** - Tutorial should appear automatically

3. **Test responsiveness** - Resize browser window during tutorial

4. **Test keyboard navigation** - Use arrow keys and Escape

## Maintenance

### Regular Updates
- Review tutorial content for accuracy with new features
- Update animations to match UI changes
- Test across different browsers and devices

### Content Updates
- Keep step descriptions current with actual UI
- Update screenshots or animations for major UI changes
- Add steps for significant new features

## Troubleshooting

### Tutorial Not Appearing
1. Check localStorage: `localStorage.getItem('mapmyroots-tutorial-completed')`
2. Verify CSS and JS files are loading
3. Check browser console for JavaScript errors

### Animation Issues
1. Verify CSS animations are supported
2. Check for conflicting CSS styles
3. Test on different devices and browsers

### Performance Issues
1. Ensure animations are hardware-accelerated
2. Check for memory leaks in long sessions
3. Optimize animation complexity if needed

## Future Enhancements

### Planned Features
- **Contextual Help**: Mini-tutorials for specific features
- **Interactive Tooltips**: Hover-based guidance
- **Video Integration**: Embedded demonstration videos
- **Multi-language Support**: Tutorial content in multiple languages
- **Analytics**: Track tutorial completion and drop-off rates

### Advanced Features
- **Adaptive Tutorials**: Different paths based on user behavior
- **Interactive Practice**: Let users try features during tutorial
- **Progress Saving**: Resume tutorial from where user left off
- **Custom Tours**: Admin-created tutorial sequences

## Support

For issues or questions regarding the tutorial system:

1. Check this documentation first
2. Review browser console for errors
3. Test in a clean browser environment
4. Verify file paths and integration

The tutorial system is designed to be self-contained and easy to maintain while providing a comprehensive introduction to the MapMyRoots family tree builder.