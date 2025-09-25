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

    // Build the widget with Vite
    console.log('📦 Building widget...');
    await build({
      configFile: path.resolve(__dirname, '../vite.config.ts'),
      mode: 'production'
    });

    // Read the built widget file
    const distPath = path.resolve(__dirname, '../dist');
    const builtWidgetPath = path.join(distPath, 'mapsy-widget.js');
    const widgetCode = await fs.readFile(builtWidgetPath, 'utf-8');

    // Delete the original unminified file
    await fs.remove(builtWidgetPath);

    // Create mapsy-widget.min.js (minified widget)
    console.log('📦 Creating mapsy-widget.min.js...');
    const minifiedWidget = await minify(widgetCode, {
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
      minifiedWidget.code
    );

    // Create widget-manifest.json
    console.log('📋 Creating widget-manifest.json...');
    const manifestPath = path.resolve(__dirname, '../src/manifest.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
    manifest.buildTime = new Date().toISOString();

    await fs.writeFile(
      path.join(distPath, 'widget-manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    // Create mapsy-widget.js (LOADER - small file that loads the actual widget)
    console.log('📦 Creating mapsy-widget.js (loader)...');
    const loaderPath = path.resolve(__dirname, '../src/loader.js');
    const loaderContent = await fs.readFile(loaderPath, 'utf-8');

    // Minify the loader but keep it readable
    const minifiedLoader = await minify(loaderContent, {
      compress: {
        drop_console: false,
        drop_debugger: true
      },
      mangle: false, // Don't mangle for better debugging
      format: {
        comments: false
      }
    });

    await fs.writeFile(
      path.join(distPath, 'mapsy-widget.js'),
      minifiedLoader.code
    );

    // Print results
    console.log('\n✨ Build complete!\n');
    console.log('📊 Production files:');

    const files = [
      { name: 'mapsy-widget.js', desc: 'Loader (entry point)' },
      { name: 'mapsy-widget.min.js', desc: 'Widget (minified)' },
      { name: 'widget-manifest.json', desc: 'Version manifest' },
      { name: 'style.css', desc: 'Widget styles' }
    ];

    for (const file of files) {
      const filePath = path.join(distPath, file.name);
      if (await fs.pathExists(filePath)) {
        const stats = await fs.stat(filePath);
        const sizeKB = (stats.size / 1024).toFixed(2);
        console.log(`  • ${file.name.padEnd(22)} ${sizeKB.padStart(10)} KB  - ${file.desc}`);
      }
    }

    console.log(`\n🔖 Version: ${version}`);

  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildWidget();