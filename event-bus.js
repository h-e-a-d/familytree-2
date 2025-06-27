// event-bus.js
// Event-driven architecture to replace window globals and improve module communication

export class EventBus {
  constructor() {
    this.events = new Map();
    this.maxListeners = 50; // Prevent memory leaks
  }

  // Subscribe to an event
  on(eventName, callback, context = null) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    if (!this.events.has(eventName)) {
      this.events.set(eventName, new Set());
    }

    const listeners = this.events.get(eventName);
    
    if (listeners.size >= this.maxListeners) {
      console.warn(`Max listeners (${this.maxListeners}) reached for event: ${eventName}`);
    }

    const listener = { callback, context };
    listeners.add(listener);

    // Return unsubscribe function
    return () => this.off(eventName, callback);
  }

  // Subscribe to an event once
  once(eventName, callback, context = null) {
    const unsubscribe = this.on(eventName, (...args) => {
      unsubscribe();
      callback.apply(context, args);
    }, context);

    return unsubscribe;
  }

  // Unsubscribe from an event
  off(eventName, callback) {
    if (!this.events.has(eventName)) return;

    const listeners = this.events.get(eventName);
    for (const listener of listeners) {
      if (listener.callback === callback) {
        listeners.delete(listener);
        break;
      }
    }

    if (listeners.size === 0) {
      this.events.delete(eventName);
    }
  }

  // Emit an event
  emit(eventName, ...args) {
    if (!this.events.has(eventName)) return;

    const listeners = this.events.get(eventName);
    const listenersArray = Array.from(listeners);

    listenersArray.forEach(listener => {
      try {
        listener.callback.apply(listener.context, args);
      } catch (error) {
        console.error(`Error in event listener for '${eventName}':`, error);
      }
    });
  }

  // Remove all listeners
  removeAllListeners(eventName = null) {
    if (eventName) {
      this.events.delete(eventName);
    } else {
      this.events.clear();
    }
  }

  // Get listener count for debugging
  listenerCount(eventName) {
    return this.events.has(eventName) ? this.events.get(eventName).size : 0;
  }

  // Get all event names for debugging
  eventNames() {
    return Array.from(this.events.keys());
  }
}

// Service locator pattern for dependency injection
export class ServiceContainer {
  constructor() {
    this.services = new Map();
    this.factories = new Map();
    this.singletons = new Map();
  }

  // Register a service instance
  register(name, instance) {
    this.services.set(name, instance);
  }

  // Register a service factory
  registerFactory(name, factory) {
    if (typeof factory !== 'function') {
      throw new Error('Factory must be a function');
    }
    this.factories.set(name, factory);
  }

  // Register a singleton service
  registerSingleton(name, factory) {
    if (typeof factory !== 'function') {
      throw new Error('Factory must be a function');
    }
    this.singletons.set(name, factory);
  }

  // Get a service
  get(name) {
    // Check direct instances first
    if (this.services.has(name)) {
      return this.services.get(name);
    }

    // Check singletons
    if (this.singletons.has(name)) {
      const factory = this.singletons.get(name);
      const instance = factory(this);
      this.services.set(name, instance); // Cache the instance
      this.singletons.delete(name); // Remove factory
      return instance;
    }

    // Check factories
    if (this.factories.has(name)) {
      const factory = this.factories.get(name);
      return factory(this);
    }

    throw new Error(`Service '${name}' not found`);
  }

  // Check if service exists
  has(name) {
    return this.services.has(name) || 
           this.factories.has(name) || 
           this.singletons.has(name);
  }

  // Remove a service
  remove(name) {
    this.services.delete(name);
    this.factories.delete(name);
    this.singletons.delete(name);
  }
}

// Application context that replaces window globals
export class AppContext {
  constructor() {
    this.eventBus = new EventBus();
    this.services = new ServiceContainer();
    this.initialized = false;
  }

  // Initialize the application context
  initialize() {
    if (this.initialized) {
      console.warn('AppContext already initialized');
      return;
    }

    // Register core services
    this.services.register('eventBus', this.eventBus);
    this.services.registerSingleton('treeCore', async (container) => {
      const { TreeCoreCanvas } = await import('./tree-core-canvas.js');
      return new TreeCoreCanvas(container);
    });

    this.initialized = true;
    this.eventBus.emit('app:initialized');
  }

  // Get the event bus
  getEventBus() {
    return this.eventBus;
  }

  // Get the service container
  getServices() {
    return this.services;
  }

  // Convenience method to get a service
  getService(name) {
    return this.services.get(name);
  }

  // Cleanup
  destroy() {
    this.eventBus.removeAllListeners();
    this.services = new ServiceContainer();
    this.initialized = false;
  }
}

// Global app context instance (replaces window globals)
export const appContext = new AppContext();

// Event constants to prevent typos
export const EVENTS = {
  // App lifecycle
  APP_INITIALIZED: 'app:initialized',
  APP_DESTROYED: 'app:destroyed',

  // Tree events
  TREE_LOADED: 'tree:loaded',
  TREE_SAVED: 'tree:saved',
  TREE_PERSON_ADDED: 'tree:person:added',
  TREE_PERSON_UPDATED: 'tree:person:updated',
  TREE_PERSON_DELETED: 'tree:person:deleted',
  TREE_RELATIONSHIP_ADDED: 'tree:relationship:added',
  TREE_RELATIONSHIP_REMOVED: 'tree:relationship:removed',

  // Canvas events
  CANVAS_READY: 'canvas:ready',
  CANVAS_NODE_SELECTED: 'canvas:node:selected',
  CANVAS_NODE_DRAGGED: 'canvas:node:dragged',
  CANVAS_ZOOM_CHANGED: 'canvas:zoom:changed',
  CANVAS_PAN_CHANGED: 'canvas:pan:changed',

  // UI events
  UI_MODAL_OPENED: 'ui:modal:opened',
  UI_MODAL_CLOSED: 'ui:modal:closed',
  UI_VIEW_CHANGED: 'ui:view:changed',
  UI_SETTINGS_UPDATED: 'ui:settings:updated',

  // Data events
  DATA_VALIDATION_ERROR: 'data:validation:error',
  DATA_EXPORT_STARTED: 'data:export:started',
  DATA_EXPORT_COMPLETED: 'data:export:completed',
  DATA_IMPORT_STARTED: 'data:import:started',
  DATA_IMPORT_COMPLETED: 'data:import:completed',

  // Error events
  ERROR_OCCURRED: 'error:occurred',
  ERROR_RECOVERED: 'error:recovered'
};