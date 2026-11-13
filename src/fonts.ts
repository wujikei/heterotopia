let warmed = false;
export function warmReadingFonts(): void {
  if (warmed) return;
  warmed = true;
  // "丁" belongs to the body range; the browser keeps the UI subset in use.
  void Promise.allSettled([
    document.fonts.load('400 22px StorySerif', '丁'),
    document.fonts.load('600 22px StorySerif', '丁'),
    document.fonts.load('400 22px StoryHand', '水声还在，慢慢说。'),
  ]);
}
