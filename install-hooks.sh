#!/bin/bash

# Install Git Hooks for Mapsy Widget
# Run this script after cloning the repository to set up automatic version incrementing

echo "📦 Installing Git hooks for mapsy-widget..."

HOOK_DIR=".git/hooks"
PRE_PUSH_HOOK="$HOOK_DIR/pre-push"

# Check if we're in a git repository
if [ ! -d ".git" ]; then
  echo "❌ Error: Not a git repository. Run this script from the mapsy-widget directory."
  exit 1
fi

# Create pre-push hook
cat > "$PRE_PUSH_HOOK" << 'EOF'
#!/bin/bash

# Pre-push hook to automatically increment version before pushing
# This ensures every push has a unique version number

echo "🔄 Pre-push hook: Checking version..."

# Get the current branch
current_branch=$(git symbolic-ref --short HEAD 2>/dev/null)

# Only run on main/master branches (optional - remove this check to run on all branches)
# if [[ "$current_branch" != "main" && "$current_branch" != "master" ]]; then
#   echo "✓ Skipping version increment (not on main/master branch)"
#   exit 0
# fi

# Check if there are any changes to commit (excluding the version files)
if ! git diff --quiet --exit-code -- ':!src/manifest.json' ':!package.json'; then
  echo "⚠️  Warning: You have uncommitted changes (excluding version files)"
  echo "   The version will still be incremented and committed."
fi

# Paths
MANIFEST_FILE="src/manifest.json"
PACKAGE_FILE="package.json"

# Check if files exist
if [ ! -f "$MANIFEST_FILE" ] || [ ! -f "$PACKAGE_FILE" ]; then
  echo "⚠️  Version files not found, skipping version increment"
  exit 0
fi

# Read current version from manifest.json
current_version=$(node -p "require('./$MANIFEST_FILE').version")

# Parse and increment version
IFS='.' read -r major minor patch <<< "$current_version"
new_version="$major.$minor.$((patch + 1))"

# Update manifest.json
node -e "
const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync('$MANIFEST_FILE', 'utf-8'));
manifest.version = '$new_version';
manifest.buildTime = new Date().toISOString();
fs.writeFileSync('$MANIFEST_FILE', JSON.stringify(manifest, null, 2) + '\n');
"

# Update package.json
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('$PACKAGE_FILE', 'utf-8'));
pkg.version = '$new_version';
fs.writeFileSync('$PACKAGE_FILE', JSON.stringify(pkg, null, 2) + '\n');
"

# Stage the version files
git add "$MANIFEST_FILE" "$PACKAGE_FILE"

# Check if there are changes to commit
if git diff --staged --quiet; then
  echo "✓ Version already up to date ($current_version)"
  exit 0
fi

# Commit the version bump
git commit -m "Bump version to $new_version" --no-verify

echo "✅ Version bumped: $current_version → $new_version"
echo "   Files updated: $MANIFEST_FILE, $PACKAGE_FILE"
echo "   Proceeding with push..."

exit 0
EOF

# Make the hook executable
chmod +x "$PRE_PUSH_HOOK"

echo "✅ Pre-push hook installed successfully!"
echo ""
echo "The version will now automatically increment on every 'git push'"
echo ""
echo "To test the hook:"
echo "  git push origin main"
echo ""
echo "To uninstall:"
echo "  rm .git/hooks/pre-push"
