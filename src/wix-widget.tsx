import './MapsyWidgetElement';
import './index.css';
import { setCompId, setInstanceToken, getCompId, getInstanceToken } from './services/api';

/**
 * Wix Widget Entry Point
 * This file is loaded by Wix and registers the custom element
 */

// Extract compId and instance from URL params
function extractWixParams() {
  const urlParams = new URLSearchParams(window.location.search);

  const compId = urlParams.get('compId') || urlParams.get('comp-id') || urlParams.get('comp_id');
  const instance = urlParams.get('instance');

  if (compId) {
    setCompId(compId);
    console.log('[Wix Widget] CompId from URL:', compId);
  }

  if (instance) {
    setInstanceToken(instance);
    console.log('[Wix Widget] Instance from URL:', instance ? 'Available' : 'Not available');
  }

  return { compId, instance };
}

// Initialize the widget when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeWidget);
} else {
  initializeWidget();
}

function initializeWidget() {
  console.log('Mapsy Widget initialized for Wix');

  // Extract Wix params from URL
  const { compId, instance } = extractWixParams();

  // Check if we're in Wix environment
  if (window.parent !== window) {
    console.log('Running inside iframe (possibly Wix)');
  }

  // Create widget instance if not already present
  const existingWidget = document.querySelector('mapsy-widget');
  if (!existingWidget) {
    const widget = document.createElement('mapsy-widget');

    // Set default attributes (can be overridden by Wix)
    widget.setAttribute('default-view', 'map');
    widget.setAttribute('show-header', 'false');
    widget.setAttribute('header-title', 'Our Locations');
    widget.setAttribute('map-zoom-level', '12');
    widget.setAttribute('primary-color', '#3B82F6');

    // Set Wix-specific attributes if available
    if (compId) {
      widget.setAttribute('compid', compId);
    }
    if (instance) {
      widget.setAttribute('instance', instance);
    }

    // Append to body or a specific container
    const container = document.getElementById('widget-container') || document.body;
    container.appendChild(widget);
  } else {
    // Update existing widget with Wix params
    if (compId) {
      existingWidget.setAttribute('compid', compId);
    }
    if (instance) {
      existingWidget.setAttribute('instance', instance);
    }
  }
}

// Export for Wix to access
(window as any).MapsyWidget = {
  setProp: (property: string, value: any) => {
    const widget = document.querySelector('mapsy-widget') as any;
    if (widget && widget.setProp) {
      widget.setProp(property, value);
    }
    // Also handle compId and instance specially
    if (property === 'compId' || property === 'compid') {
      setCompId(String(value));
    }
    if (property === 'instance') {
      setInstanceToken(String(value));
    }
  },
  getConfig: () => {
    const widget = document.querySelector('mapsy-widget') as any;
    if (widget && widget.getConfig) {
      return widget.getConfig();
    }
    return null;
  },
  // Expose getters for compId and instance
  getCompId: () => getCompId(),
  getInstanceToken: () => getInstanceToken(),
  setCompId: (id: string) => setCompId(id),
  setInstanceToken: (token: string) => setInstanceToken(token),
};