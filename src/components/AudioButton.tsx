import { useRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';

type AudioButtonProps = Omit<ComponentPropsWithoutRef<'button'>, 'onClick' | 'onPointerDown' | 'onPointerCancel' | 'onKeyDown' | 'onBlur'> & { onClick: () => void };

/** Preserve the action the user pressed, even if unlocking rerenders before click. */
export function AudioButton({ onClick, ...props }: AudioButtonProps) {
  const pressed = useRef<(() => void) | null>(null);
  const clear = () => { pressed.current = null; };
  return <button {...props} data-audio-control onPointerDown={() => { pressed.current = onClick; }} onKeyDown={event => {
    if (!event.repeat && (event.key === ' ' || event.key === 'Enter')) pressed.current = onClick;
  }} onPointerCancel={clear} onBlur={clear} onClick={() => {
    const action = pressed.current ?? onClick;
    clear();
    action();
  }} />;
}
