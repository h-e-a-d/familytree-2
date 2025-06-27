// core-cache.js
// Enhanced cache and auto-save manager with security and validation

import { SecurityUtils } from './security-utils.js';
import { CONFIG } from './config.js';
import { EVENTS } from './event-bus.js';

export class CacheManager {
  constructor(treeCore) {
    this.treeCore = treeCore;
    this.cacheKey = 'familyTreeCanvas_state';
    this.autoSaveInterval = 30000;
    this.autoSaveTimer = null;
    this.cacheVersion = '2.6';
    this.lastSaveTime = null;
  }

  setupCaching() {
    this.startAutoSave();
    window.addEventListener('beforeunload', () => this.saveToCache());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.saveToCache();
    });
    // Optionally: this.treeCore.addCacheManagementUI();
  }

  startAutoSave() {
    if (this.autoSaveTimer) clearInterval(this.autoSaveTimer);
    this.autoSaveTimer = setInterval(() => this.autoSave(), this.autoSaveInterval);
  }

  autoSave() {
    try {
      this.saveToCache();
      this.lastSaveTime = new Date();
      if (this.treeCore.enhancedCacheIndicator) {
        this.treeCore.enhancedCacheIndicator.updateSaveStatus('Last saved', this.lastSaveTime.toLocaleTimeString());
        this.treeCore.enhancedCacheIndicator.updateStats();
      }
      const saveIndicator = document.getElementById('saveIndicator');
      if (saveIndicator) {
        saveIndicator.textContent = `Last saved: ${this.lastSaveTime.toLocaleTimeString()}`;
        saveIndicator.style.color = '#27ae60';
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
      if (window.notifications) window.notifications.warning('Auto-save Failed', 'Could not save progress automatically');
    }
  }

  saveToCache() {
    try {
      const state = this.treeCore.getCurrentState();
      const stateString = JSON.stringify(state);
      const currentSize = new Blob([stateString]).size;
      if (currentSize > 5 * 1024 * 1024) {
        const compressedState = this.treeCore.getCompressedState();
        localStorage.setItem(this.cacheKey, JSON.stringify(compressedState));
      } else {
        localStorage.setItem(this.cacheKey, stateString);
      }
      const backupKey = `${this.cacheKey}_backup_${Date.now()}`;
      localStorage.setItem(backupKey, stateString);
      this.treeCore.cleanOldBackups();
      return true;
    } catch (error) {
      console.error('Failed to save to cache:', error);
      return false;
    }
  }

  async loadCachedState() {
    try {
      const cachedState = localStorage.getItem(this.cacheKey);
      if (!cachedState) return false;
      const state = JSON.parse(cachedState);
      if (state.version || state.persons) {
        // Valid format
        this.treeCore.processLoadedData(state);
        return true;
      } else {
        // Invalid or unrecognized format
        console.warn('Unrecognized data format, ignoring cached data');
        return false;
      }
    } catch (error) {
      console.error('Failed to load cached state:', error);
      return false;
    }
  }

  clearCache() {
    localStorage.removeItem(this.cacheKey);
    // Remove backups
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${this.cacheKey}_backup_`)) {
        localStorage.removeItem(key);
      }
    }
  }
} 