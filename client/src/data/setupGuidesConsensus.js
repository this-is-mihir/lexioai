// Setup Guides Data - Simplified and carefully formatted
// 34 platforms total

const platforms = {
  "wordpress": {
    id: "wordpress",
    name: "WordPress",
    category: ["popular", "cms"],
    difficulty: "Beginner",
    setupTime: "2 mins",
    description: "Install Lexio AI chatbot via WordPress plugin",
    icon: ".",
    stepsCount: 6
  },
  "shopify": {
    id: "shopify",
    name: "Shopify",
    category: ["popular", "ecommerce"],
    difficulty: "Beginner",
    setupTime: "3 mins",
    description: "Add Lexio AI chatbot to your Shopify store"
  },
  "wix": {
    id: "wix",
    name: "Wix",
    category: ["popular", "builders"],
    difficulty: "Beginner",
    setupTime: "2 mins",
    description: "Embed Lexio chatbot on your Wix website"
  },
  "html": {
    id: "html",
    name: "HTML / Plain Website",
    category: ["popular", "static"],
    difficulty: "Beginner",
    setupTime: "1 min",
    description: "Add Lexio to any HTML website"
  },
  "react": {
    id: "react",
    name: "React.js",
    category: ["developer"],
    difficulty: "Intermediate",
    setupTime: "5 mins",
    description: "Install Lexio chatbot in your React application"
  },
  "nextjs": {
    id: "nextjs",
    name: "Next.js",
    category: ["developer"],
    difficulty: "Intermediate",
    setupTime: "5 mins",
    description: "Add Lexio chatbot to your Next.js application"
  },
  "vue": {
    id: "vue",
    name: "Vue.js",
    category: ["developer"],
    difficulty: "Intermediate",
    setupTime: "5 mins",
    description: "Integrate Lexio chatbot in Vue applications"
  },
  "angular": {
    id: "angular",
    name: "Angular",
    category: ["developer"],
    difficulty: "Intermediate",
    setupTime: "5 mins",
    description: "Add Lexio chatbot to Angular applications"
  },
  "python": {
    id: "python",
    name: "Python (Flask/Django)",
    category: ["backend"],
    difficulty: "Intermediate",
    setupTime: "10 mins",
    description: "Integrate Lexio chatbot in Python web applications"
  },
  "nodejs": {
    id: "nodejs",
    name: "Node.js / Express",
    category: ["backend"],
    difficulty: "Intermediate",
    setupTime: "5 mins",
    description: "Add Lexio chatbot to Express.js applications"
  },
  "php": {
    id: "php",
    name: "PHP",
    category: ["backend"],
    difficulty: "Beginner",
    setupTime: "3 mins",
    description: "Add Lexio chatbot to PHP websites"
  },
  "java": {
    id: "java",
    name: "Java / Spring Boot",
    category: ["backend", "developer"],
    difficulty: "Intermediate",
    setupTime: "10 mins",
    description: "Integrate Lexio chatbot in Java Spring applications"
  },
  "dotnet": {
    id: "dotnet",
    name: ".NET / C#",
    category: ["backend", "developer"],
    difficulty: "Intermediate",
    setupTime: "8 mins",
    description: "Add Lexio chatbot to .NET applications"
  },
  "drupal": {
    id: "drupal",
    name: "Drupal",
    category: ["cms"],
    difficulty: "Intermediate",
    setupTime: "5 mins",
    description: "Install Lexio chatbot module for Drupal"
  },
  "joomla": {
    id: "joomla",
    name: "Joomla",
    category: ["cms"],
    difficulty: "Beginner",
    setupTime: "4 mins",
    description: "Add Lexio chatbot to Joomla sites"
  },
  "magento": {
    id: "magento",
    name: "Magento eCommerce",
    category: ["ecommerce"],
    difficulty: "Intermediate",
    setupTime: "10 mins",
    description: "Integrate Lexio chatbot in Magento stores"
  },
  "prestashop": {
    id: "prestashop",
    name: "PrestaShop",
    category: ["ecommerce"],
    difficulty: "Beginner",
    setupTime: "3 mins",
    description: "Add Lexio chatbot to PrestaShop stores"
  },
  "squarespace": {
    id: "squarespace",
    name: "Squarespace",
    category: ["builders"],
    difficulty: "Beginner",
    setupTime: "2 mins",
    description: "Embed Lexio widget on Squarespace websites"
  },
  "weebly": {
    id: "weebly",
    name: "Weebly",
    category: ["builders"],
    difficulty: "Beginner",
    setupTime: "2 mins",
    description: "Add Lexio chatbot to Weebly sites"
  },
  "gatsby": {
    id: "gatsby",
    name: "Gatsby",
    category: ["developer"],
    difficulty: "Intermediate",
    setupTime: "5 mins",
    description: "Add Lexio chatbot to Gatsby sites"
  },
  "svelte": {
    id: "svelte",
    name: "Svelte / SvelteKit",
    category: ["developer"],
    difficulty: "Intermediate",
    setupTime: "5 mins",
    description: "Integrate Lexio chatbot in Svelte apps"
  },
  "nuxt": {
    id: "nuxt",
    name: "Nuxt.js",
    category: ["developer"],
    difficulty: "Intermediate",
    setupTime: "5 mins",
    description: "Add Lexio chatbot to Nuxt applications"
  },
  "ember": {
    id: "ember",
    name: "Ember.js",
    category: ["developer"],
    difficulty: "Advanced",
    setupTime: "8 mins",
    description: "Integrate Lexio bot in Ember applications"
  },
  "ruby": {
    id: "ruby",
    name: "Ruby on Rails",
    category: ["backend"],
    difficulty: "Intermediate",
    setupTime: "5 mins",
    description: "Add Lexio chatbot to Rails applications"
  },
  "laravel": {
    id: "laravel",
    name: "Laravel / Blade",
    category: ["backend"],
    difficulty: "Beginner",
    setupTime: "3 mins",
    description: "Integrate Lexio chatbot in Laravel apps"
  },
  "django_adv": {
    id: "django_adv",
    name: "Django Advanced",
    category: ["backend"],
    difficulty: "Advanced",
    setupTime: "10 mins",
    description: "Advanced Django integration with custom middleware"
  },
  "astro": {
    id: "astro",
    name: "Astro",
    category: ["developer"],
    difficulty: "Intermediate",
    setupTime: "5 mins",
    description: "Add Lexio chatbot to Astro static sites"
  },
  "webflow": {
    id: "webflow",
    name: "Webflow",
    category: ["builders"],
    difficulty: "Beginner",
    setupTime: "2 mins",
    description: "Add Lexio bot to Webflow websites"
  },
  "bubble": {
    id: "bubble",
    name: "Bubble (No-Code)",
    category: ["builders"],
    difficulty: "Beginner",
    setupTime: "3 mins",
    description: "Add Lexio chatbot to Bubble applications"
  },
  "strapi": {
    id: "strapi",
    name: "Strapi Headless CMS",
    category: ["cms"],
    difficulty: "Intermediate",
    setupTime: "8 mins",
    description: "Integrate Lexio chatbot with Strapi CMS"
  },
  "umbraco": {
    id: "umbraco",
    name: "Umbraco CMS",
    category: ["cms"],
    difficulty: "Intermediate",
    setupTime: "6 mins",
    description: "Add Lexio chatbot to Umbraco sites"
  },
  "kentico": {
    id: "kentico",
    name: "Kentico Xperience",
    category: ["cms"],
    difficulty: "Advanced",
    setupTime: "15 mins",
    description: "Integrate Lexio with Kentico Xperience"
  },
  "contentful": {
    id: "contentful",
    name: "Contentful Headless CMS",
    category: ["cms"],
    difficulty: "Intermediate",
    setupTime: "8 mins",
    description: "Add Lexio to Contentful-powered sites"
  },
  "notion": {
    id: "notion",
    name: "Notion (Embedded)",
    category: ["builders"],
    difficulty: "Intermediate",
    setupTime: "5 mins",
    description: "Add Lexio chatbot to Notion-powered sites"
  }
};

// Convert to array  of 34 items
export const setupGuidesData = Object.values(platforms);

export default setupGuidesData;
