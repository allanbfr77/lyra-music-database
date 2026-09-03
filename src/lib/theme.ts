export type Theme = 'dark' | 'light';

/** Tema padrão do site. */
export const DEFAULT_THEME: Theme = 'dark';

export const THEME_STORAGE_KEY = 'lyra-theme';

/** Cor da barra do navegador (meta theme-color) em cada tema. */
export const THEME_COLOR: Record<Theme, string> = {
  dark: '#0a0a0c',
  light: '#ffffff',
};

/**
 * Executado antes da primeira pintura: aplica o tema salvo no <html> para não
 * haver "flash" do tema errado ao carregar a página.
 */
export const THEME_INIT_SCRIPT =
  `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');` +
  `if(t!=='light'&&t!=='dark')t='${DEFAULT_THEME}';` +
  `document.documentElement.setAttribute('data-theme',t);` +
  `var m=document.querySelector('meta[name="theme-color"]');` +
  `if(m)m.setAttribute('content',t==='light'?'${THEME_COLOR.light}':'${THEME_COLOR.dark}');` +
  `}catch(e){}})();`;
