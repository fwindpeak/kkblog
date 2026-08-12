import { marked } from 'marked';

// Configure a custom renderer for markdown images
marked.use({
  renderer: {
    image(token: any) {
      const { title, text } = token;
      let href = token.href;

      // Fix missing protocol if user forgot to add http:// in Qiniu Domain config
      if (href && !href.startsWith('http') && !href.startsWith('/')) {
        href = `//${href}`;
      }

      let src = href;
      let zoomSrc = href;

      // If it's an external absolute URL (like Qiniu) and doesn't already have query parameters
      if (href && (href.startsWith('http') || href.startsWith('//')) && !href.includes('?')) {
        // Generate Qiniu thumbnail URL (Max Width 800px, Quality 75%)
        src = `${href}?imageView2/2/w/800/q/75`;
      }

      const titleAttr = title ? ` title="${title}"` : '';
      const altAttr = text ? ` alt="${text}"` : '';
      
      // Return the image tag with data-zoom-src for medium-zoom
      // Note: cursor-zoom-in gives a visual hint before medium-zoom initializes
      return `<img src="${src}" data-zoom-src="${zoomSrc}"${titleAttr}${altAttr} class="zoomable-image rounded-lg max-w-full h-auto cursor-zoom-in my-4 mx-auto block shadow-sm border border-gray-100 dark:border-gray-800" loading="lazy" />`;
    }
  }
});

export { marked };
