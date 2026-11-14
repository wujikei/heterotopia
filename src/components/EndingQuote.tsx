/** Keep the last few characters together without changing the authored quote. */
export function EndingQuote({ text }: { text: string }) {
  const characters = Array.from(text);
  return <blockquote>{characters.slice(0, -4).join('')}<span className="ending-quote-tail">{characters.slice(-4).join('')}</span></blockquote>;
}
