// Modern JavaScript with enhanced performance optimizations and comprehensive GTM integration

// Google Tag Manager - Custom Events
function gtmTrack(eventName, eventData = {}) {
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event: eventName,
      ...eventData
    });
  }
}

// Enhanced mobile menu functionality
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');

if (mobileMenuToggle && mobileMenu) {
  mobileMenuToggle.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.contains('open');
    mobileMenu.classList.toggle('open');
    
    // Update ARIA attributes for accessibility
    mobileMenuToggle.setAttribute('aria-expanded', !isOpen);
    mobileMenu.setAttribute('aria-hidden', isOpen);
    
    // Track mobile menu usage
    gtmTrack('mobile_menu_toggle', {
      action: isOpen ? 'close' : 'open',
      location: 'header',
      timestamp: new Date().toISOString()
    });
  });

  // Close mobile menu when clicking on links
  mobileMenu.addEventListener('click', (e) => {
    if (e.target.classList.contains('nav-link')) {
      mobileMenu.classList.remove('open');
      mobileMenuToggle.setAttribute('aria-expanded', 'false');
      mobileMenu.setAttribute('aria-hidden', 'true');
      
      // Track navigation clicks from mobile menu
      gtmTrack('navigation_click', {
        link_text: e.target.textContent,
        location: 'mobile_menu',
        destination: e.target.getAttribute('href'),
        timestamp: new Date().toISOString()
      });
    }
  });
}

// Enhanced header scroll effect with performance optimization
const header = document.getElementById('header');
let lastScrollY = window.scrollY;
let scrollingDown = false;

const updateHeader = () => {
  const currentScrollY = window.scrollY;
  scrollingDown = currentScrollY > lastScrollY;
  
  if (currentScrollY > 50) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
  
  lastScrollY = currentScrollY;
};

// Throttled scroll handler for performance
let scrollTimeout;
window.addEventListener('scroll', () => {
  if (!scrollTimeout) {
    scrollTimeout = setTimeout(() => {
      updateHeader();
      scrollTimeout = null;
    }, 10);
  }
}, { passive: true });

// Enhanced Intersection Observer for fade-in animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target); // Stop observing once visible
      
      // Track element visibility with enhanced data
      const elementId = entry.target.id || entry.target.className;
      const sectionId = entry.target.closest('section')?.id || 'unknown';
      
      gtmTrack('element_visible', {
        element: elementId,
        section: sectionId,
        intersection_ratio: entry.intersectionRatio,
        timestamp: new Date().toISOString()
      });
    }
  });
}, observerOptions);

// Observe all fade-in elements
document.querySelectorAll('.fade-in').forEach(el => {
  observer.observe(el);
});

// Enhanced smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
      
      // Track internal navigation with enhanced data
      gtmTrack('internal_navigation', {
        link_text: this.textContent.trim(),
        destination: this.getAttribute('href'),
        location: this.closest('nav, header, footer') ? 'navigation' : 'content',
        source_section: this.closest('section')?.id || 'header',
        timestamp: new Date().toISOString()
      });
    }
  });
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
  if (mobileMenu && mobileMenuToggle) {
    if (!mobileMenu.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
      if (mobileMenu.classList.contains('open')) {
        mobileMenu.classList.remove('open');
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
        mobileMenu.setAttribute('aria-hidden', 'true');
      }
    }
  }
});

// Enhanced CTA button click tracking
document.querySelectorAll('[data-gtm-event]').forEach(element => {
  element.addEventListener('click', function(e) {
    const eventName = this.dataset.gtmEvent;
    const location = this.dataset.gtmLocation;
    const buttonText = this.textContent.trim();
    
    gtmTrack(eventName, {
      button_text: buttonText,
      location: location,
      destination: this.getAttribute('href'),
      button_class: this.className,
      timestamp: new Date().toISOString()
    });
  });
});

// Track feature card interactions with enhanced data
document.querySelectorAll('.feature-card').forEach((card, index) => {
  const featureName = card.querySelector('.feature-title')?.textContent || `Feature ${index + 1}`;
  
  card.addEventListener('mouseenter', () => {
    gtmTrack('feature_hover', {
      feature_name: featureName,
      feature_index: index + 1,
      interaction_type: 'hover',
      section: 'features'
    });
  });
  
  card.addEventListener('click', () => {
    gtmTrack('feature_click', {
      feature_name: featureName,
      feature_index: index + 1,
      interaction_type: 'click',
      section: 'features'
    });
  });
});

// Track example card interactions
document.querySelectorAll('.example-card').forEach((card, index) => {
  const exampleName = card.querySelector('h3')?.textContent || `Example ${index + 1}`;
  
  card.addEventListener('click', () => {
    gtmTrack('example_click', {
      example_name: exampleName,
      example_index: index + 1,
      section: 'examples'
    });
  });
});

// Track FAQ interactions
document.querySelectorAll('.faq-item').forEach((item, index) => {
  const question = item.querySelector('.faq-question')?.textContent || `FAQ ${index + 1}`;
  
  item.addEventListener('click', () => {
    gtmTrack('faq_click', {
      question: question,
      faq_index: index + 1,
      section: 'faq'
    });
  });
});

// Track comparison table interactions
const comparisonTable = document.querySelector('.comparison-table');
if (comparisonTable) {
  comparisonTable.addEventListener('click', (e) => {
    const row = e.target.closest('.comparison-row');
    if (row) {
      const feature = row.querySelector('.comparison-feature')?.textContent;
      gtmTrack('comparison_click', {
        feature: feature,
        section: 'comparison'
      });
    }
  });
}

// Enhanced testimonial interactions
document.querySelectorAll('.testimonial').forEach((testimonial, index) => {
  const authorName = testimonial.querySelector('.author-info h4')?.textContent || `Customer ${index + 1}`;
  
  testimonial.addEventListener('click', () => {
    gtmTrack('testimonial_click', {
      author_name: authorName,
      testimonial_index: index + 1,
      section: 'testimonials'
    });
  });
});

// Track trust signal clicks
document.querySelectorAll('.trust-item').forEach((item, index) => {
  item.addEventListener('click', () => {
    const label = item.querySelector('.trust-label')?.textContent;
    const number = item.querySelector('.trust-number')?.textContent;
    
    gtmTrack('trust_signal_click', {
      label: label,
      value: number,
      trust_index: index + 1,
      section: 'hero'
    });
  });
});

// Track about section interactions
const aboutSection = document.querySelector('.about-section');
if (aboutSection) {
  const demoLink = aboutSection.querySelector('.demo-link');
  if (demoLink) {
    demoLink.addEventListener('click', () => {
      gtmTrack('demo_link_click', {
        location: 'about_section',
        link_text: demoLink.textContent.trim()
      });
    });
  }
}

// Enhanced scroll depth tracking
let maxScrollDepth = 0;
const documentHeight = document.documentElement.scrollHeight;
const windowHeight = window.innerHeight;

const trackScrollDepth = () => {
  const scrollPercent = Math.round(
    (window.scrollY / (documentHeight - windowHeight)) * 100
  );
  
  if (scrollPercent > maxScrollDepth) {
    maxScrollDepth = scrollPercent;
    
    // Track significant scroll milestones
    if ([25, 50, 75, 90, 100].includes(scrollPercent)) {
      gtmTrack('scroll_depth', {
        depth_percentage: scrollPercent,
        page_url: window.location.href,
        document_height: documentHeight,
        window_height: windowHeight
      });
    }
  }
};

// Track section visibility
const trackSectionVisibility = () => {
  const sections = document.querySelectorAll('section[id]');
  const scrollPosition = window.scrollY + (windowHeight / 2);
  
  sections.forEach(section => {
    const sectionTop = section.offsetTop;
    const sectionBottom = sectionTop + section.offsetHeight;
    
    if (scrollPosition >= sectionTop && scrollPosition <= sectionBottom) {
      const sectionId = section.id;
      if (!section.dataset.tracked) {
        section.dataset.tracked = 'true';
        gtmTrack('section_view', {
          section_id: sectionId,
          section_name: section.querySelector('h1, h2')?.textContent || sectionId,
          timestamp: new Date().toISOString()
        });
      }
    }
  });
};

// Throttled scroll tracking
let scrollDepthTimeout;
window.addEventListener('scroll', () => {
  if (!scrollDepthTimeout) {
    scrollDepthTimeout = setTimeout(() => {
      trackScrollDepth();
      trackSectionVisibility();
      scrollDepthTimeout = null;
    }, 250);
  }
}, { passive: true });

// Enhanced time tracking
const pageStartTime = Date.now();
let engagementEvents = [];

const trackTimeOnPage = () => {
  const timeOnPage = Math.round((Date.now() - pageStartTime) / 1000);
  gtmTrack('time_on_page', {
    time_seconds: timeOnPage,
    max_scroll_depth: maxScrollDepth,
    engagement_events: engagementEvents.length,
    page_url: window.location.href
  });
};

// Track engagement events
const trackEngagement = (eventType, data = {}) => {
  const event = {
    type: eventType,
    timestamp: Date.now() - pageStartTime,
    ...data
  };
  engagementEvents.push(event);
  
  // Track high engagement
  if (engagementEvents.length === 5) {
    gtmTrack('high_engagement', {
      events_count: engagementEvents.length,
      time_to_high_engagement: event.timestamp
    });
  }
};

// Track time milestones with enhanced data
const timeIntervals = [10, 30, 60, 120, 300]; // 10s, 30s, 1m, 2m, 5m
timeIntervals.forEach(interval => {
  setTimeout(() => {
    gtmTrack('time_milestone', {
      milestone_seconds: interval,
      scroll_depth: maxScrollDepth,
      engagement_events: engagementEvents.length,
      sections_viewed: document.querySelectorAll('section[data-tracked]').length
    });
  }, interval * 1000);
});

// Enhanced page leave tracking
const trackPageLeave = () => {
  const timeOnPage = Math.round((Date.now() - pageStartTime) / 1000);
  gtmTrack('page_leave', {
    time_on_page: timeOnPage,
    max_scroll_depth: maxScrollDepth,
    engagement_events: engagementEvents.length,
    sections_viewed: document.querySelectorAll('section[data-tracked]').length,
    exit_timestamp: new Date().toISOString()
  });
};

window.addEventListener('beforeunload', trackPageLeave);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    trackPageLeave();
  }
});

// Enhanced error tracking
window.addEventListener('error', (e) => {
  gtmTrack('javascript_error', {
    error_message: e.message,
    error_filename: e.filename,
    error_line: e.lineno,
    error_column: e.colno,
    error_stack: e.error?.stack,
    page_url: window.location.href,
    user_agent: navigator.userAgent,
    timestamp: new Date().toISOString()
  });
});

// Track unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
  gtmTrack('promise_rejection', {
    error_message: e.reason?.message || 'Unknown error',
    error_stack: e.reason?.stack,
    page_url: window.location.href,
    timestamp: new Date().toISOString()
  });
});

// Enhanced performance monitoring
window.addEventListener('load', () => {
  // Track page load time
  const navigationTiming = performance.timing;
  const loadTime = navigationTiming.loadEventEnd - navigationTiming.navigationStart;
  const domContentLoaded = navigationTiming.domContentLoadedEventEnd - navigationTiming.navigationStart;
  const firstPaint = performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint');
  const firstContentfulPaint = performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint');
  
  gtmTrack('page_performance', {
    load_time_ms: loadTime,
    dom_content_loaded_ms: domContentLoaded,
    first_paint_ms: firstPaint?.startTime || 0,
    first_contentful_paint_ms: firstContentfulPaint?.startTime || 0,
    page_url: window.location.href,
    connection_type: navigator.connection?.effectiveType || 'unknown',
    memory_info: performance.memory ? {
      used: Math.round(performance.memory.usedJSHeapSize / 1048576),
      total: Math.round(performance.memory.totalJSHeapSize / 1048576)
    } : null
  });
  
  // Track Core Web Vitals if available
  if ('PerformanceObserver' in window) {
    try {
      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          gtmTrack('core_web_vitals', {
            metric: 'lcp',
            value: Math.round(entry.startTime),
            rating: entry.startTime < 2500 ? 'good' : entry.startTime < 4000 ? 'needs-improvement' : 'poor',
            page_url: window.location.href
          });
        });
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      
      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          const fidValue = entry.processingStart - entry.startTime;
          gtmTrack('core_web_vitals', {
            metric: 'fid',
            value: Math.round(fidValue),
            rating: fidValue < 100 ? 'good' : fidValue < 300 ? 'needs-improvement' : 'poor',
            page_url: window.location.href
          });
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      
      // Cumulative Layout Shift
      let cumulativeLayoutShift = 0;
      const clsObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (!entry.hadRecentInput) {
            cumulativeLayoutShift += entry.value;
          }
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      
      // Report CLS after 5 seconds
      setTimeout(() => {
        const clsValue = Math.round(cumulativeLayoutShift * 1000) / 1000;
        gtmTrack('core_web_vitals', {
          metric: 'cls',
          value: clsValue,
          rating: clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs-improvement' : 'poor',
          page_url: window.location.href
        });
      }, 5000);
    } catch (e) {
      console.warn('Core Web Vitals tracking failed:', e);
    }
  }
});

// Enhanced form tracking (for future forms)
document.addEventListener('submit', (e) => {
  if (e.target.tagName === 'FORM') {
    const formData = new FormData(e.target);
    const formFields = Array.from(formData.keys());
    
    gtmTrack('form_submit', {
      form_id: e.target.id || 'unknown',
      form_location: e.target.closest('section')?.id || 'unknown',
      form_fields: formFields,
      form_action: e.target.action,
      form_method: e.target.method || 'GET'
    });
  }
});

// Track outbound link clicks with enhanced data
document.addEventListener('click', (e) => {
  const link = e.target.closest('a');
  if (link && link.hostname !== window.location.hostname) {
    gtmTrack('outbound_click', {
      destination_url: link.href,
      link_text: link.textContent.trim(),
      location: link.closest('section')?.id || 'unknown',
      link_class: link.className,
      opens_new_tab: link.target === '_blank'
    });
  }
});

// Enhanced video interaction tracking
document.addEventListener('play', (e) => {
  if (e.target.tagName === 'VIDEO') {
    gtmTrack('video_play', {
      video_title: e.target.title || e.target.src || 'unknown',
      video_duration: e.target.duration || 0,
      video_source: e.target.src,
      section: e.target.closest('section')?.id || 'unknown'
    });
  }
}, true);

document.addEventListener('pause', (e) => {
  if (e.target.tagName === 'VIDEO') {
    const watchPercentage = e.target.duration > 0 ? 
      Math.round((e.target.currentTime / e.target.duration) * 100) : 0;
    
    gtmTrack('video_pause', {
      video_title: e.target.title || e.target.src || 'unknown',
      current_time: e.target.currentTime || 0,
      watch_percentage: watchPercentage,
      section: e.target.closest('section')?.id || 'unknown'
    });
  }
}, true);

// Device and browser information tracking
const trackDeviceInfo = () => {
  const deviceInfo = {
    user_agent: navigator.userAgent,
    screen_resolution: `${screen.width}x${screen.height}`,
    viewport_size: `${window.innerWidth}x${window.innerHeight}`,
    color_depth: screen.colorDepth,
    pixel_ratio: window.devicePixelRatio || 1,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    cookie_enabled: navigator.cookieEnabled,
    online: navigator.onLine
  };
  
  if (navigator.connection) {
    deviceInfo.connection = {
      effective_type: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink,
      rtt: navigator.connection.rtt
    };
  }
  
  return deviceInfo;
};

// Initialize comprehensive page tracking
document.addEventListener('DOMContentLoaded', () => {
  const deviceInfo = trackDeviceInfo();
  
  gtmTrack('page_view', {
    page_title: document.title,
    page_url: window.location.href,
    page_referrer: document.referrer,
    timestamp: new Date().toISOString(),
    ...deviceInfo
  });
  
  // Track page load completion
  if (document.readyState === 'complete') {
    gtmTrack('page_ready', {
      page_url: window.location.href,
      ready_state: 'complete',
      timestamp: new Date().toISOString()
    });
  }
});

// A/B testing support (placeholder for future use)
const initializeABTesting = () => {
  // This function can be used to implement A/B testing
  // by modifying page elements based on user segments
  
  const variant = Math.random() < 0.5 ? 'A' : 'B';
  gtmTrack('ab_test_assignment', {
    test_name: 'homepage_design',
    variant: variant,
    timestamp: new Date().toISOString()
  });
  
  return variant;
};

// Accessibility tracking
const trackAccessibilityFeatures = () => {
  const hasReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
  const hasDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  gtmTrack('accessibility_preferences', {
    reduced_motion: hasReducedMotion,
    high_contrast: hasHighContrast,
    dark_mode: hasDarkMode,
    timestamp: new Date().toISOString()
  });
};

// Initialize accessibility tracking
if (window.matchMedia) {
  trackAccessibilityFeatures();
}

// Service Worker registration for PWA (disabled for local development)
// Uncomment when deploying to a server with HTTPS
/*
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
        gtmTrack('service_worker', {
          status: 'registered',
          scope: registration.scope,
          timestamp: new Date().toISOString()
        });
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
        gtmTrack('service_worker', {
          status: 'failed',
          error: registrationError.message,
          timestamp: new Date().toISOString()
        });
      });
  });
}
*/

// Export functions for testing/debugging
if (typeof window !== 'undefined') {
  window.familyTreeHomepage = {
    gtmTrack,
    trackTimeOnPage,
    trackScrollDepth,
    trackEngagement,
    trackDeviceInfo,
    engagementEvents: () => engagementEvents,
    maxScrollDepth: () => maxScrollDepth
  };
}

// Initialize engagement tracking for various interactions
document.addEventListener('click', () => trackEngagement('click'));
document.addEventListener('keydown', () => trackEngagement('keydown'));
document.addEventListener('scroll', () => trackEngagement('scroll'), { passive: true });

console.log('MapMyRoots homepage analytics initialized successfully');
