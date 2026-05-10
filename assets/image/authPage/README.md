# 🖼️ Image de fond - README

## 📍 Où placer votre image?

Placez votre image d'authentification ici:

```
assets/images/auth/background.jpg
```

## 📋 Spécifications recommandées

### Format

- **Préféré**: JPG (compression, taille réduite)
- **Alternative**: PNG (transparence possible)

### Dimensions

- **Minimum**: 1280x720 (HD)
- **Recommandé**: 1920x1080 (Full HD)
- **Optimal**: 2560x1440 (2K)

### Taille du fichier

- **Idéal**: 100-200 KB (JPG optimisé)
- **Maximum**: 500 KB
- **Si > 500 KB**: Compresser avec TinyJPG ou ImageOptim

### Type d'image

- Image professionnelle
- Gradient, photos abstraites, ou backgrounds
- Pas trop détaillée (l'overlay en réduit la clarté)
- Couleurs sombres recommandées

## 🎨 Exemples de sources

### Gratuit

- [Unsplash](https://unsplash.com)
- [Pexels](https://www.pexels.com)
- [Pixabay](https://pixabay.com)
- [Freepik](https://www.freepik.com)

### Mots-clés de recherche

- "abstract background"
- "dark gradient"
- "business technology"
- "authentication background"
- "login wallpaper"

## 🖼️ Options de personnalisation

### Option 1: Image statique (actuelle)

```tsx
// Dans AuthLayout.tsx
backgroundImage="/images/auth/background.jpg"
```

### Option 2: URL externe

```tsx
// Directement dans AuthLayout
backgroundImage="https://example.com/bg.jpg"
```

### Option 3: Gradient par défaut

```tsx
// Si pas d'image
style={{
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
}}
```

### Option 4: Vidéo de fond (avancé)

```tsx
// Alternative HTML5
style={{
  backgroundImage: 'url(video-background.mp4)',
  backgroundSize: 'cover',
}}
```

## 🔧 Optimisation de l'image

### Avec TinyJPG

1. Visitez [tinyjpg.com](https://tinyjpg.com)
2. Uploadez votre image
3. Téléchargez la version optimisée

### Avec ImageOptim (Mac)

1. Installez [ImageOptim](https://imageoptim.com)
2. Drag & drop votre image
3. Sauvegardez

### Avec FFmpeg (CLI)

```bash
ffmpeg -i image.jpg -vf scale=1920:1080 -q:v 8 optimized.jpg
```

## 🎯 Conseils de design

### Contraste

- L'overlay réduit la clarté (40% noir)
- Utilisez des images sombres ou contrastées
- Évitez les images trop claires

### Lisibilité

- Le texte blanc sur dark overlay doit être lisible
- Testez avec la couleur blanche (`color: white`)

### Performance

- Image optimisée = chargement rapide
- Moins de 200 KB recommandé

## 🔄 Utilisation dans le code

### Chemin par défaut

```tsx
// AuthLayout.tsx
<AuthLayout>  {/* Utilise assets/images/auth/background.jpg */}
  <Form />
</AuthLayout>
```

### Chemin personnalisé

```tsx
<AuthLayout backgroundImage="/images/auth/custom-bg.jpg">
  <Form />
</AuthLayout>
```

### URL externe

```tsx
<AuthLayout backgroundImage="https://cdn.example.com/bg.jpg">
  <Form />
</AuthLayout>
```

## 🌈 Modification du style

### Opacité de l'overlay

Cherchez dans `AuthLayout.tsx`:

```tsx
bg-black/40  // 40% d'opacité
```

Changez à:

```tsx
bg-black/30  // Plus transparent
bg-black/50  // Plus opaque
```

### Effet de flou (optionnel)

Ajoutez dans AuthLayout:

```tsx
<div className="backdrop-blur-xs">
  {/* Le background sera floutée aussi */}
</div>
```

## 📱 Responsive

L'image s'adapte automatiquement à:

- Mobile (375px)
- Tablette (768px)
- Desktop (1920px+)

Pas besoin de créer plusieurs versions!

## ✅ Checklist avant de déployer

- [ ] Image placée dans `assets/images/auth/background.jpg`
- [ ] Taille < 200 KB
- [ ] Format JPG ou PNG
- [ ] Dimensions 1920x1080+
- [ ] Image testée localement
- [ ] Visible en développement
- [ ] Visible en production

## 🆘 Problèmes courants

### L'image n'apparaît pas

```
1. Vérifier le chemin exact
2. Vérifier que l'image existe
3. Redémarrer le serveur: npm run dev
4. Vider le cache (Ctrl+Shift+Del)
5. Vérifier DevTools (F12) → Network
```

### L'image est floutée

```
C'est normal! L'overlay assombrit l'image.
Augmentez la luminosité de votre image source.
```

### L'image charge lentement

```
1. Réduire la taille du fichier (< 200 KB)
2. Utiliser JPG au lieu de PNG
3. Utiliser TinyJPG pour compresser
4. Ajouter cache headers en production
```

## 🎬 Exemple complet

```tsx
// Utilisation simple
import { AuthLayout } from './components/auth/AuthLayout';

export function MyAuthPage() {
  return (
    <AuthLayout backgroundImage="/images/auth/background.jpg">
      {/* Vos composants ici */}
    </AuthLayout>
  );
}
```

## 📚 Ressources

- [CSS Background Images](https://developer.mozilla.org/en-US/docs/Web/CSS/background-image)
- [Image Optimization](https://web.dev/optimize-images)
- [Unsplash API](https://unsplash.com/api)

---

**Prêt?** Trouvez votre image et placez-la dans `assets/images/auth/background.jpg` 🎨
