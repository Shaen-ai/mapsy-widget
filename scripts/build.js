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

    // Copy manifest
    console.log('📋 Copying manifest.json...');
    const manifestPath = path.resolve(__dirname, '../src/manifest.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
    manifest.buildTime = new Date().toISOString();

    await fs.writeFile(
      path.join(distPath, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    // Print file sizes
    const files = ['manifest.json', 'mapsy-widget.js', 'mapsy-widget.min.js'];
    console.log('\n✨ Build complete!\n');
    console.log('📊 File sizes:');

    for (const file of files) {
      const filePath = path.join(distPath, file);
      const stats = await fs.stat(filePath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(`  • ${file}: ${sizeKB} KB`);
    }

    console.log(`\n🔖 Version: ${version}`);
    console.log(`📁 Output: ${distPath}`);

  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildWidget();