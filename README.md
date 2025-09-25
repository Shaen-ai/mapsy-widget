# Mapsy Widget

A self-contained location widget that automatically initializes on any webpage.

## Quick Start

Add the widget to any webpage with just two lines:

```html
<link rel="stylesheet" href="path/to/mapsy-widget/style.css">
<script src="path/to/mapsy-widget/mapsy-widget.min.js"></script>
```

Then add the widget element anywhere on your page:

```html
<mapsy-widget></mapsy-widget>
```

The widget will **automatically** find and initialize all `<mapsy-widget>` elements when the page loads.

## Configuration Options

### Method 1: Data Attributes

Configure the widget using data attributes:

```html
<mapsy-widget
    data-api-url="https://api.example.com/api"
    data-default-view="list"
    data-show-header="true"
    data-header-title="Our Locations"
    data-map-zoom-level="14"
    data-primary-color="#3B82F6">
</mapsy-widget>
```

### Method 2: JSON Configuration

Use a single `data-config` attribute with JSON:

```html
<mapsy-widget data-config='{
    "apiUrl": "https://api.example.com/api",
    "defaultView": "map",
    "showHeader": true,
    "headerTitle": "Store Locator",
    "mapZoomLevel": 12,
    "primaryColor": "#10b981"
}'>
</mapsy-widget>
```

### Method 3: JavaScript Initialization

Manually initialize widgets with JavaScript:

```html
<div id="my-widget"></div>

<script>
    window.MapsyWidget.init('#my-widget', {
        apiUrl: 'https://api.example.com/api',
        defaultView: 'map',
        showHeader: true,
        headerTitle: 'Custom Widget'
    });
</script>
```

## Configuration Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `apiUrl` | string | `http://localhost:8000/api` | API endpoint URL |
| `defaultView` | `'map'` \| `'list'` | `'map'` | Initial view mode |
| `showHeader` | boolean | `true` | Show/hide widget header |
| `headerTitle` | string | `'Our Locations'` | Header title text |
| `mapZoomLevel` | number | `12` | Initial map zoom level |
| `primaryColor` | string | `'#3B82F6'` | Primary theme color |

## Multiple Widgets

You can have multiple widgets on the same page:

```html
<!-- Widget 1: Map View -->
<mapsy-widget data-default-view="map" data-header-title="Map"></mapsy-widget>

<!-- Widget 2: List View -->
<mapsy-widget data-default-view="list" data-header-title="List"></mapsy-widget>
```

## Build Files

The build process generates three files:

- **`manifest.json`** - Contains version and build information
- **`mapsy-widget.js`** - Non-minified version (for development)
- **`mapsy-widget.min.js`** - Minified version (for production)
- **`style.css`** - Widget styles

## Version Tracking

The widget automatically fetches its version from `manifest.json`:

```javascript
console.log(window.MapsyWidget.version); // "1.0.3"
```

## Building from Source

```bash
# Install dependencies
npm install

# Build the widget (increments version automatically)
npm run build

# Development mode
npm run dev
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## API Methods

### `window.MapsyWidget.init(selector?, config?)`

Initialize widget(s). If no selector is provided, auto-initializes all `<mapsy-widget>` elements.

### `window.MapsyWidget.autoInit()`

Manually trigger auto-initialization of all `<mapsy-widget>` elements.

### `window.MapsyWidget.version`

Get the current widget version.

## Examples

Check the following example files:
- `test-widget.html` - Basic integration test
- `test-auto-widget.html` - Comprehensive examples
- `integration-example.html` - Simple integration template