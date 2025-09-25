#!/bin/bash

# Mapsy Widget Deployment Script
# This ensures all widget files are deployed together to prevent version mismatches

echo "🚀 Deploying Mapsy Widget..."

# Build the widget
echo "📦 Building widget..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "❌ Build failed. Aborting deployment."
    exit 1
fi

# Get the version from manifest
VERSION=$(node -p "require('./dist/widget-manifest.json').version")
echo "📌 Deploying version: $VERSION"

# Display files to be deployed
echo "📊 Files to deploy:"
ls -lh dist/

echo ""
echo "⚠️  Ready to deploy to production server"
echo "   Files in dist/ folder:"
echo "   - mapsy-widget.js (loader)"
echo "   - mapsy-widget.min.js (widget)"
echo "   - widget-manifest.json (version: $VERSION)"
echo "   - style.css"
echo ""
echo "📝 Next steps:"
echo "1. Upload ALL files from dist/ to your production server"
echo "2. Clear any CDN/browser caches"
echo "3. Test the widget loads version $VERSION"
echo ""
echo "🔍 To verify deployment, check browser console for:"
echo "   [Mapsy Widget Loader] Manifest loaded: {version: '$VERSION', ...}"