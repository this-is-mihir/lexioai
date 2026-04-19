const normalizeUrl = (value) => {
  const url = String(value || "").trim();
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
};

const getMessageIntent = (message) => {
  const text = String(message || "").toLowerCase();
  if (!text) return null;

  const hasAny = (keywords) => keywords.some((keyword) => text.includes(keyword));

  if (hasAny(["resume", "cv", "curriculum vitae", "bio data", "बायोडाटा", "रिज़्यूमे", "resume download"])) {
    return "resume";
  }

  if (hasAny(["project", "projects", "live project", "demo", "portfolio work", "काम", "प्रोजेक्ट"])) {
    return "projects";
  }

  if (hasAny(["blog", "blogs", "article", "articles", "post", "posts", "ब्लॉग", "लेख"])) {
    return "blog";
  }

  if (hasAny(["portfolio", "website", "site", "portfolio link", "पोर्टफोलियो"])) {
    return "portfolio";
  }

  if (hasAny(["github", "git hub"])) {
    return "github";
  }

  if (hasAny(["linkedin", "linked in"])) {
    return "linkedin";
  }

  if (hasAny(["contact", "email", "mail", "phone", "call", "whatsapp", "संपर्क", "कॉन्टैक्ट"])) {
    return "contact";
  }

  return null;
};

const getQuickLinkByIntent = (bot, intent) => {
  const links = bot?.quickLinks || {};
  const socials = bot?.socialLinks || {};
  const contact = bot?.contactInfo || {};

  if (intent === "github") return normalizeUrl(links.githubUrl || socials.github);
  if (intent === "linkedin") return normalizeUrl(links.linkedinUrl || socials.linkedin);
  if (intent === "resume") return normalizeUrl(links.resumeUrl);
  if (intent === "projects") return normalizeUrl(links.projectsUrl);
  if (intent === "blog") return normalizeUrl(links.blogUrl);
  if (intent === "portfolio") return normalizeUrl(links.portfolioUrl || bot?.websiteUrl);
  if (intent === "contact") {
    return (
      normalizeUrl(links.contactUrl) ||
      (contact.email ? `mailto:${contact.email}` : null) ||
      (contact.phone ? `tel:${contact.phone}` : null) ||
      (contact.whatsapp ? `https://wa.me/${String(contact.whatsapp).replace(/\D/g, "")}` : null)
    );
  }

  return null;
};

const getLinkIntentLabel = (intent, language = "en") => {
  const labels = {
    en: {
      resume: "resume",
      projects: "projects",
      blog: "blog",
      portfolio: "portfolio",
      github: "GitHub",
      linkedin: "LinkedIn",
      contact: "contact",
    },
    hi: {
      resume: "रिज़्यूमे",
      projects: "प्रोजेक्ट्स",
      blog: "ब्लॉग",
      portfolio: "पोर्टफोलियो",
      github: "GitHub",
      linkedin: "LinkedIn",
      contact: "संपर्क",
    },
    hinglish: {
      resume: "resume",
      projects: "projects",
      blog: "blog",
      portfolio: "portfolio",
      github: "GitHub",
      linkedin: "LinkedIn",
      contact: "contact",
    },
  };

  return labels[language]?.[intent] || labels.en[intent] || "link";
};

const buildQuickLinkResponse = ({ intent, url, language = "en" }) => {
  if (!url) return null;
  const label = getLinkIntentLabel(intent, language);

  if (language === "hi") {
    return `${label} लिंक यहाँ है:\n${url}`;
  }

  if (language === "hinglish") {
    return `${label} link yahan hai:\n${url}`;
  }

  return `Here is the ${label} link:\n${url}`;
};

module.exports = {
  getMessageIntent,
  getQuickLinkByIntent,
  buildQuickLinkResponse,
};

