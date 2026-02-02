'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { LANGUAGES } from '@/types';

export function LanguageSelector() {
  const { currentLanguage, setCurrentLanguage } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES.find(l => l.code === currentLanguage)!;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#241b2f] border border-purple-500/20 hover:border-purple-500/40 transition-colors"
      >
        <span className="text-lg">{currentLang.flag}</span>
        <span className="text-sm text-zinc-300">{currentLang.name}</span>
        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-40 bg-[#241b2f] border border-purple-500/20 rounded-lg overflow-hidden z-50 shadow-xl">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setCurrentLanguage(lang.code);
                setIsOpen(false);
              }}
              className={`
                w-full flex items-center gap-2 px-3 py-2 text-left transition-colors
                ${currentLanguage === lang.code 
                  ? 'bg-purple-500/20 text-white' 
                  : 'text-zinc-400 hover:bg-purple-500/10 hover:text-white'
                }
              `}
            >
              <span className="text-lg">{lang.flag}</span>
              <span className="text-sm">{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
