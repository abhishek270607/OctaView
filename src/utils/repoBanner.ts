import bannerJs from '../assets/images/banner_javascript_web_1795408587190.jpg';
import bannerTs from '../assets/images/banner_typescript_systems_1795408596273.jpg';
import bannerPy from '../assets/images/banner_python_ai_1795408592834.jpg';
import bannerSystems from '../assets/images/banner_rust_systems_1795408601285.jpg';
import bannerUniversal from '../assets/images/banner_tech_universal_1795408584943.jpg';

export interface RepoBannerTheme {
  src: string;
  themeLabel: string;
  eyebrow: string;
  accentDotClass: string;
  fallbackGradient: string;
  alt: string;
}

export function resolveRepoBanner(repo: {
  full_name: string;
  language?: string | null;
  topics?: string[];
}): RepoBannerTheme {
  const lang = (repo.language || '').toLowerCase().trim();
  const fullName = (repo.full_name || '').toLowerCase();
  const topicsStr = (repo.topics || []).join(' ').toLowerCase();
  const combined = `${lang} ${fullName} ${topicsStr}`;

  // 1. TypeScript / UI / CSS / Frontend Frameworks
  if (
    lang === 'typescript' ||
    lang === 'css' ||
    lang === 'scss' ||
    lang === 'html' ||
    lang === 'vue' ||
    lang === 'svelte' ||
    lang === 'astro' ||
    /\b(typescript|tailwind|shadcn|nextjs|next\.js|vscode|radix|svelte|angular|vite)\b/.test(combined)
  ) {
    return {
      src: bannerTs,
      themeLabel: repo.language ? `${repo.language} Architecture` : 'Interface & Type Systems',
      eyebrow: 'Type-Safe Engineering',
      accentDotClass: 'bg-sky-400',
      fallbackGradient: 'from-[#0B1221] via-[#0F1B33] to-[#090D16]',
      alt: `Stylized architectural tech header banner for ${repo.full_name} (${repo.language || 'TypeScript'})`,
    };
  }

  // 2. JavaScript / Node / Web Runtime
  if (
    lang === 'javascript' ||
    lang === 'coffeescript' ||
    /\b(javascript|express|nodejs|node|react|webpack|babel|npm|eslint)\b/.test(combined)
  ) {
    return {
      src: bannerJs,
      themeLabel: repo.language ? `${repo.language} Runtime` : 'Web & Runtime Engineering',
      eyebrow: 'Runtime Architecture',
      accentDotClass: 'bg-amber-400',
      fallbackGradient: 'from-[#12110E] via-[#1B1710] to-[#090D16]',
      alt: `Stylized architectural tech header banner for ${repo.full_name} (${repo.language || 'JavaScript'})`,
    };
  }

  // 3. Python / AI / Data Science
  if (
    lang === 'python' ||
    lang === 'jupyter notebook' ||
    lang === 'r' ||
    lang === 'julia' ||
    /\b(python|pytorch|tensorflow|scikit|pandas|numpy|fastapi|django|flask|langchain|llm|machine-learning|deep-learning)\b/.test(
      combined
    )
  ) {
    return {
      src: bannerPy,
      themeLabel: repo.language ? `${repo.language} Intelligence` : 'Data & Scientific Computing',
      eyebrow: 'Computational Architecture',
      accentDotClass: 'bg-emerald-400',
      fallbackGradient: 'from-[#0A1416] via-[#0E1E22] to-[#090D16]',
      alt: `Stylized architectural tech header banner for ${repo.full_name} (${repo.language || 'Python'})`,
    };
  }

  // 4. Rust / Go / C / C++ / Low-Level Systems
  if (
    lang === 'rust' ||
    lang === 'go' ||
    lang === 'c' ||
    lang === 'c++' ||
    lang === 'zig' ||
    lang === 'assembly' ||
    lang === 'cuda' ||
    /\b(rust|deno|golang|linux|kernel|zig|llvm|docker|kubernetes|redis|postgres|sqlite)\b/.test(combined)
  ) {
    return {
      src: bannerSystems,
      themeLabel: repo.language ? `${repo.language} Systems` : 'Core Systems Engineering',
      eyebrow: 'Systems Architecture',
      accentDotClass: 'bg-orange-400',
      fallbackGradient: 'from-[#141110] via-[#1D1612] to-[#090D16]',
      alt: `Stylized architectural tech header banner for ${repo.full_name} (${repo.language || 'Systems'})`,
    };
  }

  // 5. Universal Architectural Tech Fallback
  return {
    src: bannerUniversal,
    themeLabel: repo.language ? `${repo.language} Codebase` : 'Repository Architecture',
    eyebrow: 'Code Intelligence',
    accentDotClass: 'bg-slate-300',
    fallbackGradient: 'from-[#0C111E] via-[#121A2D] to-[#090D16]',
    alt: `Stylized architectural tech header banner for ${repo.full_name}`,
  };
}
