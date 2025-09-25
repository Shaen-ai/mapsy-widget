# CORS Setup for Mapsy Widget

The widget needs CORS headers to work across different domains. Here's how to set it up:

## Quick Fix

### Option 1: Apache (.htaccess)

Upload the `.htaccess` file from `dist/.htaccess` to your widget server root:

```bash
# On your server
cd /var/www/mapsy-widget.nextechspires.com
# Copy the .htaccess file from dist/
cp dist/.htaccess .
```

### Option 2: Nginx

Add this to your nginx server block:

```nginx
# In /etc/nginx/sites-available/mapsy-widget.nextechspires.com

server {
    server_name mapsy-widget.nextechspires.com;

    # CORS Headers
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept" always;

    # Handle preflight
    if ($request_method = 'OPTIONS') {
        add_header Access-Control-Allow-Origin "*";
        add_header Access-Control-Allow-Methods "GET, OPTIONS";
        add_header Access-Control-Max-Age 86400;
        add_header Content-Length 0;
        return 204;
    }

    # Special handling for manifest.json
    location = /manifest.json {
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        add_header Access-Control-Allow-Origin "*" always;
    }
}
```

Then reload nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Option 3: PHP (if using PHP server)

Create `cors.php` in your widget directory:

```php
<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    header("HTTP/1.1 204 No Content");
    exit();
}
?>
```

Then include it in your PHP files or add to `.htaccess`:
```apache
php_value auto_prepend_file /path/to/cors.php
```

## Testing CORS

### 1. Using curl:
```bash
curl -I https://mapsy-widget.nextechspires.com/manifest.json

# Should see:
# Access-Control-Allow-Origin: *
```

### 2. Using browser console:
```javascript
fetch('https://mapsy-widget.nextechspires.com/manifest.json')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

### 3. Check specific headers:
```bash
curl -H "Origin: https://example.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     -I https://mapsy-widget.nextechspires.com/manifest.json
```

## Common Issues

### CORS Error Still Showing?

1. **Clear browser cache**
2. **Check server is actually serving the headers:**
   ```bash
   curl -I https://mapsy-widget.nextechspires.com/manifest.json | grep -i access-control
   ```

3. **Ensure HTTPS certificates are valid** (mixed content issues)

4. **Check for conflicting headers** - some servers may have existing CORS settings

### Cloudflare Users

If using Cloudflare, you may need to:

1. Go to Cloudflare Dashboard
2. Select your domain
3. Go to Rules > Transform Rules
4. Add Response Header Modification:
   - Add: `Access-Control-Allow-Origin` = `*`
   - When: `URI Path contains "/manifest.json"`

### CDN Setup

For CDN (CloudFront, Fastly, etc.), configure:

```yaml
Behaviors:
  - PathPattern: "*.json"
    Headers:
      Access-Control-Allow-Origin: "*"
      Cache-Control: "no-cache"

  - PathPattern: "*.js"
    Headers:
      Access-Control-Allow-Origin: "*"
      Cache-Control: "public, max-age=31536000"
```

## Security Note

Using `Access-Control-Allow-Origin: *` allows any website to use your widget, which is typically desired for public widgets. If you want to restrict usage:

```nginx
# Only allow specific domains
add_header Access-Control-Allow-Origin "https://trusted-site.com" always;

# Or check dynamically
map $http_origin $cors_header {
    default "";
    "~^https://trusted-site\.com$" "$http_origin";
    "~^https://another-site\.com$" "$http_origin";
}
add_header Access-Control-Allow-Origin $cors_header always;
```

## Verification

After setup, verify everything works:

1. Check manifest loads:
   ```
   https://mapsy-widget.nextechspires.com/manifest.json
   ```

2. Check widget loads:
   ```
   https://mapsy-widget.nextechspires.com/mapsy-widget-loader.js
   ```

3. Test from different domain:
   - Create test.html on different domain
   - Include widget loader
   - Check browser console for errors