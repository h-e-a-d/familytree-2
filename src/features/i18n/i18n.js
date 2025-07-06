// i18n.js - Lightweight internationalization framework for MapMyRoots
// Supports Google Sheets integration for translation management
// Fixed to work without ES6 modules

class I18n {
  constructor(options = {}) {
    this.defaultLocale = options.defaultLocale || 'en';
    this.currentLocale = this.defaultLocale;
    this.translations = {};
    this.fallbackChain = [this.defaultLocale];
    this.observers = [];
    this.storageKey = 'mapmyroots_locale';
    this.googleSheetConfig = null;
    
    // Load built-in translations
    this.loadBuiltInTranslations();
    
    // Initialize from localStorage if available
    this.loadSavedLocale();
    
    // Bind methods
    this.t = this.t.bind(this);
    this.translate = this.translate.bind(this);
  }

  // Load built-in translations
  loadBuiltInTranslations() {
    this.translations = {
      en: {
        builder: {
          buttons: {
            bring_front: "FRONT"
          },
          
          cache: {
            auto_save: "Auto-save enabled",
            last_saved: "Last saved",
            tree_name_placeholder: "Enter tree name...",
            people: "people",
            connections: "connections",
            auto_save_status: "Auto-save:",
            enabled: "enabled",
            cached_available: "Cached data available",
            saved: "Saved"
          },
          
          modals: {
            line_removal: {
              title: "Remove Connection Line",
              message: "This will hide the visual connection line but preserve the relationship data. The family relationship will remain intact and can be restored later.",
              confirm: "Hide Line"
            }
          },
          
          notifications: {
            bring_front_title: "Brought to Front",
            bring_front_single: "Person brought to front",
            bring_front_multiple: "people brought to front",
            no_selection_front: "Please select a person to bring to front."
          }
        }
      },
      
      es: {
        builder: {
          buttons: {
            bring_front: "FRENTE"
          },
          
          cache: {
            auto_save: "Guardado automático habilitado",
            last_saved: "Último guardado",
            tree_name_placeholder: "Ingrese nombre del árbol...",
            people: "personas",
            connections: "conexiones",
            auto_save_status: "Guardado automático:",
            enabled: "habilitado",
            cached_available: "Datos en caché disponibles",
            saved: "Guardado"
          },
          
          modals: {
            line_removal: {
              title: "Eliminar Línea de Conexión",
              message: "Esto ocultará la línea de conexión visual pero preservará los datos de relación. La relación familiar permanecerá intacta y puede ser restaurada más tarde.",
              confirm: "Ocultar Línea"
            }
          },
          
          notifications: {
            bring_front_title: "Traído al Frente",
            bring_front_single: "Persona traída al frente",
            bring_front_multiple: "personas traídas al frente",
            no_selection_front: "Por favor seleccione una persona para traer al frente."
          }
        }
      }
    };
  }

  // Load saved locale from localStorage
  loadSavedLocale() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved && this.isValidLocale(saved)) {
        this.currentLocale = saved;
      } else {
        // Try to detect browser language
        const browserLang = this.detectBrowserLanguage();
        if (browserLang && this.isValidLocale(browserLang)) {
          this.currentLocale = browserLang;
        }
      }
    } catch (error) {
      console.warn('Could not load saved locale:', error);
    }
  }

  // Detect browser language
  detectBrowserLanguage() {
    const lang = navigator.language || navigator.userLanguage;
    if (lang) {
      // Extract language code (e.g., 'en-US' -> 'en')
      return lang.split('-')[0].toLowerCase();
    }
    return null;
  }

  // Check if locale is valid/supported
  isValidLocale(locale) {
    // Define supported locales that have JSON files
    const supportedLocales = ['en', 'es', 'ru', 'de'];
    return supportedLocales.includes(locale);
  }

  // Save current locale to localStorage
  saveLocale() {
    try {
      localStorage.setItem(this.storageKey, this.currentLocale);
    } catch (error) {
      console.warn('Could not save locale:', error);
    }
  }

  // Configure Google Sheets integration
  configureGoogleSheets(config) {
    this.googleSheetConfig = {
      sheetId: config.sheetId,
      apiKey: config.apiKey,
      range: config.range || 'Sheet1!A:Z',
      keyColumn: config.keyColumn || 'A',
      defaultColumn: config.defaultColumn || 'B',
      ...config
    };
  }

  // Load translations from Google Sheets
  async loadFromGoogleSheets() {
    if (!this.googleSheetConfig) {
      throw new Error('Google Sheets not configured');
    }

    const { sheetId, apiKey, range } = this.googleSheetConfig;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const translations = this.parseGoogleSheetsData(data.values);
      
      // Merge with existing translations
      Object.keys(translations).forEach(locale => {
        this.translations[locale] = {
          ...this.translations[locale],
          ...translations[locale]
        };
      });

      this.notifyObservers('translationsLoaded', translations);
      return translations;
    } catch (error) {
      console.error('Failed to load from Google Sheets:', error);
      throw error;
    }
  }

  // Parse Google Sheets data into translation objects
  parseGoogleSheetsData(rows) {
    if (!rows || rows.length < 2) {
      throw new Error('Invalid Google Sheets data');
    }

    const [headers, ...dataRows] = rows;
    const translations = {};

    // Initialize translation objects for each locale
    headers.slice(1).forEach(locale => {
      if (locale && locale.trim()) {
        translations[locale.trim().toLowerCase()] = {};
      }
    });

    // Process each row
    dataRows.forEach(row => {
      const key = row[0];
      if (!key || key.startsWith('#')) return; // Skip empty or comment rows

      headers.slice(1).forEach((locale, index) => {
        const localeKey = locale.trim().toLowerCase();
        const value = row[index + 1];
        
        if (localeKey && value) {
          this.setNestedValue(translations[localeKey], key, value.trim());
        }
      });
    });

    return translations;
  }

  // Set nested object value using dot notation
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  // Get nested object value using dot notation
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  // Load translations from JSON files
  async loadLocale(locale) {
    try {
      const response = await fetch(`./assets/locales/${locale}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load locale ${locale}: ${response.status}`);
      }

      const translations = await response.json();
      
      // Merge with existing built-in translations
      this.translations[locale] = {
        ...this.translations[locale],
        ...translations
      };
      
      this.notifyObservers('localeLoaded', { locale, translations });
      return translations;
    } catch (error) {
      console.warn(`Could not load locale ${locale}:`, error);
      return null;
    }
  }

  // Load multiple locales
  async loadLocales(locales) {
    const results = await Promise.allSettled(
      locales.map(locale => this.loadLocale(locale))
    );

    const loaded = {};
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        loaded[locales[index]] = result.value;
      }
    });

    return loaded;
  }

  // Set current locale
  async setLocale(locale) {
    if (!this.isValidLocale(locale)) {
      console.warn(`Unsupported locale: ${locale}`);
      return false;
    }

    // Load locale if not already loaded or only has built-in translations
    if (!this.translations[locale] || Object.keys(this.translations[locale]).length === 1) {
      await this.loadLocale(locale);
    }

    const oldLocale = this.currentLocale;
    this.currentLocale = locale;
    this.saveLocale();

    this.notifyObservers('localeChanged', { 
      oldLocale, 
      newLocale: locale 
    });

    // Update page content
    this.updatePageContent();

    return true;
  }

  // Get current locale
  getLocale() {
    return this.currentLocale;
  }

  // Get available locales
  getAvailableLocales() {
    return Object.keys(this.translations);
  }

  // Main translation function
  t(key, params = {}) {
    return this.translate(key, params);
  }

  // Translate with fallback chain
  translate(key, params = {}) {
    // Try current locale first
    let translation = this.getNestedValue(this.translations[this.currentLocale], key);

    // Try fallback chain
    if (translation === undefined) {
      for (const fallbackLocale of this.fallbackChain) {
        if (fallbackLocale !== this.currentLocale) {
          translation = this.getNestedValue(this.translations[fallbackLocale], key);
          if (translation !== undefined) break;
        }
      }
    }

    // Return key if no translation found
    if (translation === undefined) {
      console.warn(`Translation missing for key: ${key} (locale: ${this.currentLocale})`);
      return key;
    }

    // Process parameters
    return this.processParameters(translation, params);
  }

  // Process parameters in translations
  processParameters(text, params) {
    if (!params || Object.keys(params).length === 0) {
      return text;
    }

    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return params[key] !== undefined ? params[key] : match;
    });
  }

  // Update all page content with translations
  updatePageContent() {
    // Update elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.t(key);
      
      if (element.tagName === 'INPUT' && element.type !== 'submit' && element.type !== 'button') {
        element.placeholder = translation;
      } else {
        element.textContent = translation;
      }
    });

    // Update elements with data-i18n-html attribute (for HTML content)
    document.querySelectorAll('[data-i18n-html]').forEach(element => {
      const key = element.getAttribute('data-i18n-html');
      const translation = this.t(key);
      element.innerHTML = translation;
    });

    // Update title and meta description
    const titleKey = document.documentElement.getAttribute('data-i18n-title');
    if (titleKey) {
      document.title = this.t(titleKey);
    }

    const metaDescription = document.querySelector('meta[name="description"]');
    const descKey = metaDescription?.getAttribute('data-i18n-content');
    if (descKey && metaDescription) {
      metaDescription.setAttribute('content', this.t(descKey));
    }

    // Update lang attribute
    document.documentElement.setAttribute('lang', this.currentLocale);
  }

  // Add observer for locale changes
  addObserver(callback) {
    this.observers.push(callback);
  }

  // Remove observer
  removeObserver(callback) {
    const index = this.observers.indexOf(callback);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  // Notify observers
  notifyObservers(event, data) {
    this.observers.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Error in i18n observer:', error);
      }
    });
  }

  // Generate translation keys from DOM
  generateKeysFromDOM() {
    const keys = new Set();
    
    // Find all elements with translatable text
    document.querySelectorAll('*').forEach(element => {
      // Skip script and style elements
      if (['SCRIPT', 'STYLE'].includes(element.tagName)) return;
      
      // Get direct text content (not from children)
      const textNodes = Array.from(element.childNodes)
        .filter(node => node.nodeType === 3) // Text nodes only
        .map(node => node.textContent.trim())
        .filter(text => text.length > 0);
      
      textNodes.forEach(text => {
        if (this.isTranslatable(text)) {
          keys.add(this.generateKeyFromText(text));
        }
      });

      // Check placeholders
      if (element.placeholder && this.isTranslatable(element.placeholder)) {
        keys.add(this.generateKeyFromText(element.placeholder));
      }

      // Check title attributes
      if (element.title && this.isTranslatable(element.title)) {
        keys.add(this.generateKeyFromText(element.title));
      }
    });

    return Array.from(keys).sort();
  }

  // Check if text should be translated
  isTranslatable(text) {
    // Skip if too short, all numbers, or common non-translatable patterns
    if (text.length < 2) return false;
    if (/^\d+$/.test(text)) return false;
    if (/^[^\w\s]+$/.test(text)) return false; // Only symbols
    if (/^https?:\/\//.test(text)) return false; // URLs
    
    return true;
  }

  // Generate key from text
  generateKeyFromText(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .substring(0, 50); // Limit length
  }

  // Initialize i18n system
  async init(options = {}) {
    try {
      // Try to load additional locale files if they exist
      if (this.currentLocale !== this.defaultLocale) {
        await this.loadLocale(this.currentLocale);
      }
      
      // Always try to load default locale for any additional translations
      await this.loadLocale(this.defaultLocale);

      // Load from Google Sheets if configured
      if (options.googleSheets) {
        this.configureGoogleSheets(options.googleSheets);
        try {
          await this.loadFromGoogleSheets();
        } catch (error) {
          console.warn('Could not load from Google Sheets, using local files:', error);
        }
      }

      // Update page content
      this.updatePageContent();

      this.notifyObservers('initialized', { 
        locale: this.currentLocale,
        availableLocales: this.getAvailableLocales()
      });

      return true;
    } catch (error) {
      console.error('Failed to initialize i18n:', error);
      return false;
    }
  }
}

// Create global instance
const i18n = new I18n({
  defaultLocale: 'en'
});

// Make available globally
if (typeof window !== 'undefined') {
  window.i18n = i18n;
  window.I18n = I18n;
}

console.log('📝 i18n system loaded successfully');
