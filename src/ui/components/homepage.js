// Modern JavaScript with enhanced performance optimizations, comprehensive GTM integration, and i18n support

// Google Tag Manager - Custom Events
function gtmTrack(eventName, eventData = {}) {
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event: eventName,
      ...eventData
    });
  }
}

// Initialize i18n system
async function initializeI18n() {
  devLog('🌍 Initializing i18n system...');
  
  try {
    if (window.i18n) {
      // Initialize with default locale
      const success = await window.i18n.init({
        // Optional: Configure Google Sheets integration here
        // googleSheets: {
        //   sheetId: 'YOUR_SHEET_ID',
        //   apiKey: 'YOUR_API_KEY',
        //   range: 'Translations!A:Z'
        // }
      });
      
      if (success) {
        devLog('✅ i18n initialized successfully');
        
        // Track initialization
        gtmTrack('i18n_initialized', {
          locale: window.i18n.getLocale(),
          available_locales: window.i18n.getAvailableLocales(),
          timestamp: new Date().toISOString()
        });
        
        // Add observer for locale changes
        window.i18n.addObserver((event, data) => {
          if (event === 'localeChanged') {
            gtmTrack('locale_changed', {
              previous_locale: data.oldLocale,
              new_locale: data.newLocale,
              method: 'programmatic',
              timestamp: new Date().toISOString()
            });
            
            // Update page analytics with new locale
            updateAnalyticsLocale(data.newLocale);
          }
        });
        
        return true;
      } else {
        devError('❌ Failed to initialize i18n');
        return false;
      }
    } else {
      devWarn('⚠️ i18n not available, skipping internationalization');
      return false;
    }
  } catch (error) {
    devError('❌ Error initializing i18n:', error);
    gtmTrack('i18n_error', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    return false;
  }
}

// Update analytics data with current locale
function updateAnalyticsLocale(locale) {
  // Update any locale-specific analytics data
  if (window.dataLayer) {
    window.dataLayer.push({
      event: 'config_update',
      locale: locale,
      language: locale.split('-')[0]
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
      locale: window.i18n ? window.i18n.getLocale() : 'unknown',
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
        locale: window.i18n ? window.i18n.getLocale() : 'unknown',
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
        locale: window.i18n ? window.i18n.getLocale() : 'unknown',
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
        locale: window.i18n ? window.i18n.getLocale() : 'unknown',
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
      locale: window.i18n ? window.i18n.getLocale() : 'unknown',
      timestamp: new Date().toISOString()
    });
  });
});

// Track feature card interactions with enhanced data
document.querySelectorAll('.feature-card').forEach((card, index) => {
  const getFeatureName = () => {
    const titleElement = card.querySelector('.feature-title');
    if (titleElement && window.i18n) {
      // Try to get the translated text if available
      const i18nKey = titleElement.getAttribute('data-i18n');
      return i18nKey ? window.i18n.t(i18nKey) : titleElement.textContent;
    }
    return titleElement?.textContent || `Feature ${index + 1}`;
  };
  
  card.addEventListener('mouseenter', () => {
    gtmTrack('feature_hover', {
      feature_name: getFeatureName(),
      feature_index: index + 1,
      interaction_type: 'hover',
      section: 'features',
      locale: window.i18n ? window.i18n.getLocale() : 'unknown'
    });
  });
  
  card.addEventListener('click', () => {
    gtmTrack('feature_click', {
      feature_name: getFeatureName(),
      feature_index: index + 1,
      interaction_type: 'click',
      section: 'features',
      locale: window.i18n ? window.i18n.getLocale() : 'unknown'
    });
  });
});

// Track example card interactions
document.querySelectorAll('.example-card').forEach((card, index) => {
  const getExampleName = () => {
    const titleElement = card.querySelector('h3');
    if (titleElement && window.i18n) {
      const i18nKey = titleElement.getAttribute('data-i18n');
      return i18nKey ? window.i18n.t(i18nKey) : titleElement.textContent;
    }
    return titleElement?.textContent || `Example ${index + 1}`;
  };
  
  card.addEventListener('click', () => {
    gtmTrack('example_click', {
      example_name: getExampleName(),
      example_index: index + 1,
      section: 'examples',
      locale: window.i18n ? window.i18n.getLocale() : 'unknown'
    });
  });
});

// Track FAQ interactions
document.querySelectorAll('.faq-item').forEach((item, index) => {
  const getQuestion = () => {
    const questionElement = item.querySelector('.faq-question');
    if (questionElement && window.i18n) {
      const i18nKey = questionElement.getAttribute('data-i18n');
      return i18nKey ? window.i18n.t(i18nKey) : questionElement.textContent;
    }
    return questionElement?.textContent || `FAQ ${index + 1}`;
  };
  
  item.addEventListener('click', () => {
    gtmTrack('faq_click', {
      question: getQuestion(),
      faq_index: index + 1,
      section: 'faq',
      locale: window.i18n ? window.i18n.getLocale() : 'unknown'
    });
  });
});

// Track comparison table interactions
const comparisonTable = document.querySelector('.comparison-table');
if (comparisonTable) {
  comparisonTable.addEventListener('click', (e) => {
    const row = e.target.closest('.comparison-row');
    if (row) {
      const featureElement = row.querySelector('.comparison-feature');
      let feature = 'unknown';
      
      if (featureElement && window.i18n) {
        const i18nKey = featureElement.getAttribute('data-i18n');
        feature = i18nKey ? window.i18n.t(i18nKey) : featureElement.textContent;
      } else if (featureElement) {
        feature = featureElement.textContent;
      }
      
      gtmTrack('comparison_click', {
        feature: feature,
        section: 'comparison',
        locale: window.i18n ? window.i18n.getLocale() : 'unknown'
      });
    }
  });
}

// Enhanced testimonial interactions
document.querySelectorAll('.testimonial').forEach((testimonial, index) => {
  const getAuthorName = () => {
    const authorElement = testimonial.querySelector('.author-info h4');
    if (authorElement && window.i18n) {
      const i18nKey = authorElement.getAttribute('data-i18n');
      return i18nKey ? window.i18n.t(i18nKey) : authorElement.textContent;
    }
    return authorElement?.textContent || `Customer ${index + 1}`;
  };
  
  testimonial.addEventListener('click', () => {
    gtmTrack('testimonial_click', {
      author_name: getAuthorName(),
      testimonial_index: index + 1,
      section: 'testimonials',
      locale: window.i18n ? window.i18n.getLocale() : 'unknown'
    });
  });
});

// Track trust signal clicks
document.querySelectorAll('.trust-item').forEach((item, index) => {
  item.addEventListener('click', () => {
    const labelElement = item.querySelector('.trust-label');
    const numberElement = item.querySelector('.trust-number');
    
    let label = 'unknown';
    if (labelElement && window.i18n) {
      const i18nKey = labelElement.getAttribute('data-i18n');
      label = i18nKey ? window.i18n.t(i18nKey) : labelElement.textContent;
    } else if (labelElement) {
      label = labelElement.textContent;
    }
    
    const number = numberElement?.textContent || '';
    
    gtmTrack('trust_signal_click', {
      label: label,
      value: number,
      trust_index: index + 1,
      section: 'hero',
      locale: window.i18n ? window.i18n.getLocale() : 'unknown'
    });
  });
});

// Track about section interactions
const aboutSection = document.querySelector('.about-section');
if (aboutSection) {
  const demoLink = aboutSection.querySelector('.demo-link');
  if (demoLink) {
    demoLink.addEventListener('click', () => {
      let linkText = demoLink.textContent.trim();
      if (window.i18n) {
        const i18nKey = demoLink.getAttribute('data-i18n');
        linkText = i18nKey ? window.i18n.t(i18nKey) : linkText;
      }
      
      gtmTrack('demo_link_click', {
        location: 'about_section',
        link_text: linkText,
        locale: window.i18n ? window.i18n.getLocale() : 'unknown'
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
        window_height: windowHeight,
        locale: window.i18n ? window.i18n.getLocale() : 'unknown'
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
        
        let sectionName = sectionId;
        const heading = section.querySelector('h1, h2');
        if (heading && window.i18n) {
          const i18nKey = heading.getAttribute('data-i18n');
          sectionName = i18nKey ? window.i18n.t(i18nKey) : heading.textContent;
        } else if (heading) {
          sectionName = heading.textContent;
        }
        
        gtmTrack('section_view', {
          section_id: sectionId,
          section_name: sectionName,
          locale: window.i18n ? window.i18n.getLocale() : 'unknown',
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
    page_url: window.location.href,
    locale: window.i18n ? window.i18n.getLocale() : 'unknown'
  });
};

// Track engagement events
const trackEngagement = (eventType, data = {}) => {
  const event = {
    type: eventType,
    timestamp: Date.now() - pageStartTime,
    locale: window.i18n ? window.i18n.getLocale() : 'unknown',
    ...data
  };
  engagementEvents.push(event);
  
  // Track high engagement
  if (engagementEvents.length === 5) {
    gtmTrack('high_engagement', {
      events_count: engagementEvents.length,
      time_to_high_engagement: event.timestamp,
      locale: window.i18n ? window.i18n.getLocale() : 'unknown'
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
      sections_viewed: document.querySelectorAll('section[data-tracked]').length,
      locale: window.i18n ? window.i18n.getLocale() : 'unknown'
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
    locale: window.i18n ? window.i18n.getLocale() : 'unknown',
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
    locale: window.i18n ? window.i18n.getLocale() : 'unknown',
    timestamp: new Date().toISOString()
  });
});

// Track unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
  gtmTrack('promise_rejection', {
    error_message: e.reason?.message || 'Unknown error',
    error_stack: e.reason?.stack,
    page_url: window.location.href,
    locale: window.i18n ? window.i18n.getLocale() : 'unknown',
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
    locale: window.i18n ? window.i18n.getLocale() : 'unknown',
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
            page_url: window.location.href,
            locale: window.i18n ? window.i18n.getLocale() : 'unknown'
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
            page_url: window.location.href,
            locale: window.i18n ? window.i18n.getLocale() : 'unknown'
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
          page_url: window.location.href,
          locale: window.i18n ? window.i18n.getLocale() : 'unknown'
        });
      }, 5000);
    } catch (e) {
      devWarn('Core Web Vitals tracking failed:', e);
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
      form_method: e.target.method || 'GET',
      locale: window.i18n ? window.i18n.getLocale() : 'unknown'
    });
  }
});

// Track outbound link clicks with enhanced data
document.addEventListener('click', (e) => {
  const link = e.target.closest('a');
  if (link && link.hostname !== window.location.hostname) {
    let linkText = link.textContent.trim();
    if (window.i18n) {
      const i18nKey = link.getAttribute('data-i18n');
      linkText = i18nKey ? window.i18n.t(i18nKey) : linkText;
    }
    
    gtmTrack('outbound_click', {
      destination_url: link.href,
      link_text: linkText,
      location: link.closest('section')?.id || 'unknown',
      link_class: link.className,
      opens_new_tab: link.target === '_blank',
      locale: window.i18n ? window.i18n.getLocale() : 'unknown'
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
      section: e.target.closest('section')?.id || 'unknown',
      locale: window.i18n ? window.i18n.getLocale() : 'unknown'
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
      section: e.target.closest('section')?.id || 'unknown',
      locale: window.i18n ? window.i18n.getLocale() : 'unknown'
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
    online: navigator.onLine,
    locale: window.i18n ? window.i18n.getLocale() : 'unknown'
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
document.addEventListener('DOMContentLoaded', async () => {
  devLog('🚀 Initializing MapMyRoots homepage...');
  
  // Initialize i18n first
  await initializeI18n();
  
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
      locale: window.i18n ? window.i18n.getLocale() : 'unknown',
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
    locale: window.i18n ? window.i18n.getLocale() : 'unknown',
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
    locale: window.i18n ? window.i18n.getLocale() : 'unknown',
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
          locale: window.i18n ? window.i18n.getLocale() : 'unknown',
          timestamp: new Date().toISOString()
        });
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
        gtmTrack('service_worker', {
          status: 'failed',
          error: registrationError.message,
          locale: window.i18n ? window.i18n.getLocale() : 'unknown',
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
    initializeI18n,
    updateAnalyticsLocale,
    engagementEvents: () => engagementEvents,
    maxScrollDepth: () => maxScrollDepth
  };
}

// Initialize engagement tracking for various interactions
document.addEventListener('click', () => trackEngagement('click'));
document.addEventListener('keydown', () => trackEngagement('keydown'));
document.addEventListener('scroll', () => trackEngagement('scroll'), { passive: true });

devLog('🌳 MapMyRoots homepage analytics initialized successfully');

function devLog(...args) {
  if (window.NODE_ENV !== 'production') {
    console.log(...args);
  }
}
function devWarn(...args) {
  if (window.NODE_ENV !== 'production') {
    console.warn(...args);
  }
}
function devError(...args) {
  if (window.NODE_ENV !== 'production') {
    console.error(...args);
  }
}
