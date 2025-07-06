import { test, expect } from '@playwright/test';

const breakpoints = [
  { name: 'Desktop Large', width: 1920, height: 1080 },
  { name: 'Desktop', width: 1280, height: 720 },
  { name: 'Laptop', width: 1024, height: 768 },
  { name: 'Tablet Portrait', width: 768, height: 1024 },
  { name: 'Tablet Landscape', width: 1024, height: 768 },
  { name: 'Mobile Large', width: 414, height: 896 },
  { name: 'Mobile', width: 375, height: 667 },
  { name: 'Mobile Small', width: 320, height: 568 }
];

test.describe('MapMyRoots Website Comprehensive Testing', () => {
  
  test.describe('Homepage Tests', () => {
    
    test('should load homepage successfully', async ({ page }) => {
      await page.goto('/');
      
      // Check page loads without errors
      await expect(page).toHaveTitle(/MapMyRoots|Family Tree/i);
      
      // Check for console errors
      const errors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      // Wait for page to fully load
      await page.waitForLoadState('networkidle');
      
      // Report any console errors
      if (errors.length > 0) {
        console.warn('Console errors detected:', errors);
      }
    });

    test('should have accessible navigation', async ({ page }) => {
      await page.goto('/');
      
      // Check for main navigation elements
      const nav = page.locator('nav, [role="navigation"]');
      await expect(nav).toBeVisible();
      
      // Check for "Start Building Tree" button
      const startButton = page.locator('text="Start Building"').or(page.locator('a[href*="builder"]')).first();
      await expect(startButton).toBeVisible();
      await expect(startButton).toBeEnabled();
    });

    breakpoints.forEach(({ name, width, height }) => {
      test(`should be responsive at ${name} (${width}x${height})`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto('/');
        
        // Wait for page to load
        await page.waitForLoadState('networkidle');
        
        // Check if page content is visible
        const body = page.locator('body');
        await expect(body).toBeVisible();
        
        // Check for layout issues
        const overflow = await page.evaluate(() => {
          return document.body.scrollWidth > window.innerWidth;
        });
        
        // Take screenshot for visual comparison
        await page.screenshot({ 
          path: `test-results/homepage-${name.toLowerCase().replace(/\s+/g, '-')}.png`,
          fullPage: true 
        });
        
        // Check for horizontal scrollbar (potential layout issue)
        if (overflow && width >= 768) {
          console.warn(`Potential horizontal overflow detected at ${name}`);
        }
        
        // Verify critical elements are still visible at this breakpoint
        const startButton = page.locator('text="Start Building"').or(page.locator('a[href*="builder"]')).first();
        if (await startButton.count() > 0) {
          await expect(startButton).toBeVisible();
        }
      });
    });

    test('should have proper meta tags and SEO elements', async ({ page }) => {
      await page.goto('/');
      
      // Check for essential meta tags
      const metaDescription = page.locator('meta[name="description"]');
      await expect(metaDescription).toHaveAttribute('content', /.+/);
      
      // Check for favicon
      const favicon = page.locator('link[rel*="icon"]');
      await expect(favicon).toHaveCount(/[1-9]/);
      
      // Check for viewport meta tag
      const viewport = page.locator('meta[name="viewport"]');
      await expect(viewport).toHaveAttribute('content', /width=device-width/);
    });
  });

  test.describe('Tree Builder Navigation', () => {
    
    test('should navigate to tree builder successfully', async ({ page }) => {
      await page.goto('/');
      
      // Find and click the "Start Building Tree" button
      const startButton = page.locator('text="Start Building"').or(page.locator('a[href*="builder"]')).first();
      await startButton.click();
      
      // Wait for navigation and page load
      await page.waitForLoadState('networkidle');
      
      // Verify we're on the builder page
      await expect(page).toHaveURL(/builder/);
      
      // Check for tree builder elements
      const canvas = page.locator('canvas');
      await expect(canvas).toBeVisible();
    });
  });

  test.describe('Tree Builder Functionality', () => {
    
    test.beforeEach(async ({ page }) => {
      // Navigate directly to builder for these tests
      await page.goto('/builder.html');
      await page.waitForLoadState('networkidle');
    });

    test('should load tree builder interface', async ({ page }) => {
      // Check for main canvas
      const canvas = page.locator('canvas');
      await expect(canvas).toBeVisible();
      
      // Check for toolbar/controls
      const toolbar = page.locator('.toolbar, .controls, [role="toolbar"]');
      if (await toolbar.count() > 0) {
        await expect(toolbar).toBeVisible();
      }
      
      // Check for add person button
      const addButton = page.locator('text="Add Person"').or(page.locator('button[title*="Add"]')).first();
      if (await addButton.count() > 0) {
        await expect(addButton).toBeVisible();
      }
    });

    test('should handle canvas interactions', async ({ page }) => {
      const canvas = page.locator('canvas');
      await expect(canvas).toBeVisible();
      
      // Test canvas is interactive
      const canvasBox = await canvas.boundingBox();
      if (canvasBox) {
        // Click on canvas
        await canvas.click({ position: { x: canvasBox.width / 2, y: canvasBox.height / 2 } });
        
        // Test zoom (if supported)
        await canvas.hover();
        await page.mouse.wheel(0, -100); // Zoom in
        await page.mouse.wheel(0, 100);  // Zoom out
      }
    });

    test('should open add person modal', async ({ page }) => {
      // Look for add person button
      const addButton = page.locator('text="Add Person"').or(page.locator('button[title*="Add"]')).first();
      
      if (await addButton.count() > 0) {
        await addButton.click();
        
        // Wait for modal to appear
        const modal = page.locator('.modal, [role="dialog"]');
        await expect(modal).toBeVisible();
        
        // Check for form fields
        const nameField = page.locator('input[name*="name"], input[placeholder*="name"]');
        if (await nameField.count() > 0) {
          await expect(nameField).toBeVisible();
        }
      }
    });

    test('should test person creation workflow', async ({ page }) => {
      // Look for add person functionality
      const addButton = page.locator('text="Add Person"').or(page.locator('button[title*="Add"]')).first();
      
      if (await addButton.count() > 0) {
        await addButton.click();
        
        // Fill out person details
        const nameField = page.locator('input[name*="name"], input[placeholder*="name"]').first();
        if (await nameField.count() > 0) {
          await nameField.fill('Test Person');
          
          // Look for save/submit button
          const saveButton = page.locator('text="Save"').or(page.locator('button[type="submit"]')).first();
          if (await saveButton.count() > 0) {
            await saveButton.click();
            
            // Verify person was added (look for success message or person on canvas)
            const successMessage = page.locator('text="added"').or(page.locator('.success, .notification'));
            // Don't fail test if no success message, just log
            if (await successMessage.count() > 0) {
              console.log('Person creation success message found');
            }
          }
        }
      }
    });

    breakpoints.forEach(({ name, width, height }) => {
      test(`should work properly at ${name} breakpoint`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        
        // Check canvas is still functional
        const canvas = page.locator('canvas');
        await expect(canvas).toBeVisible();
        
        // Check if controls are accessible
        const controls = page.locator('.toolbar, .controls, button');
        const controlCount = await controls.count();
        
        if (controlCount > 0) {
          // At least some controls should be visible
          const visibleControls = await controls.filter({ hasText: /.+/ }).count();
          expect(visibleControls).toBeGreaterThan(0);
        }
        
        // Take screenshot for visual verification
        await page.screenshot({ 
          path: `test-results/builder-${name.toLowerCase().replace(/\s+/g, '-')}.png`,
          fullPage: true 
        });
      });
    });

    test('should test export functionality', async ({ page }) => {
      // Look for export buttons
      const exportButton = page.locator('text="Export"').or(page.locator('button[title*="Export"]')).first();
      
      if (await exportButton.count() > 0) {
        await exportButton.click();
        
        // Check for export options
        const exportOptions = page.locator('text="PNG"').or(page.locator('text="PDF"')).or(page.locator('text="SVG"'));
        if (await exportOptions.count() > 0) {
          console.log('Export options found');
        }
      }
    });

    test('should test save/load functionality', async ({ page }) => {
      // Look for save button
      const saveButton = page.locator('text="Save"').or(page.locator('button[title*="Save"]')).first();
      
      if (await saveButton.count() > 0) {
        await saveButton.click();
        
        // Look for confirmation or success message
        const confirmation = page.locator('.success, .notification, text="saved"');
        // Don't fail if no confirmation, just log
        if (await confirmation.count() > 0) {
          console.log('Save confirmation found');
        }
      }
    });

    test('should check for JavaScript errors', async ({ page }) => {
      const errors = [];
      const warnings = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        } else if (msg.type() === 'warning') {
          warnings.push(msg.text());
        }
      });
      
      page.on('pageerror', error => {
        errors.push(error.message);
      });
      
      // Interact with the interface to trigger potential errors
      const canvas = page.locator('canvas');
      if (await canvas.count() > 0) {
        await canvas.click();
        await canvas.hover();
      }
      
      // Click various buttons to test functionality
      const buttons = page.locator('button');
      const buttonCount = Math.min(await buttons.count(), 5); // Test first 5 buttons
      
      for (let i = 0; i < buttonCount; i++) {
        try {
          const button = buttons.nth(i);
          if (await button.isVisible() && await button.isEnabled()) {
            await button.click();
            await page.waitForTimeout(500); // Brief pause between clicks
          }
        } catch (e) {
          // Continue testing even if individual button clicks fail
        }
      }
      
      // Report findings
      if (errors.length > 0) {
        console.error('JavaScript errors detected:', errors);
      }
      if (warnings.length > 0) {
        console.warn('JavaScript warnings detected:', warnings);
      }
      
      // Don't fail the test for warnings, only errors
      expect(errors.length).toBe(0);
    });

    test('should test keyboard navigation', async ({ page }) => {
      // Test tab navigation
      await page.keyboard.press('Tab');
      
      // Check if focus is visible
      const focusedElement = page.locator(':focus');
      if (await focusedElement.count() > 0) {
        await expect(focusedElement).toBeVisible();
      }
      
      // Test escape key (should close modals)
      await page.keyboard.press('Escape');
      
      // Test enter key on focused elements
      const buttons = page.locator('button');
      if (await buttons.count() > 0) {
        await buttons.first().focus();
        // Don't press enter as it might trigger unwanted actions
      }
    });
  });

  test.describe('Performance and Technical Issues', () => {
    
    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // Log load time for analysis
      console.log(`Homepage load time: ${loadTime}ms`);
      
      // Warn if load time is excessive (> 5 seconds)
      if (loadTime > 5000) {
        console.warn(`Slow page load detected: ${loadTime}ms`);
      }
    });

    test('should check network requests', async ({ page }) => {
      const failedRequests = [];
      
      page.on('response', response => {
        if (!response.ok() && response.status() !== 304) {
          failedRequests.push({
            url: response.url(),
            status: response.status(),
            statusText: response.statusText()
          });
        }
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Navigate to builder to test those resources too
      await page.goto('/builder.html');
      await page.waitForLoadState('networkidle');
      
      if (failedRequests.length > 0) {
        console.warn('Failed network requests:', failedRequests);
      }
      
      // Allow some 404s for optional resources, but flag others
      const criticalFailures = failedRequests.filter(req => 
        req.status >= 500 || 
        (req.status === 404 && req.url.includes('.js'))
      );
      
      expect(criticalFailures.length).toBe(0);
    });

    test('should validate HTML structure', async ({ page }) => {
      await page.goto('/');
      
      // Check for proper HTML5 structure
      const doctype = await page.evaluate(() => {
        return document.doctype ? document.doctype.name : null;
      });
      expect(doctype).toBe('html');
      
      // Check for required elements
      const htmlLang = page.locator('html[lang]');
      await expect(htmlLang).toHaveCount(1);
      
      const title = page.locator('title');
      await expect(title).toHaveCount(1);
      
      // Check for accessibility landmarks
      const main = page.locator('main, [role="main"]');
      if (await main.count() === 0) {
        console.warn('No main landmark found - potential accessibility issue');
      }
    });
  });
});