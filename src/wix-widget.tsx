import './MapsyWidgetElement';
import './index.css';

/**
 * Wix Widget Entry Point
 * This file is loaded by Wix and registers the custom element
 */

// Initialize the widget when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeWidget);
} else {
  initializeWidget();
}

function initializeWidget() {
  console.log('Mapsy Widget initialized for Wix');

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

    // Append to body or a specific container
    const container = document.getElementById('widget-container') || document.body;
    container.appendChild(widget);
  }
}

// Export for Wix to access
(window as any).MapsyWidget = {
  setProp: (property: string, value: any) => {
    const widget = document.querySelector('mapsy-widget') as any;
    if (widget && widget.setProp) {
      widget.setProp(property, value);
    }
  },
  getConfig: () => {
    const widget = document.querySelector('mapsy-widget') as any;
    if (widget && widget.getConfig) {
      return widget.getConfig();
    }
    return null;
  }
};