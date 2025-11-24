# Mapsy Widget Deployment Guide

## Current Version: 1.0.54

This guide ensures the latest version with Wix SDK integration is properly deployed.

## What's New in 1.0.54

✅ **Graceful Error Handling**
- Falls back to regular fetch when `site.auth()` fails
- Prevents double initialization of wixService
- Works both on Wix sites and standalone (non-Wix) environments
- Comprehensive error logging

✅ **Wix SDK Integration with @wix/site**
- Uses `site.auth()` for proper authentication when available
- Automatic instance token retrieval on published Wix sites
- Comprehensive instance logging

✅ **Enhanced API Requests**
- Uses `wixClient.fetchWithAuth()` when on Wix with auth
- Falls back to regular authenticated fetch with manual token
- Falls back to unauthenticated fetch if no token available
- Sends instance information in custom headers
- Full request logging for debugging

✅ **Instance Information**
- Instance ID detection and logging
- App Def ID tracking
- Vendor Product ID (plan) tracking
- Comprehensive debug logs

## Pre-Deployment Checklist

- [x] Version bumped to 1.0.54
- [x] All changes committed to git
- [x] Build completed successfully
- [x] dist/ folder contains:
  - mapsy-widget.js (loader)
  - mapsy-widget.min.js (widget)
  - widget-manifest.json (version: 1.0.54)
  - style.css

## Deployment Steps

### Step 1: Build the Widget (Already Done!)

The widget has been built and is ready in the `dist/` folder.

```bash
# If you need to rebuild:
npm run build
```

This will:
1. Auto-increment version (currently 1.0.52)
2. Build and minify all files
3. Create widget-manifest.json
4. Commit version changes to git

### Step 2: Verify Build Output

```bash
ls -lh dist/
cat dist/widget-manifest.json
```

Should show version: 1.0.54

### Step 3: Deploy to Production Server

#### Option A: Using deploy.sh Script

```bash
./deploy.sh
```

This will:
- Build the widget
- Show version and files
- Display deployment instructions

#### Option B: Manual Deployment

1. **Upload ALL files from dist/ to your production server:**
   ```bash
   scp -r dist/* user@server:/var/www/mapsy-widget.nextechspires.com/dist/
   ```

2. **Or use the nginx deployment script:**
   ```bash
   # On your server
   ./deploy-nginx.sh
   ```

### Step 4: Deploy to Wix

1. **Upload the widget files to your CDN/hosting:**
   - Upload `dist/mapsy-widget.js` to your CDN
   - Upload `dist/mapsy-widget.min.js` to your CDN
   - Upload `dist/style.css` to your CDN
   - Upload `dist/widget-manifest.json` to your CDN

2. **Update your Wix site:**
   - Go to your Wix site editor
   - If using Custom Element:
     - Update the script URL if needed
     - Refresh the page
   - The widget should automatically load the new version

3. **Verify the deployment:**
   - Open your Wix site
   - Open browser Developer Console (F12)
   - Look for these log entries:

   ```
   [WixService] ✅ Wix client created with site.auth()
   [WixService] Instance Information Summary
   [WixService] Instance ID: [should show an ID]
   [Widget] Quick Access - Instance ID: [should show same ID]
   [API] Using Wix SDK fetchWithAuth
   [API] URL: https://mapsy-api.nextechspires.com/api/locations
   ```

### Step 5: Verify Instance Detection

#### On a Published Wix Site (with authentication):

In the browser console, you should see:

```
[WixService] ✅ site.auth() succeeded
[WixService] Instance Information Summary
[WixService] ========================================
[WixService] Instance ID: <actual-instance-id>
[WixService] App Def ID: <your-app-def-id>
[WixService] Has Instance Token: true
[WixService] Has Wix Client: true
```

And when API requests are made:

```
[API] ========================================
[API] Using Wix SDK fetchWithAuth
[API] ========================================
[API] URL: https://mapsy-api.nextechspires.com/api/locations
[API] Method: GET
[API] ✅ Added X-Wix-Instance-Id header: <instance-id>
[API] ✅ Added X-Wix-App-Def-Id header: <app-def-id>
[API] Making authenticated request...
[API] ========================================
[API] ✅ Request completed
[API] Status: 200 OK
```

#### In Wix Editor Preview or Standalone (without authentication):

```
[WixService] ⚠️ site.auth() failed, will try without auth
[WixService] Instance Information Summary
[WixService] ========================================
[WixService] Instance ID: Not available
[WixService] Has Instance Token: false
[WixService] Has Wix Client: true
```

And when API requests are made:

```
[API] ========================================
[API] Using regular fetch without authentication
[API] ========================================
[API] URL: https://mapsy-api.nextechspires.com/api/locations
[API] Method: GET
[API] ⚠️ No instance token - request will be unauthenticated
[API] This is normal if not running on a published Wix site
[API] Making request...
[API] ========================================
[API] ✅ Request completed
[API] Status: 200 OK
```

## Verification in Browser Network Tab

1. Open Developer Tools (F12)
2. Go to Network tab
3. Filter by "locations" or "widget-config"
4. You should see requests to:
   - `https://mapsy-api.nextechspires.com/api/locations`
   - `https://mapsy-api.nextechspires.com/api/widget-config`
5. Check the request headers - you should see:
   - `Authorization: Bearer <instance-token>`
   - `X-Wix-Instance-Id: <instance-id>`
   - `X-Wix-App-Def-Id: <app-def-id>`

## Troubleshooting

### ~~Error: "Failed to resolve auth token"~~ (FIXED in 1.0.54)
✅ This error has been fixed. The widget now gracefully falls back to regular fetch when `site.auth()` is not available.

### No API requests visible in Network tab?
- **Check console logs** - Look for `[API]` and `[LocationService]` logs
- **Verify initialization** - Look for `[WixService] Initialization completed` log
- **Check for errors** - Look for any red error messages in console
- **CORS issues** - Make sure your backend allows requests from your domain

### Instance ID showing as "Not available"?
✅ **This is normal and expected in these scenarios:**
- Wix Editor Preview mode (before publishing)
- Testing locally (not on Wix)
- Standalone deployment (not embedded in Wix)

The widget will still work! It will just make unauthenticated requests to your API.

**To get instance ID:**
- Publish your Wix site (not just preview)
- View the published site (not in editor)
- Instance ID should appear in console logs

### API requests returning 401 Unauthorized?
- **In Wix Editor Preview:** This is expected - no auth token available
- **On published Wix site:** Check if `site.auth()` succeeded in console
- **Standalone:** Your backend should allow unauthenticated requests or implement fallback logic

### Widget not loading at all?
- Check browser console for errors
- Verify all files are uploaded correctly
- Clear browser cache
- Check that script URL is correct

## Cache Clearing

After deployment, if you don't see the new version:

1. **Browser Cache:**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Or clear browser cache completely

2. **CDN Cache:**
   - If using a CDN, purge the cache for widget files
   - Or wait for TTL to expire

3. **Wix Cache:**
   - Wix may cache custom elements
   - Try opening your site in an incognito/private window
   - Or wait a few minutes for cache to refresh

## Rollback Instructions

If something goes wrong, you can rollback to the previous version:

```bash
# Checkout previous version
git log --oneline  # Find the commit before version bump
git checkout <previous-commit-hash>

# Rebuild
npm run build

# Redeploy using steps above
```

## Support

If you encounter issues:
1. Check the browser console for detailed logs
2. Look for `[WixService]`, `[API]`, and `[Widget]` log entries
3. Verify all files are uploaded correctly
4. Ensure version 1.0.54 is showing in the logs

## Version History

- **1.0.54** - Fixed "Failed to resolve auth token" error, added graceful fallback, prevents double initialization
- **1.0.53** - Improved error handling
- **1.0.52** - Wix SDK integration with @wix/site, site.auth(), comprehensive logging
- **1.0.51** - Previous version
- **1.0.50** - Previous version

---

**Last Updated:** November 24, 2025
**Current Version:** 1.0.54
**Build Time:** Check `dist/widget-manifest.json` for exact timestamp
