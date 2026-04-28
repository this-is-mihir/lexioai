import {
  Globe, FileCode, ShoppingCart, Sparkles, Square, Hexagon,
  Atom, Triangle, Code2, CircleDot, Flame, Layers, Disc, Rocket, Grape,
  FileJson, Braces, Gem, Hash, Coffee, Container,
  Smartphone, Bug, Tag, Frame
} from 'lucide-react'

// Framework categories and their setup instructions
// Shared between EmbedSetupGuide (bot tab) and SetupGuide (public docs page)
const FRAMEWORKS = [
  {
    category: 'Web Basics',
    items: [
      {
        id: 'html',
        name: 'HTML',
        icon: Globe,
        description: 'Any static HTML website',
        getInstructions: (code) => [
          { title: 'Open your HTML file', desc: 'Open the HTML file where you want the chatbot to appear (e.g., index.html).' },
          { title: 'Paste before </body>', desc: 'Add the following code just before the closing </body> tag:', code },
          { title: 'Save & refresh', desc: 'Save the file and refresh your browser. The chat widget will appear in the bottom-right corner.' },
        ],
      },
      {
        id: 'wordpress',
        name: 'WordPress',
        icon: FileCode,
        description: 'WordPress websites & blogs',
        getInstructions: (code) => [
          { title: 'Go to Theme Editor', desc: 'In WordPress Admin, go to Appearance → Theme File Editor → footer.php (or use a plugin like "Insert Headers and Footers").' },
          { title: 'Paste before </body>', desc: 'Add this code just before the closing </body> tag in footer.php:', code },
          { title: 'Save & verify', desc: 'Click "Update File" and visit your website. The chatbot should appear on all pages.' },
        ],
      },
      {
        id: 'shopify',
        name: 'Shopify',
        icon: ShoppingCart,
        description: 'Shopify stores',
        getInstructions: (code) => [
          { title: 'Open Theme Editor', desc: 'Go to Online Store → Themes → Actions → Edit Code.' },
          { title: 'Edit theme.liquid', desc: 'Open Layout → theme.liquid and paste this code before the closing </body> tag:', code },
          { title: 'Save', desc: 'Click Save. The chatbot will now appear on your entire Shopify store.' },
        ],
      },
      {
        id: 'wix',
        name: 'Wix',
        icon: Sparkles,
        description: 'Wix websites',
        getInstructions: (code) => [
          { title: 'Open Wix Settings', desc: 'Go to Settings → Custom Code (under Advanced).' },
          { title: 'Add custom code', desc: 'Click "+ Add Custom Code", paste this code:', code },
          { title: 'Configure placement', desc: 'Set "Place Code in" to "Body - end" and apply to "All pages". Click Apply.' },
        ],
      },
      {
        id: 'squarespace',
        name: 'Squarespace',
        icon: Square,
        description: 'Squarespace websites',
        getInstructions: (code) => [
          { title: 'Open Code Injection', desc: 'Go to Settings → Advanced → Code Injection.' },
          { title: 'Paste in Footer', desc: 'Paste this code in the "Footer" section:', code },
          { title: 'Save', desc: 'Click Save. The chatbot will appear on all pages.' },
        ],
      },
      {
        id: 'webflow',
        name: 'Webflow',
        icon: Hexagon,
        description: 'Webflow websites',
        getInstructions: (code) => [
          { title: 'Open Project Settings', desc: 'Go to Project Settings → Custom Code tab.' },
          { title: 'Paste in Footer Code', desc: 'Add this code in the "Footer Code" section:', code },
          { title: 'Publish', desc: 'Save and Publish your site. The chatbot will be live on all pages.' },
        ],
      },
    ],
  },
  {
    category: 'JavaScript Frameworks',
    items: [
      {
        id: 'react',
        name: 'React',
        icon: Atom,
        description: 'React (CRA / Vite)',
        getInstructions: (code, embedKey, widgetUrl, apiBase) => [
          { title: 'Option A: Add to index.html', desc: 'Open public/index.html (CRA) or index.html (Vite) and paste before </body>:', code },
          {
            title: 'Option B: Use useEffect hook',
            desc: 'Or add dynamically in your App.jsx or layout component:',
            code: `import { useEffect } from 'react';

function App() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '${widgetUrl}/widget.js';
    script.setAttribute('data-key', '${embedKey}');
    script.setAttribute('data-api-base', '${apiBase}');
    script.defer = true;
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  return (/* your app JSX */);
}`,
          },
          { title: 'Done!', desc: 'The chatbot widget will appear on your React app.' },
        ],
      },
      {
        id: 'nextjs',
        name: 'Next.js',
        icon: Triangle,
        description: 'Next.js (App Router / Pages Router)',
        getInstructions: (code, embedKey, widgetUrl, apiBase) => [
          {
            title: 'App Router (app/layout.jsx)',
            desc: 'Add the Script component in your root layout:',
            code: `// app/layout.jsx
import Script from 'next/script';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          src="${widgetUrl}/widget.js"
          data-key="${embedKey}"
          data-api-base="${apiBase}"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}`,
          },
          {
            title: 'Pages Router (_app.jsx)',
            desc: 'Or if using Pages Router, add in _app.jsx:',
            code: `// pages/_app.jsx
import Script from 'next/script';

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Script
        src="${widgetUrl}/widget.js"
        data-key="${embedKey}"
        data-api-base="${apiBase}"
        strategy="lazyOnload"
      />
    </>
  );
}`,
          },
          { title: 'Deploy', desc: 'Deploy your Next.js app. The chatbot will load on all pages.' },
        ],
      },
      {
        id: 'vue',
        name: 'Vue.js',
        icon: Code2,
        description: 'Vue 2 / Vue 3',
        getInstructions: (code, embedKey, widgetUrl, apiBase) => [
          { title: 'Option A: index.html', desc: 'Add to public/index.html or index.html before </body>:', code },
          {
            title: 'Option B: App.vue mounted hook',
            desc: 'Or add dynamically in App.vue:',
            code: `// App.vue
<script setup>
import { onMounted, onUnmounted } from 'vue';

let scriptEl = null;

onMounted(() => {
  scriptEl = document.createElement('script');
  scriptEl.src = '${widgetUrl}/widget.js';
  scriptEl.setAttribute('data-key', '${embedKey}');
  scriptEl.setAttribute('data-api-base', '${apiBase}');
  scriptEl.defer = true;
  document.body.appendChild(scriptEl);
});

onUnmounted(() => {
  if (scriptEl) document.body.removeChild(scriptEl);
});
</script>`,
          },
        ],
      },
      {
        id: 'angular',
        name: 'Angular',
        icon: CircleDot,
        description: 'Angular 14+',
        getInstructions: (code) => [
          { title: 'Add to index.html', desc: 'Open src/index.html and paste before </body>:', code },
          { title: 'Alternative: angular.json', desc: 'Or reference in angular.json scripts array (index.html method recommended for data attributes).' },
        ],
      },
      {
        id: 'svelte',
        name: 'Svelte / SvelteKit',
        icon: Flame,
        description: 'Svelte & SvelteKit',
        getInstructions: (code, embedKey, widgetUrl, apiBase) => [
          { title: 'SvelteKit: app.html', desc: 'Open src/app.html and paste before </body>:', code },
          {
            title: 'Svelte: onMount',
            desc: 'Or in your root +layout.svelte:',
            code: `<script>
  import { onMount } from 'svelte';
  onMount(() => {
    const s = document.createElement('script');
    s.src = '${widgetUrl}/widget.js';
    s.setAttribute('data-key', '${embedKey}');
    s.setAttribute('data-api-base', '${apiBase}');
    s.defer = true;
    document.body.appendChild(s);
  });
</script>`,
          },
        ],
      },
      {
        id: 'nuxt',
        name: 'Nuxt.js',
        icon: Layers,
        description: 'Nuxt 3',
        getInstructions: (code, embedKey, widgetUrl, apiBase) => [
          {
            title: 'nuxt.config.ts',
            desc: 'Add to your nuxt.config.ts:',
            code: `// nuxt.config.ts
export default defineNuxtConfig({
  app: {
    head: {
      script: [
        {
          src: '${widgetUrl}/widget.js',
          'data-key': '${embedKey}',
          'data-api-base': '${apiBase}',
          defer: true,
        },
      ],
    },
  },
});`,
          },
        ],
      },
      {
        id: 'remix',
        name: 'Remix',
        icon: Disc,
        description: 'Remix framework',
        getInstructions: (code, embedKey, widgetUrl, apiBase) => [
          {
            title: 'app/root.tsx',
            desc: 'Add the script tag in your root.tsx before </body>:',
            code: `// app/root.tsx — inside the <body> tag
<script
  src="${widgetUrl}/widget.js"
  data-key="${embedKey}"
  data-api-base="${apiBase}"
  defer
/>`,
          },
        ],
      },
      {
        id: 'astro',
        name: 'Astro',
        icon: Rocket,
        description: 'Astro framework',
        getInstructions: (code) => [
          { title: 'Base layout', desc: 'Add to your base layout (e.g., src/layouts/Layout.astro) before </body>:', code },
        ],
      },
      {
        id: 'gatsby',
        name: 'Gatsby',
        icon: Grape,
        description: 'Gatsby framework',
        getInstructions: (code, embedKey, widgetUrl, apiBase) => [
          {
            title: 'gatsby-ssr.js',
            desc: 'Add to gatsby-ssr.js:',
            code: `// gatsby-ssr.js
import React from 'react';

export const onRenderBody = ({ setPostBodyComponents }) => {
  setPostBodyComponents([
    <script
      key="lexioai-widget"
      src="${widgetUrl}/widget.js"
      data-key="${embedKey}"
      data-api-base="${apiBase}"
      defer
    />,
  ]);
};`,
          },
        ],
      },
    ],
  },
  {
    category: 'Backend / Full-Stack',
    items: [
      {
        id: 'php',
        name: 'PHP',
        icon: FileJson,
        description: 'PHP / Laravel / CodeIgniter',
        getInstructions: (code) => [
          { title: 'Add to your layout', desc: 'In your main layout/template file, paste before </body>:', code },
          { title: 'Laravel', desc: 'For Laravel, add to resources/views/layouts/app.blade.php before </body>.' },
          { title: 'CodeIgniter', desc: 'For CodeIgniter, add to application/views/templates/footer.php.' },
        ],
      },
      {
        id: 'python',
        name: 'Python',
        icon: Braces,
        description: 'Django / Flask / FastAPI',
        getInstructions: (code) => [
          { title: 'Django', desc: 'Add to your base template (base.html) before </body>:', code },
          { title: 'Flask', desc: 'Add to templates/layout.html before </body>.' },
          { title: 'FastAPI', desc: 'If serving HTML via Jinja2, add to your base template before </body>.' },
        ],
      },
      {
        id: 'ruby',
        name: 'Ruby on Rails',
        icon: Gem,
        description: 'Rails applications',
        getInstructions: (code) => [
          { title: 'Application layout', desc: 'Add to app/views/layouts/application.html.erb before </body>:', code },
        ],
      },
      {
        id: 'dotnet',
        name: '.NET / Blazor',
        icon: Hash,
        description: 'ASP.NET / Blazor / Razor Pages',
        getInstructions: (code) => [
          { title: 'Shared layout', desc: 'For MVC: Add to Views/Shared/_Layout.cshtml before </body>.', code },
          { title: 'Blazor', desc: 'For Blazor: Add to wwwroot/index.html (WASM) or Pages/_Host.cshtml (Server).' },
        ],
      },
      {
        id: 'java',
        name: 'Java',
        icon: Coffee,
        description: 'Spring Boot / JSP / Thymeleaf',
        getInstructions: (code) => [
          { title: 'Thymeleaf layout', desc: 'Add to your Thymeleaf layout template before </body>:', code },
          { title: 'JSP', desc: 'For JSP, add to your footer include file before </body>.' },
        ],
      },
      {
        id: 'go',
        name: 'Go',
        icon: Container,
        description: 'Go / Gin / Echo',
        getInstructions: (code) => [
          { title: 'HTML templates', desc: 'Add to your base HTML template before </body>:', code },
        ],
      },
    ],
  },
  {
    category: 'Mobile & Other',
    items: [
      {
        id: 'reactnative',
        name: 'React Native (WebView)',
        icon: Smartphone,
        description: 'React Native apps',
        getInstructions: (_, embedKey, widgetUrl, apiBase) => [
          {
            title: 'WebView integration',
            desc: 'Use react-native-webview to embed the chatbot:',
            code: `import { WebView } from 'react-native-webview';

const ChatWidget = () => (
  <WebView
    source={{ html: \`
      <html><body>
        <script
          src="${widgetUrl}/widget.js"
          data-key="${embedKey}"
          data-api-base="${apiBase}"
          defer>
        </script>
      </body></html>
    \` }}
    style={{ flex: 1 }}
  />
);`,
          },
        ],
      },
      {
        id: 'flutter',
        name: 'Flutter (WebView)',
        icon: Bug,
        description: 'Flutter apps',
        getInstructions: (_, embedKey, widgetUrl, apiBase) => [
          {
            title: 'webview_flutter package',
            desc: 'Use webview_flutter to embed:',
            code: `// Add webview_flutter to pubspec.yaml
// Then in your widget:
WebView(
  initialUrl: Uri.dataFromString(
    '<html><body>'
    '<script src="${widgetUrl}/widget.js" '
    'data-key="${embedKey}" '
    'data-api-base="${apiBase}" defer></script>'
    '</body></html>',
    mimeType: 'text/html',
  ).toString(),
  javascriptMode: JavascriptMode.unrestricted,
)`,
          },
        ],
      },
      {
        id: 'gtm',
        name: 'Google Tag Manager',
        icon: Tag,
        description: 'Via GTM container',
        getInstructions: (code) => [
          { title: 'Create new Tag', desc: 'In GTM, go to Tags → New → Custom HTML.' },
          { title: 'Paste the code', desc: 'Paste this code as the Custom HTML:', code },
          { title: 'Set trigger', desc: 'Set trigger to "All Pages" and publish the container.' },
        ],
      },
      {
        id: 'iframe',
        name: 'iFrame Embed',
        icon: Frame,
        description: 'Embed as inline iframe',
        getInstructions: (_, embedKey, widgetUrl, apiBase) => [
          {
            title: 'Use iframe',
            desc: 'Embed the chatbot as a fixed-size iframe (for inline chat windows):',
            code: `<iframe
  src="${widgetUrl}/chat.html?key=${embedKey}&api=${encodeURIComponent(apiBase)}"
  width="400"
  height="600"
  frameborder="0"
  style="border: 1px solid #e0e0e0; border-radius: 12px;"
></iframe>`,
          },
          { title: 'Note', desc: 'The script embed method (shown above) is recommended for floating chat widgets.' },
        ],
      },
    ],
  },
]

export default FRAMEWORKS
