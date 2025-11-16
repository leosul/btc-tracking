# BTC Alertas PWA

Progressive Web App para monitoramento e alertas de preço do Bitcoin.

## 🚀 Build e Deploy

### Build de Produção
```bash
# Instalar dependências
npm install

# Gerar build otimizado
npm run build
```

### Testar Localmente
```bash
# Servidor de desenvolvimento
npm run serve

# Testar versão de produção
npm run serve-dist
```

## 📦 Conteúdo do Build

A pasta `dist/` contém todos os arquivos otimizados para produção:

- **index.html** - HTML minificado com CSS inline otimizado
- **main.js** - JavaScript minificado e comprimido
- **sw.js** - Service Worker otimizado
- **manifest.webmanifest** - Manifest do PWA
- **icon-192.png**, **icon-512.png** - Ícones da aplicação

## 🌐 Deploy

### Netlify
1. Faça upload da pasta `dist/`
2. Configure redirects se necessário

### Vercel
```bash
npx vercel --prod dist/
```

### GitHub Pages
1. Copie o conteúdo de `dist/` para o repositório
2. Ative GitHub Pages

### Servidor Web Tradicional
1. Copie todos os arquivos de `dist/` para o diretório web
2. Configure HTTPS (obrigatório para PWAs)
3. Configure cabeçalhos de cache apropriados

## 📋 Requisitos para Produção

- ✅ HTTPS obrigatório (PWAs não funcionam em HTTP)
- ✅ Service Worker registrado
- ✅ Manifest válido
- ✅ Ícones em diferentes tamanhos
- ✅ Responsivo para dispositivos móveis

## 🔧 Otimizações Aplicadas

- **HTML**: Minificado, comentários removidos, CSS inline otimizado
- **JavaScript**: Minificado, código morto removido
- **Service Worker**: Comprimido e otimizado
- **Assets**: Copiados sem modificação (já otimizados)

**Redução de tamanho**: ~55% menor que os arquivos originais