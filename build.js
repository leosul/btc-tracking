const fs = require('fs');
const path = require('path');
const { minify: minifyHTML } = require('html-minifier-terser');
const { minify: minifyJS } = require('terser');

// Configurações
const srcDir = __dirname;
const distDir = path.join(__dirname, 'dist');

// Criar pasta dist
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

console.log('🚀 Iniciando build...');

// Função para copiar arquivos
function copyFile(src, dest) {
  fs.copyFileSync(src, dest);
  console.log(`📋 Copiado: ${path.basename(src)}`);
}

// Função para minificar HTML
async function buildHTML() {
  const htmlContent = fs.readFileSync(path.join(srcDir, 'index.html'), 'utf8');
  
  const minifiedHTML = await minifyHTML(htmlContent, {
    collapseWhitespace: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    useShortDoctype: true,
    minifyCSS: true,
    minifyJS: true
  });
  
  fs.writeFileSync(path.join(distDir, 'index.html'), minifiedHTML);
  console.log('🎨 HTML minificado');
}

// Função para minificar JavaScript
async function buildJS() {
  const jsContent = fs.readFileSync(path.join(srcDir, 'main.js'), 'utf8');
  
  const result = await minifyJS(jsContent, {
    compress: {
      drop_console: false, // Manter console.log para debug
      dead_code: true
    },
    mangle: false, // Não ofuscar nomes para facilitar debug
    format: {
      comments: false
    }
  });
  
  fs.writeFileSync(path.join(distDir, 'main.js'), result.code);
  console.log('⚡ JavaScript minificado');
}

// Função para processar Service Worker
async function buildSW() {
  const swContent = fs.readFileSync(path.join(srcDir, 'sw.js'), 'utf8');
  
  const result = await minifyJS(swContent, {
    compress: true,
    mangle: false
  });
  
  fs.writeFileSync(path.join(distDir, 'sw.js'), result.code);
  console.log('🔧 Service Worker minificado');
}

// Função principal de build
async function build() {
  try {
    // Minificar arquivos
    await buildHTML();
    await buildJS();
    await buildSW();
    
    // Copiar arquivos estáticos
    copyFile(path.join(srcDir, 'manifest.webmanifest'), path.join(distDir, 'manifest.webmanifest'));
    copyFile(path.join(srcDir, 'icon-192.png'), path.join(distDir, 'icon-192.png'));
    copyFile(path.join(srcDir, 'icon-512.png'), path.join(distDir, 'icon-512.png'));
    
    // Calcular tamanhos
    const originalSize = getDirectorySize(srcDir, ['node_modules', 'dist', '.git']);
    const distSize = getDirectorySize(distDir);
    const reduction = ((originalSize - distSize) / originalSize * 100).toFixed(1);
    
    console.log('\n✅ Build concluído!');
    console.log(`📊 Tamanho original: ${formatBytes(originalSize)}`);
    console.log(`📦 Tamanho dist: ${formatBytes(distSize)}`);
    console.log(`🎯 Redução: ${reduction}%`);
    console.log(`\n📂 Arquivos gerados em: ./dist/`);
    console.log(`🌐 Para testar: npm run serve-dist`);
    
  } catch (error) {
    console.error('❌ Erro no build:', error.message);
    process.exit(1);
  }
}

// Utilitários
function getDirectorySize(dir, excludes = []) {
  let size = 0;
  
  function calculateSize(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const itemPath = path.join(currentDir, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        if (!excludes.includes(item)) {
          calculateSize(itemPath);
        }
      } else {
        size += stats.size;
      }
    }
  }
  
  calculateSize(dir);
  return size;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Executar build
build();