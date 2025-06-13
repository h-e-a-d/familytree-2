// Modern JavaScript with performance optimizations and GTM integration

// Google Tag Manager - Custom Events
function gtmTrack(eventName, eventData = {}) {
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event: eventName,
      ...eventData
    });
  }
}

// Theme toggle functionality
const themeToggle = document.getElementById('theme-toggle');
const currentTheme = localStorage.getItem('theme') || 
  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

document.documentElement.setAttribute('data-theme', currentTheme);

themeToggle.addEventListener('click', () => {
  const theme = document.documentElement.getAttribute('data-theme');
  const newTheme = theme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  
  // Track theme change
  gtmTrack('theme_change', {
    theme: newTheme,
    location: 'header'
  });
});

// Mobile menu toggle
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');

mobileMenuToggle.addEventListener('click', () => {
  const isOpen = mobileMenu.classList.contains('open');
  mobileMenu.classList.toggle('open');
  
  // Track mobile menu usage
  gtmTrack('mobile_menu_toggle', {
    action: isOpen ? 'close' : 'open',
    location: 'header'
  });
});

// Close mobile menu when clicking on links
mobileMenu.addEventListener('click', (e) => {
  if (e.target.classList.contains('nav-link')) {
    mobileMenu.classList.remove('open');
    
    // Track navigation clicks from mobile menu
    gtmTrack('navigation_click', {
      link_text: e.target.textContent,
      location: 'mobile_menu',
      destination: e.target.getAttribute('href')
    });
  }
});

// Header scroll effect
const header = document.getElementById('header');
let lastScrollY = window.scrollY;

const updateHeader = () => {
  if (window.scrollY > 50) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
  lastScrollY = window.scrollY;
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

// Intersection Observer for fade-in animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target); // Stop observing once visible
      
      // Track element visibility
      const elementId = entry.target.id || entry.target.className;
      gtmTrack('element_visible', {
        element: elementId,
        section: entry.target.closest('section')?.id || 'unknown'
      });
    }
  });
}, observerOptions);

// Observe all fade-in elements
document.querySelectorAll('.fade-in').forEach(el => {
  observer.observe(el);
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
      
      // Track internal navigation
      gtmTrack('internal_navigation', {
        link_text: this.textContent,
        destination: this.getAttribute('href'),
        location: this.closest('nav, header, footer') ? 'navigation' : 'content'
      });
    }
  });
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
  if (!mobileMenu.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
    if (mobileMenu.classList.contains('open')) {
      mobileMenu.classList.remove('open');
    }
  }
});

// Track CTA button clicks
document.querySelectorAll('[data-gtm-event]').forEach(element => {
  element.addEventListener('click', function(e) {
    const eventName = this.dataset.gtmEvent;
    const location = this.dataset.gtmLocation;
    const buttonText = this.textContent.trim();
    
    gtmTrack(eventName, {
      button_text: buttonText,
      location: location,
      destination: this.getAttribute('href'),
      timestamp: new Date().toISOString()
    });
  });
});

// Track feature card interactions
document.querySelectorAll('.feature-card').forEach((card, index) => {
  card.addEventListener('mouseenter', () => {
    gtmTrack('feature_hover', {
      feature_name: card.querySelector('.feature-title').textContent,
      feature_index: index + 1,
      interaction_type: 'hover'
    });
  });
  
  card.addEventListener('click', () => {
    gtmTrack('feature_click', {
      feature_name: card.querySelector('.feature-title').textContent,
      feature_index: index + 1,
      interaction_type: 'click'
    });
  });
});

// Track testimonial interactions
document.querySelectorAll('.testimonial').forEach((testimonial, index) => {
  testimonial.addEventListener('click', () => {
    const authorName = testimonial.querySelector('.author-info h4').textContent;
    gtmTrack('testimonial_click', {
      author_name: authorName,
      testimonial_index: index + 1
    });
  });
});

// Track scroll depth
let maxScrollDepth = 0;
const trackScrollDepth = () => {
  const scrollPercent = Math.round(
    (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
  );
  
  if (scrollPercent > maxScrollDepth) {
    maxScrollDepth = scrollPercent;
    
    // Track significant scroll milestones
    if ([25, 50, 75, 90].includes(scrollPercent)) {
      gtmTrack('scroll_depth', {
        depth_percentage: scrollPercent,
        page_url: window.location.href
      });
    }
  }
};

// Throttled scroll depth tracking
let scrollDepthTimeout;
window.addEventListener('scroll', () => {
  if (!scrollDepthTimeout) {
    scrollDepthTimeout = setTimeout(() => {
      trackScrollDepth();
      scrollDepthTimeout = null;
    }, 250);
  }
}, { passive: true });

// Track time on page
const pageStartTime = Date.now();
const trackTimeOnPage = () => {
  const timeOnPage = Math.round((Date.now() - pageStartTime) / 1000);
  gtmTrack('time_on_page', {
    time_seconds: timeOnPage,
    max_scroll_depth: maxScrollDepth
  });
};

// Track time on page at intervals and before leaving
const timeIntervals = [30, 60, 120, 300]; // 30s, 1m, 2m, 5m
timeIntervals.forEach(interval => {
  setTimeout(() => {
    gtmTrack('time_milestone', {
      milestone_seconds: interval,
      scroll_depth: maxScrollDepth
    });
  }, interval * 1000);
});

// Track page leave
window.addEventListener('beforeunload', trackTimeOnPage);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    trackTimeOnPage();
  }
});

// Error tracking
window.addEventListener('error', (e) => {
  gtmTrack('javascript_error', {
    error_message: e.message,
    error_filename: e.filename,
    error_line: e.lineno,
    error_column: e.colno,
    page_url: window.location.href
  });
});

// Performance monitoring
window.addEventListener('load', () => {
  // Track page load time
  const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
  gtmTrack('page_performance', {
    load_time_ms: loadTime,
    page_url: window.location.href
  });
  
  // Track Core Web Vitals if available
  if ('PerformanceObserver' in window) {
    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'largest-contentful-paint') {
          gtmTrack('core_web_vitals', {
            metric: 'lcp',
            value: Math.round(entry.startTime),
            page_url: window.location.href
          });
        }
      });
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    
    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'first-input') {
          gtmTrack('core_web_vitals', {
            metric: 'fid',
            value: Math.round(entry.processingStart - entry.startTime),
            page_url: window.location.href
          });
        }
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
      gtmTrack('core_web_vitals', {
        metric: 'cls',
        value: Math.round(cumulativeLayoutShift * 1000) / 1000,
        page_url: window.location.href
      });
    }, 5000);
  }
});

// Service Worker registration for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
        gtmTrack('service_worker', {
          status: 'registered',
          scope: registration.scope
        });
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
        gtmTrack('service_worker', {
          status: 'failed',
          error: registrationError.message
        });
      });
  });
}

// Track form interactions (if any forms are added later)
document.addEventListener('submit', (e) => {
  if (e.target.tagName === 'FORM') {
    gtmTrack('form_submit', {
      form_id: e.target.id || 'unknown',
      form_location: e.target.closest('section')?.id || 'unknown'
    });
  }
});

// Track outbound link clicks
document.addEventListener('click', (e) => {
  const link = e.target.closest('a');
  if (link && link.hostname !== window.location.hostname) {
    gtmTrack('outbound_click', {
      destination_url: link.href,
      link_text: link.textContent.trim(),
      location: link.closest('section')?.id || 'unknown'
    });
  }
});

// Track video interactions (if videos are added)
document.addEventListener('play', (e) => {
  if (e.target.tagName === 'VIDEO') {
    gtmTrack('video_play', {
      video_title: e.target.title || 'unknown',
      video_duration: e.target.duration || 0
    });
  }
}, true);

document.addEventListener('pause', (e) => {
  if (e.target.tagName === 'VIDEO') {
    gtmTrack('video_pause', {
      video_title: e.target.title || 'unknown',
      current_time: e.target.currentTime || 0
    });
  }
}, true);

// Initialize page tracking
document.addEventListener('DOMContentLoaded', () => {
  gtmTrack('page_view', {
    page_title: document.title,
    page_url: window.location.href,
    page_referrer: document.referrer,
    user_agent: navigator.userAgent,
    screen_resolution: `${screen.width}x${screen.height}`,
    viewport_size: `${window.innerWidth}x${window.innerHeight}`,
    color_depth: screen.colorDepth,
    timestamp: new Date().toISOString()
  });
  
  // Track initial theme
  gtmTrack('theme_detected', {
    theme: currentTheme,
    method: localStorage.getItem('theme') ? 'stored' : 'system'
  });
});

// Preload critical assets
const preloadLink = document.createElement('link');
preloadLink.rel = 'preload';
preloadLink.as = 'image';
preloadLink.href = '/hero-background.webp';
document.head.appendChild(preloadLink);

// Export functions for testing/debugging
if (typeof window !== 'undefined') {
  window.familyTreeHomepage = {
    gtmTrack,
    trackTimeOnPage,
    trackScrollDepth
  };
}