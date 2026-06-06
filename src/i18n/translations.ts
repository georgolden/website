// All UI strings for the studio site.
// Add a language: append to `languages`, add a dictionary block below,
// and update the Astro i18n `locales` array in astro.config.mjs.

export const languages = {
  en: 'English',
  de: 'Deutsch',
  et: 'Eesti',
  fi: 'Suomi',
  sv: 'Svenska',
  fr: 'Français',
  it: 'Italiano',
  uk: 'Українська',
  ru: 'Русский',
} as const;

export type Lang = keyof typeof languages;

type Dict = Record<string, string>;

const dict: Record<Lang, Dict> = {
  en: {
    'nav.work': 'Work',
    'nav.about': 'About',
    'nav.chat': 'Chat',
    'nav.menu': 'Menu',
    'nav.lang': 'Language',

    'hero.scene.tag': '[ Three.js scene · block builder ]',
    'hero.input.placeholder': 'Try: add a hero section',
    'hero.input.aria': 'Tell the scene what to build',
    'hero.hint.1': 'add a hero',
    'hero.hint.2': 'build a landing page',
    'hero.hint.3': 'make it darker',
    'hero.hint.4': 'auf Deutsch',
    'hero.title': 'Digital performance for your business',
    'hero.sub': 'Websites, SaaS platforms, backend infrastructure, AI agents. One studio.',

    'work.label': 'Selected work',
    'work.title': 'Front to back.',
    'work.viewAll': 'View all work →',
    'work.openSlot.name': 'Open slot',
    'work.openSlot.desc': 'One project at a time. Booking from Q3 2026.',
    'work.openSlot.tag': 'Start the conversation',

    'svc.label': 'Capabilities',
    'svc.title': 'What we do.',
    'svc.01.title': 'Websites',
    'svc.01.copy': 'Simple business pages to ambitious brand sites. Found in search, fast on any device, easy for your team to edit.',
    'svc.01.cap1': 'Multilingual',
    'svc.01.cap2': 'Score 95+',
    'svc.02.title': 'Hosting & support',
    'svc.02.copy': 'We run what we ship. Stays online, stays fast, one contact end to end.',
    'svc.02.cap1': 'Always on',
    'svc.02.cap2': 'Same-day edits',
    'svc.03.title': 'SEO & ads',
    'svc.03.copy': 'Traffic that converts. One monthly report you read in two minutes.',
    'svc.03.cap1': 'Continuous',
    'svc.04.title': 'AI on the site',
    'svc.04.copy': 'Chat, search, translation, lead qualification — woven into the site instead of stapled on.',
    'svc.04.cap1': 'Lead handoff',
    'svc.05.title': 'MVP',
    'svc.05.copy': 'Working first version in 4–6 months. Real system, real users, deployed — not a prototype.',
    'svc.05.cap1': '4–6 months',
    'svc.06.title': 'SaaS, UI & backend',
    'svc.06.copy': 'The whole product as one offering. UI, backend, ops — one studio, accountable for all three.',
    'svc.06.cap1': 'End-to-end',
    'svc.07.title': 'AI inside the product',
    'svc.07.copy': 'Features tied to a cost you cut or a revenue you unlock. AI as a component, not a slogan.',
    'svc.07.cap1': 'Outcome-tied',

    'opener.num': 'Not in the list',
    'opener.intro': 'Tell us what you actually need.',
    'opener.eyebrow': 'Start the conversation',
    'opener.title': 'Tell us about your project.',
    'opener.lede': "Ask anything about the work, the services or the pricing — and leave your details. If I'm online, the agent hands you straight over. If not, I'll pick it up by email.",
    'opener.input.placeholder': 'Tell me about your project, timeline, or budget…',
    'opener.input.aria': 'Ask the studio agent',
    'opener.hint.1': 'SaaS dashboard cost?',
    'opener.hint.2': 'Can you ship in 4 weeks?',
    'opener.hint.3': 'I have an existing backend',
    'opener.hint.4': 'Connect me with Georg',

    'footer.brand': 'Built and operated. One studio, the full stack.',
    'footer.services': 'Services',
    'footer.work': 'Work',
    'footer.connect': 'Connect',
    'footer.work.all': 'All projects',
    'footer.email': 'Email',
    'footer.github': 'GitHub',
    'footer.linkedin': 'LinkedIn',
    'footer.chat': 'Chat now',
    'footer.copyright': '© 2026 GO Studio',

    'about.eyebrow': 'Studio',
    'about.name': 'GO Studio',
    'about.lede': 'A small EU-based team building complete digital systems. From brand site to distributed backend to AI agents woven into the product.',
    'about.web.eyebrow': 'Web · visible & continuous',
    'about.web.mark': 'Web',
    'about.product.eyebrow': 'Product · hard & operating',
    'about.product.mark': 'Product',
    'about.mvp.pre': 'Pre-AI tooling',
    'about.mvp.post': 'Post-AI tooling',
    'about.mvp.pre.what': 'Resonance Vision · v1 in hands of traders',
    'about.mvp.post.what': '44pool · live, multi-region, paying out',
    'about.numbers.label': 'Numbers',
    'about.numbers.title': 'Operating, not just shipped.',
    'about.numbers.traders': 'Active traders on Resonance Vision',
    'about.numbers.data': 'Market data ingested per month across nine exchanges',
    'about.numbers.workers': 'Mining workers connected to 44pool',
    'about.numbers.uptime': 'Uptime across the systems we run',
    'about.founder.label': 'Founder',
    'about.founder.title': 'Who runs it.',
    'about.founder.lede': 'The studio is led by its founder, who built the work the studio is known for and still writes code on every project.',
    'about.founder.name': 'Georg Oldenburger',
    'about.founder.role': 'Founder · Engineering · Operations',
    'about.founder.p1': 'Ten years of building systems end to end. Started with web, kept going into distributed backends, real-time pipelines, AI infrastructure. The work in the case studies — Resonance, 44pool — was built and is still operated by him.',
    'about.founder.p2': 'Today the studio is a small team. Georg leads the engineering and runs the projects he takes on personally.',
    'about.agent.num': 'Contact',
    'about.agent.intro': 'Discovery call, on demand.',
    'about.agent.eyebrow': 'Studio agent',
    'about.agent.title': 'Ask anything.',
    'about.agent.lede': "Pricing, timeline, process, whether we're a fit for your project. If the studio is online, it hands you over directly.",
    'about.agent.placeholder': "What's your rate for a SaaS dashboard?",
    'about.agent.hint.1': "What's your typical timeline?",
    'about.agent.hint.2': 'Do you work with existing teams?',
    'about.agent.hint.3': 'Ongoing support after launch?',
    'about.agent.hint.4': 'Are you available now?',

    'case.client': 'The client',
    'case.challenge': 'The challenge',
    'case.inMotion': 'In motion',
    'case.whatDone': 'What was done',
    'case.next': 'Next project',
    'case.agent.num': 'Project agent',
    'case.agent.title': 'Ask the agent about this project, or about building your own.',
    'case.agent.lede': 'It has the architecture, the constraints, the timeline. It can also talk about building something similar for your business.',
    'case.meta.year': 'Year',
    'case.meta.industry': 'Industry',
    'case.meta.users': 'Users',
    'case.meta.scale': 'Scale',

    'skip': 'Skip to content',
  },

  de: {
    'nav.work': 'Arbeit',
    'nav.about': 'Über',
    'nav.chat': 'Chat',
    'nav.menu': 'Menü',
    'nav.lang': 'Sprache',
    'hero.title': 'Full-Stack-Systeme, gebaut und betrieben mit KI.',
    'hero.sub': 'Websites, SaaS-Plattformen, Backend-Infrastruktur, KI-Agenten. Ein Studio.',
    'skip': 'Zum Inhalt springen',
  },

  et: {
    'nav.work': 'Tööd',
    'nav.about': 'Stuudio',
    'nav.chat': 'Vestlus',
    'nav.menu': 'Menüü',
    'nav.lang': 'Keel',
    'hero.title': 'Täisstäki süsteemid, ehitatud ja juhitud tehisintellektiga.',
    'hero.sub': 'Veebisaidid, SaaS-platvormid, taustainfrastruktuur, AI-agendid. Üks stuudio.',
    'skip': 'Mine sisu juurde',
  },

  fi: {
    'nav.work': 'Työt',
    'nav.about': 'Studio',
    'nav.chat': 'Chat',
    'nav.menu': 'Valikko',
    'nav.lang': 'Kieli',
    'hero.title': 'Full-stack-järjestelmät, rakennettu ja ylläpidetty tekoälyllä.',
    'hero.sub': 'Verkkosivut, SaaS-alustat, taustainfrastruktuuri, AI-agentit. Yksi studio.',
    'skip': 'Siirry sisältöön',
  },

  sv: {
    'nav.work': 'Arbete',
    'nav.about': 'Studio',
    'nav.chat': 'Chatt',
    'nav.menu': 'Meny',
    'nav.lang': 'Språk',
    'hero.title': 'Full-stack-system, byggda och drivna av AI.',
    'hero.sub': 'Webbplatser, SaaS-plattformar, backend-infrastruktur, AI-agenter. En studio.',
    'skip': 'Hoppa till innehåll',
  },

  fr: {
    'nav.work': 'Projets',
    'nav.about': 'Studio',
    'nav.chat': 'Chat',
    'nav.menu': 'Menu',
    'nav.lang': 'Langue',
    'hero.title': "Systèmes full-stack, construits et opérés par l'IA.",
    'hero.sub': "Sites web, plateformes SaaS, infrastructure backend, agents IA. Un seul studio.",
    'skip': 'Aller au contenu',
  },

  it: {
    'nav.work': 'Lavori',
    'nav.about': 'Studio',
    'nav.chat': 'Chat',
    'nav.menu': 'Menu',
    'nav.lang': 'Lingua',
    'hero.title': "Sistemi full-stack, costruiti e gestiti con l'IA.",
    'hero.sub': 'Siti web, piattaforme SaaS, infrastruttura backend, agenti IA. Uno studio.',
    'skip': 'Vai al contenuto',
  },

  uk: {
    'nav.work': 'Роботи',
    'nav.about': 'Студія',
    'nav.chat': 'Чат',
    'nav.menu': 'Меню',
    'nav.lang': 'Мова',
    'hero.title': 'Повностекові системи, побудовані та керовані ШІ.',
    'hero.sub': 'Сайти, SaaS-платформи, бекенд-інфраструктура, AI-агенти. Одна студія.',
    'skip': 'Перейти до вмісту',
  },

  ru: {
    'nav.work': 'Работы',
    'nav.about': 'Студия',
    'nav.chat': 'Чат',
    'nav.menu': 'Меню',
    'nav.lang': 'Язык',
    'hero.title': 'Полные системы, построенные и управляемые ИИ.',
    'hero.sub': 'Сайты, SaaS-платформы, бэкенд-инфраструктура, ИИ-агенты. Одна студия.',
    'skip': 'Перейти к содержимому',
  },
};

export function t(lang: Lang, key: string): string {
  return dict[lang]?.[key] ?? dict.en[key] ?? key;
}

const STORAGE_KEY = 'gostudio-lang';
const LOCALE_PREFIXES = ['de', 'et', 'fi', 'sv', 'fr', 'it', 'uk', 'ru'] as const;
const PREFIX_RE = /^\/(de|et|fi|sv|fr|it|uk|ru)(\/|$)/;

export function detectLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
  if (stored && stored in languages) return stored;
  const browser = navigator.language?.split('-')[0];
  if (browser && browser in languages) return browser as Lang;
  return 'en';
}

export function setLang(lang: Lang) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, lang);
  }
}

export { LOCALE_PREFIXES, PREFIX_RE };
