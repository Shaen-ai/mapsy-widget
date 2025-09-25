# Mapsy Widget

A self-contained location widget with automatic version management and cache busting.

## Quick Start

Add the widget to any webpage with just one script:

```html
<!-- The loader automatically handles CSS and versioning -->
<script src="https://your-cdn.com/mapsy-widget-loader.js"></script>

<!-- Add widget elements anywhere on your page -->
<mapsy-widget></mapsy-widget>
```

## How It Works

The widget uses a smart loading system to ensure users always get the latest version:

1. **`mapsy-widget-loader.js`** (1.2KB) - The main entry point
2. Fetches **`manifest.json`** with cache-busting to get current version
3. Loads **`mapsy-widget.min.js?v={version}`** - The actual widget code
4. Loads **`style.css?v={version}`** - Widget styles
5. Auto-initializes all `<mapsy-widget>` elements on the page

### Benefits:
- ✅ **Always Fresh**: Users automatically get the latest version after you deploy
- ✅ **No Cache Issues**: Version-based query parameters ensure proper caching
- ✅ **Small Initial Load**: Loader is only 1.2KB
- ✅ **CDN Friendly**: Leverages browser caching for unchanged versions

## Configuration Options

### Method 1: Data Attributes

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

```html
<div id="my-widget"></div>

<script>
    // Wait for widget to load
    window.addEventListener('load', () => {
        window.MapsyWidget.init('#my-widget', {
            apiUrl: 'https://api.example.com/api',
            defaultView: 'map',
            showHeader: true,
            headerTitle: 'Custom Widget'
        });
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

## Build System

### Files Generated

```
dist/
├── manifest.json              # Version and build info
├── mapsy-widget-loader.js     # Main entry point (1.2KB)
├── mapsy-widget.js            # Development version
├── mapsy-widget.min.js        # Production version (500KB)
├── mapsy-widget-{version}.min.js  # Versioned copy
├── style.css                  # Widget styles
└── style-{version}.css        # Versioned styles
```

### Building from Source

```bash
# Install dependencies
npm install

# Build the widget (auto-increments version)
npm run build

# Development mode
npm run dev
```

### Version Management

Each build automatically:
1. Increments the patch version (e.g., 1.0.3 → 1.0.4)
2. Updates `manifest.json` with new version and build time
3. Creates versioned file copies
4. Ensures cache busting on deployment

## Deployment

### CDN Deployment

1. Upload all files from `dist/` to your CDN
2. Use `mapsy-widget-loader.js` as the script source
3. The loader handles everything else automatically

### Cache Headers (Recommended)

Configure your CDN/server with these cache headers:

```
# Loader and manifest - short cache or no-cache
mapsy-widget-loader.js: Cache-Control: max-age=300
manifest.json: Cache-Control: no-cache

# Versioned files - long cache
mapsy-widget.min.js: Cache-Control: max-age=31536000
style.css: Cache-Control: max-age=31536000
```

## API Methods

### `window.MapsyWidget.init(selector?, config?)`
Initialize widget(s). If no selector provided, auto-initializes all `<mapsy-widget>` elements.

### `window.MapsyWidget.autoInit()`
Manually trigger auto-initialization.

### `window.MapsyWidget.version`
Get the current widget version.

## Testing

Use the included test files:
- `test-cache-busting.html` - Test version loading and cache busting
- `test-auto-widget.html` - Test auto-initialization
- `integration.html` - Simple integration example

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## Troubleshooting

### Widget Not Loading?

Check browser console for errors and verify:
1. `mapsy-widget-loader.js` is accessible
2. `manifest.json` is in the same directory
3. CORS headers are configured if loading from different domain

### Old Version Still Showing?

The loader prevents this, but if issues persist:
1. Clear browser cache
2. Check CDN cache settings
3. Verify manifest.json is not cached

## License

MIT