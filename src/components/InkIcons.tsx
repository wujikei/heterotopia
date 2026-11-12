import type { ReactNode } from 'react';

/**
 * 水墨笔触图标：统一 24 网格、圆头描边，与 BoatMark / BoneMark 同一套手绘语言。
 * 只负责装饰，按钮本身要带可见文字或 aria-label。
 */
function Ink({ children, size = 18, className = '' }: { children: ReactNode; size?: number; className?: string }) {
  return <svg className={`ink-icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}

type IconProps = { size?: number; className?: string };

/** 回看：一道折返的水波 */
export const InkBacklog = (p: IconProps) => <Ink {...p}><path d="M9.5 5.5 5.5 9l4 3.5" /><path d="M6 9h8.2c2.7 0 4.8 2 4.8 4.6s-2.1 4.6-4.8 4.6H8" /><path d="M4.5 21c1.2-.7 2.3-.7 3.5 0s2.3.7 3.5 0" opacity=".55" /></Ink>;

/** 自动：一盏提灯；lit 时灯芯点亮 */
export const InkLamp = ({ lit = false, ...p }: IconProps & { lit?: boolean }) => <Ink {...p}><path d="M12 2.5v2M9.5 4.5h5" /><path d="M8 8.2c0-2 1.6-3.7 3.6-3.7h.8c2 0 3.6 1.7 3.6 3.7v6.6c0 2-1.6 3.7-3.6 3.7h-.8c-2 0-3.6-1.7-3.6-3.7Z" /><path d="M8.3 9.5h7.4M8.3 13.5h7.4" opacity=".45" /><path d="M12 18.5V21M10 21.5h4" /><path d="M12 9.7c1 1 1.3 1.8.9 2.6-.3.6-1.5.6-1.8 0-.4-.8-.1-1.6.9-2.6Z" fill={lit ? 'currentColor' : 'none'} /></Ink>;

/** 快进：两道顺流的浪 */
export const InkFlow = (p: IconProps) => <Ink {...p}><path d="M4.5 6c2.6 2 4.2 3.8 5.5 6-1.3 2.2-2.9 4-5.5 6" /><path d="M11.5 6c2.6 2 4.2 3.8 5.5 6-1.3 2.2-2.9 4-5.5 6" /><path d="M19.5 7.5v9" opacity=".5" /></Ink>;

/** 存档：系着流苏的书签 */
export const InkBookmark = (p: IconProps) => <Ink {...p}><path d="M7 3.5h10v14.5l-5-3.4-5 3.4Z" /><path d="M12 14.6v6.4M10.6 21.3h2.8" opacity=".6" /><path d="M9.5 7h5" opacity=".45" /></Ink>;

/** 读档：摊开的书卷 */
export const InkScroll = (p: IconProps) => <Ink {...p}><path d="M3.5 6.5c2.8-1.6 5.7-1.6 8.5 0 2.8-1.6 5.7-1.6 8.5 0v12c-2.8-1.6-5.7-1.6-8.5 0-2.8-1.6-5.7-1.6-8.5 0Z" /><path d="M12 6.5v12" /><path d="M6 10c1.3-.4 2.7-.4 4 0M14 10c1.3-.4 2.7-.4 4 0" opacity=".45" /></Ink>;

/** 设置：三道风，挂着小灯 */
export const InkWind = (p: IconProps) => <Ink {...p}><path d="M3.5 7h17M3.5 12h17M3.5 17h17" opacity=".55" /><circle cx="15" cy="7" r="1.9" fill="var(--icon-fill, transparent)" /><circle cx="8.5" cy="12" r="1.9" fill="var(--icon-fill, transparent)" /><circle cx="13" cy="17" r="1.9" fill="var(--icon-fill, transparent)" /></Ink>;

/** 隐藏：合上的眼与睫 */
export const InkClosedEye = (p: IconProps) => <Ink {...p}><path d="M3.5 10.5c2.4 3.3 5.2 5 8.5 5s6.1-1.7 8.5-5" /><path d="M6.2 14.2 4.8 16M12 15.6v2.4M17.8 14.2l1.4 1.8" /></Ink>;

/** 更多：三点墨 */
export const InkMore = ({ open = false, ...p }: IconProps & { open?: boolean }) => <Ink {...p}>{open ? <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /> : <><circle cx="5.5" cy="12" r="1.25" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" /><circle cx="18.5" cy="12" r="1.25" fill="currentColor" stroke="none" /></>}</Ink>;

/** 菜单：三笔长短不一的墨 */
export const InkMenu = (p: IconProps) => <Ink {...p}><path d="M4 7c5.3-.9 10.7-.9 16 0" /><path d="M4 12.2c3.8-.6 8-.6 11.5 0" /><path d="M4 17.3c5.3-.9 10.7-.9 16 0" /></Ink>;

/** 声音：一枚铜铃；muted 时铃舌静止并划去 */
export const InkBell = ({ muted = false, ...p }: IconProps & { muted?: boolean }) => <Ink {...p}><path d="M12 2.8v1.6" /><path d="M12 4.4c-3 0-5 2.4-5 5.4v4.1L5.4 16.6h13.2L17 13.9V9.8c0-3-2-5.4-5-5.4Z" /><path d="M10.4 19.2a1.7 1.7 0 0 0 3.2 0" />{muted ? <path d="M4 4l16 16" /> : <path d="M20.2 8.2c.9 1.4.9 3.7 0 5.1M3.8 8.2c-.9 1.4-.9 3.7 0 5.1" opacity=".55" />}</Ink>;

/** 全屏：画框四角 */
export const InkFrame = (p: IconProps) => <Ink {...p}><path d="M4 9V4.5h4.5M15.5 4.5H20V9M20 15v4.5h-4.5M8.5 19.5H4V15" /></Ink>;

/** 行迹：一条蜿蜒的水路 */
export const InkPath = (p: IconProps) => <Ink {...p}><path d="M7 3c0 3.8 10 3.6 10 8.6S7 16.4 7 21" /><circle cx="17" cy="11.6" r="1.4" fill="currentColor" stroke="none" opacity=".75" /></Ink>;

/** 人物志：一个侧影 */
export const InkFigure = (p: IconProps) => <Ink {...p}><path d="M12 3.8a2.7 2.7 0 1 1 0 5.4 2.7 2.7 0 0 1 0-5.4Z" /><path d="M6 20.5c.6-4.8 3-7.9 6-7.9s5.4 3.1 6 7.9" /><path d="M4 20.5h16" opacity=".45" /></Ink>;

/** 浮生绘卷：远山与月 */
export const InkMountain = (p: IconProps) => <Ink {...p}><path d="M2.8 19 9 10.5l3.6 4.7 2.8-3.2L21.2 19Z" /><path d="M17.2 4.8a2.3 2.3 0 1 0 1.9 3.6 2.4 2.4 0 0 1-1.9-3.6Z" /></Ink>;

/** 旅人手记：一支笔 */
export const InkBrush = (p: IconProps) => <Ink {...p}><path d="M19.5 3.5 10 13" /><path d="M10 13c-2.2-.3-3.8 1-4.2 3-.3 1.8-1 3-2.3 3.8 3 .7 6.2.1 7.4-2 .8-1.5.6-3.3-.9-4.8Z" /></Ink>;

/** 听水集：一滴水 */
export const InkDrop = (p: IconProps) => <Ink {...p}><path d="M12 3.2c3.2 4.1 5.3 7 5.3 10a5.3 5.3 0 0 1-10.6 0c0-3 2.1-5.9 5.3-10Z" /><path d="M9.6 14.2c.2 1.3 1.1 2.2 2.4 2.4" opacity=".55" /></Ink>;

/** 回到标题：船头调转 */
export const InkReturn = (p: IconProps) => <Ink {...p}><path d="M4 15.5c4.6 3.3 11.4 3.3 16 0" /><path d="M8.5 8.5 4.5 12l4 3.5" /><path d="M4.8 12h9.4" /></Ink>;
