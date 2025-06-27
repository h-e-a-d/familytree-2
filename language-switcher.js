// language-switcher.js - Language switcher component for MapMyRoots
// Fixed to work without ES6 modules

class LanguageSwitcher {
  constructor() {
    this.currentLanguage = 'en';
    this.languageData = {
      'en': { name: 'English', flag: '🇺🇸', code: 'EN' },
      'es': { name: 'Español', flag: '🇪🇸', code: 'ES' },
      'ru': { name: 'Русский', flag: '🇷🇺', code: 'RU' },
      'de': { name: 'Deutsch', flag: '🇩🇪', code: 'DE' }
    };
    
    this.init();
  }

  init() {
    this.bindEvents();
    this.updateCurrentLanguageDisplay();
    
    // Listen for i18n locale changes
    if (window.i18n) {
      window.i18n.addObserver(this.onLocaleChange.bind(this));
      this.currentLanguage = window.i18n.getLocale();
      this.updateCurrentLanguageDisplay();
    }
  }

  bindEvents() {
    const languageButton = document.getElementById('language-button');
    const languageDropdown = document.getElementById('language-dropdown');
    const languageOptions = document.querySelectorAll('.language-option');

    if (!languageButton || !languageDropdown) {
      console.warn('Language switcher elements not found');
      return;
    }

    // Toggle dropdown
    languageButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleDropdown();
    });

    // Handle language selection
    languageOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const lang = option.getAttribute('data-lang');
        if (lang) {
          this.switchLanguage(lang);
        }
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!languageButton.contains(e.target) && !languageDropdown.contains(e.target)) {
        this.closeDropdown();
      }
    });

    // Close dropdown on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeDropdown();
      }
    });

    // Handle keyboard navigation
    languageDropdown.addEventListener('keydown', (e) => {
      this.handleKeyboardNavigation(e);
    });
  }

  toggleDropdown() {
    const dropdown = document.getElementById('language-dropdown');
    const button = document.getElementById('language-button');
    
    if (dropdown.classList.contains('open')) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  openDropdown() {
    const dropdown = document.getElementById('language-dropdown');
    const button = document.getElementById('language-button');
    
    dropdown.classList.add('open');
    button.setAttribute('aria-expanded', 'true');
    
    // Focus first option
    const firstOption = dropdown.querySelector('.language-option');
    if (firstOption) {
      firstOption.focus();
    }

    // Track dropdown open
    if (window.gtmTrack) {
      window.gtmTrack('language_dropdown_open', {
        current_language: this.currentLanguage,
        available_languages: Object.keys(this.languageData),
        timestamp: new Date().toISOString()
      });
    }
  }

  closeDropdown() {
    const dropdown = document.getElementById('language-dropdown');
    const button = document.getElementById('language-button');
    
    dropdown.classList.remove('open');
    button.setAttribute('aria-expanded', 'false');
  }

  handleKeyboardNavigation(e) {
    const options = document.querySelectorAll('.language-option');
    const currentIndex = Array.from(options).findIndex(option => option === document.activeElement);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
        options[nextIndex].focus();
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
        options[prevIndex].focus();
        break;
      
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (document.activeElement.classList.contains('language-option')) {
          document.activeElement.click();
        }
        break;
      
      case 'Escape':
        e.preventDefault();
        this.closeDropdown();
        document.getElementById('language-button').focus();
        break;
    }
  }

  async switchLanguage(lang) {
    if (!this.languageData[lang]) {
      console.warn(`Unsupported language: ${lang}`);
      return;
    }

    const oldLanguage = this.currentLanguage;
    this.currentLanguage = lang;

    // Track language change
    if (window.gtmTrack) {
      window.gtmTrack('language_change', {
        previous_language: oldLanguage,
        new_language: lang,
        method: 'dropdown_selection',
        page_url: window.location.href,
        timestamp: new Date().toISOString()
      });
    }

    // Update UI immediately
    this.updateCurrentLanguageDisplay();
    this.updateActiveOption();
    this.closeDropdown();

    // Switch locale using i18n
    if (window.i18n) {
      try {
        const success = await window.i18n.setLocale(lang);
        if (!success) {
          console.error(`Failed to switch to locale: ${lang}`);
          // Revert UI changes
          this.currentLanguage = oldLanguage;
          this.updateCurrentLanguageDisplay();
        }
      } catch (error) {
        console.error('Error switching language:', error);
        // Revert UI changes
        this.currentLanguage = oldLanguage;
        this.updateCurrentLanguageDisplay();
      }
    } else {
      console.warn('i18n not available, cannot switch language');
    }
  }

  updateCurrentLanguageDisplay() {
    const currentFlag = document.getElementById('current-flag');
    const currentLanguage = document.getElementById('current-language');
    
    if (currentFlag && currentLanguage) {
      const langData = this.languageData[this.currentLanguage];
      if (langData) {
        currentFlag.textContent = langData.flag;
        currentLanguage.textContent = langData.code;
      }
    }

    this.updateActiveOption();
  }

  updateActiveOption() {
    const options = document.querySelectorAll('.language-option');
    options.forEach(option => {
      const lang = option.getAttribute('data-lang');
      if (lang === this.currentLanguage) {
        option.classList.add('active');
        option.setAttribute('aria-selected', 'true');
      } else {
        option.classList.remove('active');
        option.setAttribute('aria-selected', 'false');
      }
    });
  }

  onLocaleChange(event, data) {
    if (event === 'localeChanged') {
      this.currentLanguage = data.newLocale;
      this.updateCurrentLanguageDisplay();
      
      // Update meta tags for SEO
      this.updateMetaTags();
      
      // Update structured data if needed
      this.updateStructuredData();
    }
  }

  updateMetaTags() {
    // Update lang attribute
    document.documentElement.setAttribute('lang', this.currentLanguage);
    
    // Update meta tags that have data-i18n-content attributes
    const metaElements = document.querySelectorAll('meta[data-i18n-content]');
    metaElements.forEach(meta => {
      const key = meta.getAttribute('data-i18n-content');
      if (window.i18n && key) {
        const translation = window.i18n.t(key);
        if (meta.hasAttribute('content')) {
          meta.setAttribute('content', translation);
        } else if (meta.hasAttribute('property')) {
          meta.setAttribute('content', translation);
        }
      }
    });
  }

  updateStructuredData() {
    // Update JSON-LD structured data for different languages
    // This is a basic implementation - you might want to have
    // separate structured data files for each language
    const structuredDataScripts = document.querySelectorAll('script[type="application/ld+json"]');
    
    structuredDataScripts.forEach(script => {
      try {
        const data = JSON.parse(script.textContent);
        
        // Update language-specific properties
        if (data['@type'] === 'SoftwareApplication' && window.i18n) {
          // You could update name, description, etc. based on current language
          // This is a simplified example
          data.inLanguage = this.currentLanguage;
          script.textContent = JSON.stringify(data, null, 2);
        }
      } catch (error) {
        console.warn('Could not update structured data:', error);
      }
    });
  }

  getCurrentLanguage() {
    return this.currentLanguage;
  }

  getAvailableLanguages() {
    return Object.keys(this.languageData);
  }

  getLanguageData(lang) {
    return this.languageData[lang] || null;
  }

  // Method to add new languages dynamically
  addLanguage(code, data) {
    this.languageData[code] = {
      name: data.name,
      flag: data.flag,
      code: data.code || code.toUpperCase()
    };
    
    // Update the dropdown if it exists
    this.updateDropdownOptions();
  }

  updateDropdownOptions() {
    const dropdown = document.getElementById('language-dropdown');
    if (!dropdown) return;

    // Clear existing options
    dropdown.innerHTML = '';

    // Add options for each language
    Object.entries(this.languageData).forEach(([code, data]) => {
      const option = document.createElement('button');
      option.className = 'language-option';
      option.setAttribute('data-lang', code);
      option.setAttribute('data-flag', data.flag);
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', code === this.currentLanguage ? 'true' : 'false');
      
      if (code === this.currentLanguage) {
        option.classList.add('active');
      }

      option.innerHTML = `
        <span class="language-flag">${data.flag}</span>
        <span data-i18n="languages.${code === 'en' ? 'english' : code === 'es' ? 'spanish' : code}">${data.name}</span>
      `;

      option.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.switchLanguage(code);
      });

      dropdown.appendChild(option);
    });
  }
}

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Wait a bit for i18n to be initialized
  setTimeout(() => {
    window.languageSwitcher = new LanguageSwitcher();
    console.log('🌍 Language switcher initialized');
  }, 100);
});

// Make available globally
if (typeof window !== 'undefined') {
  window.LanguageSwitcher = LanguageSwitcher;
}
