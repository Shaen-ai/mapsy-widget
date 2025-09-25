import { build } from 'vite';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { minify } from 'terser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

async function incrementVersion() {
  const manifestPath = path.resolve(__dirname, '../src/manifest.json');
  const packagePath = path.resolve(__dirname, '../package.json');

  // Read current manifest
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
  const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf-8'));

  // Parse version
  const [major, minor, patch] = manifest.version.split('.').map(Number);

  // Increment patch version
  const newVersion = `${major}.${minor}.${patch + 1}`;

  // Update manifest
  manifest.version = newVersion;
  manifest.buildTime = new Date().toISOString();

  // Update package.json
  packageJson.version = newVersion;

  // Write back
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  await fs.writeFile(packagePath, JSON.stringify(packageJson, null, 2));

  console.log(`✅ Version bumped to ${newVersion}`);
  return newVersion;
}

async function buildWidget() {
  try {
    // Increment version
    const version = await incrementVersion();

    // Clean dist directory
    await fs.emptyDir(path.resolve(__dirname, '../dist'));

    // Build the widget (non-minified)
    console.log('📦 Building mapsy-widget.js...');
    await build({
      configFile: path.resolve(__dirname, '../vite.config.ts'),
      mode: 'production'
    });

    // Read the built file
    const distPath = path.resolve(__dirname, '../dist');
    const widgetPath = path.join(distPath, 'mapsy-widget.js');
    const widgetCode = await fs.readFile(widgetPath, 'utf-8');

    // Create minified version
    console.log('📦 Creating mapsy-widget.min.js...');
    const minified = await minify(widgetCode, {
      compress: {
        drop_console: false,
        drop_debugger: true
      },
      mangle: true,
      format: {
        comments: false
      }
    });

    await fs.writeFile(
      path.join(distPath, 'mapsy-widget.min.js'),
      minified.code
    );

    // Copy and update manifest
    console.log('📋 Creating manifest.json...');
    const manifestPath = path.resolve(__dirname, '../src/manifest.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
    manifest.buildTime = new Date().toISOString();

    await fs.writeFile(
      path.join(distPath, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    // Copy loader script (this is the main entry point now)
    console.log('📦 Copying loader script...');
    const loaderPath = path.resolve(__dirname, '../src/loader.js');
    const loaderContent = await fs.readFile(loaderPath, 'utf-8');

    // Minify the loader
    const minifiedLoader = await minify(loaderContent, {
      compress: {
        drop_console: false,
        drop_debugger: true
      },
      mangle: false, // Don't mangle the loader for better debugging
      format: {
        comments: false
      }
    });

    // Save as mapsy-widget.js (the main entry point)
    await fs.writeFile(
      path.join(distPath, 'mapsy-widget-loader.js'),
      minifiedLoader.code
    );

    // Create versioned copies (optional - for CDN caching)
    console.log('📦 Creating versioned files...');
    await fs.copy(
      path.join(distPath, 'mapsy-widget.min.js'),
      path.join(distPath, `mapsy-widget-${version}.min.js`)
    );
    await fs.copy(
      path.join(distPath, 'style.css'),
      path.join(distPath, `style-${version}.css`)
    );

    // Create integration HTML with new loader
    console.log('📄 Creating integration example...');
    const integrationHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mapsy Widget Integration</title>
</head>
<body>
    <h1>Mapsy Widget Integration Example</h1>

    <!-- Method 1: Simple integration -->
    <mapsy-widget></mapsy-widget>

    <!-- Method 2: With configuration -->
    <mapsy-widget
        data-api-url="http://localhost:8000/api"
        data-default-view="list">
    </mapsy-widget>

    <!--
    The loader script:
    1. Fetches manifest.json (no-cache)
    2. Gets the current version
    3. Loads mapsy-widget.min.js with version query parameter
    4. Loads style.css with version query parameter
    5. Auto-initializes all <mapsy-widget> elements
    -->
    <script src="mapsy-widget-loader.js"></script>
</body>
</html>`;

    await fs.writeFile(
      path.join(distPath, 'integration.html'),
      integrationHtml
    );

    // Print file sizes
    const files = [
      'manifest.json',
      'mapsy-widget-loader.js',
      'mapsy-widget.js',
      'mapsy-widget.min.js',
      'style.css'
    ];
    console.log('\n✨ Build complete!\n');
    console.log('📊 File sizes:');

    for (const file of files) {
      const filePath = path.join(distPath, file);
      if (await fs.pathExists(filePath)) {
        const stats = await fs.stat(filePath);
        const sizeKB = (stats.size / 1024).toFixed(2);
        console.log(`  • ${file}: ${sizeKB} KB`);
      }
    }

    console.log(`\n🔖 Version: ${version}`);
    console.log(`📁 Output: ${distPath}`);
    console.log('\n📌 Integration:');
    console.log('  Use mapsy-widget-loader.js as the main script');
    console.log('  It will automatically load the latest version with cache busting');

  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildWidget();