import { useEffect, useState } from 'react';
import { getCurrentTheme } from '../utils/theme';

export function useDarkMode(): boolean {
  const [isDark, setIsDark] = useState(() => getCurrentTheme() === 'dark');

  useEffect(() => {
    const observer = new MutationObserver(() => setIsDark(getCurrentTheme() === 'dark'));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}
