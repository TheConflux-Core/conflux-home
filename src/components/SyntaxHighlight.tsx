import { useEffect, useRef } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-markup'; // HTML
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-json';

interface SyntaxHighlightProps {
  code: string;
  language: string; // 'html' | 'jsx' | 'css' | 'javascript' | 'tsx'
  className?: string;
}

const LANG_MAP: Record<string, string> = {
  html: 'markup',
  jsx: 'jsx',
  tsx: 'tsx',
  css: 'css',
  javascript: 'javascript',
  js: 'javascript',
  json: 'json',
};

export default function SyntaxHighlight({ code, language, className = '' }: SyntaxHighlightProps) {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      const prismLang = LANG_MAP[language] || 'markup';
      const grammar = Prism.languages[prismLang];
      if (grammar) {
        codeRef.current.innerHTML = Prism.highlight(code, grammar, prismLang);
      } else {
        codeRef.current.textContent = code;
      }
    }
  }, [code, language]);

  return (
    <pre className={`syntax-highlight-pre ${className}`}>
      <code ref={codeRef} className={`language-${LANG_MAP[language] || 'markup'}`}>
        {code}
      </code>
    </pre>
  );
}
