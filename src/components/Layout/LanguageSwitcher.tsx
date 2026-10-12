import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown } from 'lucide-react';

interface Language {
  code: 'en' | 'mr';
  name: string;
  nativeName: string;
}

const DEFAULT_LANGUAGE: Language = { code: 'en', name: 'English', nativeName: 'English' };
const languages: Language[] = [
  DEFAULT_LANGUAGE,
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
];

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const activeCode = (i18n.language || 'en').split('-')[0];
  const currentLanguage: Language =
    languages.find(lang => lang.code === activeCode) ?? DEFAULT_LANGUAGE;

  const handleLanguageChange = (languageCode: Language['code']) => {
    void i18n.changeLanguage(languageCode);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        aria-label="Change language"
      >
        <Globe className="w-4 h-4" />
        <span>{currentLanguage.nativeName}</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-[100]">
          <div className="py-1">
            {languages.map(language => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center justify-between ${
                  activeCode === language.code
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700'
                }`}
              >
                <div>
                  <div className="font-medium">{language.nativeName}</div>
                  <div className="text-xs text-gray-500">{language.name}</div>
                </div>
                {activeCode === language.code && (
                  <Check className="w-4 h-4 text-blue-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default LanguageSwitcher;
