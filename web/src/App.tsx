import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { Toast } from './components/Toast';
import { LanguagePicker } from './pages/LanguagePicker';
import { Game } from './pages/Game';
import { Stats } from './pages/Stats';
import { useI18nStore } from './stores/i18nStore';
import { i18n } from './i18n';

export function App() {
  const uiLang = useI18nStore((s) => s.uiLang);
  const location = useLocation();

  useEffect(() => {
    if (i18n.language !== uiLang) void i18n.changeLanguage(uiLang);
  }, [uiLang]);

  const showHeader = location.pathname !== '/';

  return (
    <div className="min-h-full flex flex-col mx-auto max-w-md">
      {showHeader && <Header />}
      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<LanguagePicker />} />
          <Route path="/play" element={<Game />} />
          <Route path="/stats" element={<Stats />} />
        </Routes>
      </main>
      <Toast />
    </div>
  );
}
