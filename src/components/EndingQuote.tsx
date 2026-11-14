import { t, useLocale } from '../i18n';
/** Break Latin quotes at a word boundary; keep CJK closing punctuation together. */
export function EndingQuote({ text }: { text: string }) {
  const language = useLocale();
  const localized = t(text);
  if (language === 'en' || language === 'de') {
    const words = localized.match(/^(.*\s)(\S+\s+\S+)$/s);
    return <blockquote>{words?.[1] ?? ''}<span className="ending-quote-tail">{words?.[2] ?? localized}</span></blockquote>;
  }
  const characters = Array.from(localized);
  return <blockquote>{characters.slice(0, -4).join('')}<span className="ending-quote-tail">{characters.slice(-4).join('')}</span></blockquote>;
}
