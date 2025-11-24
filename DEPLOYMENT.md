# Mapsy Widget Deployment Guide

## Current Version: 1.0.52

This guide ensures the latest version with Wix SDK integration is properly deployed.

## What's New in 1.0.52

✅ **Wix SDK Integration with @wix/site**
- Uses `site.auth()` for proper authentication
- Automatic instance token retrieval
- Comprehensive instance logging

✅ **Enhanced API Requests**
- Uses `wixClient.fetchWithAuth()` as recommended by Wix
- Sends instance information in custom headers
- Full authentication logging for debugging

✅ **Instance Information**
- Instance ID detection and logging
- App Def ID tracking
- Vendor Product ID (plan) tracking
- Comprehensive debug logs

## Pre-Deployment Checklist

- [x] Version bumped to 1.0.52
- [x] All changes committed to git
- [x] Build completed successfully
- [x] dist/ folder contains:
  - mapsy-widget.js (loader)
  - mapsy-widget.min.js (widget)
  - widget-manifest.json (version: 1.0.52)
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

Should show version: 1.0.52

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

In the browser console, you should see:

```
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

### No API requests visible in Network tab?
- Check if wixService initialized properly (look for logs)
- Verify `site.auth()` is working (check for auth-related logs)
- Make sure the widget is running on a Wix site (not localhost)

### Instance ID showing as "Not available"?
- This is expected in Wix Editor Preview mode
- Deploy to a published Wix site to get real instance tokens
- Check for this log: `[WixService] ⚠️ No instance token available from SDK`

### API requests failing?
- Check backend CORS settings
- Verify API URL is correct in the logs
- Look for error messages in the console

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
4. Ensure version 1.0.52 is showing in the logs

## Version History

- **1.0.52** - Wix SDK integration with @wix/site, site.auth(), comprehensive logging
- **1.0.51** - Previous version
- **1.0.50** - Previous version

---

**Last Updated:** November 24, 2025
**Current Version:** 1.0.52
**Build Time:** Check `dist/widget-manifest.json` for exact timestamp
