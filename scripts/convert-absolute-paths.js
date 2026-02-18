const fs = require('fs');
const path = require('path');

// Função para calcular o caminho relativo correto
function getRelativePath(fromFile, toPath) {
  const fromDir = path.dirname(fromFile);
  let relativePath = path.relative(fromDir, toPath);
  
  // Normalizar para usar / em vez de \
  relativePath = relativePath.replace(/\\/g, '/');
  
  // Adicionar ./ se não começar com ..
  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }
  
  return relativePath;
}

// Função para processar um arquivo
function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const srcDir = path.resolve(__dirname, '../src');
  
  // Regex para encontrar imports com @/
  const importRegex = /from\s+['"]@\/(.*?)['"]/g;
  
  let modified = false;
  const newContent = content.replace(importRegex, (match, importPath) => {
    modified = true;
    
    // Construir o caminho absoluto do arquivo de destino
    const targetPath = path.resolve(srcDir, importPath);
    
    // Calcular o caminho relativo
    const relativePath = getRelativePath(filePath, targetPath);
    
    console.log(`  ${filePath}`);
    console.log(`    ${match} -> from '${relativePath}'`);
    
    return `from '${relativePath}'`;
  });
  
  if (modified) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    return true;
  }
  
  return false;
}

// Função para percorrer diretórios recursivamente
function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Ignorar node_modules e dist
      if (file !== 'node_modules' && file !== 'dist' && file !== 'generated') {
        walkDir(filePath, callback);
      }
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      callback(filePath);
    }
  });
}

// Executar
console.log('Converting absolute paths to relative paths...\n');

const srcDir = path.resolve(__dirname, '../src');
let filesModified = 0;

walkDir(srcDir, (filePath) => {
  if (processFile(filePath)) {
    filesModified++;
  }
});

console.log(`\n✅ Conversion complete! ${filesModified} files modified.`);
