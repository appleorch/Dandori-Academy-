import { useEffect, useState } from 'react';

/**
 * True on phones and tablets. Starts from the device's primary pointer and also
 * switches on at the first real touch, which covers touch-screen laptops.
 */
export function useTouchDevice(): boolean {
  const [touch, setTouch] = useState(() => window.matchMedia('(pointer: coarse)').matches);

  useEffect(() => {
    if (touch) return;
    const onTouch = (): void => setTouch(true);
    window.addEventListener('touchstart', onTouch, { once: true, passive: true });
    return () => window.removeEventListener('touchstart', onTouch);
  }, [touch]);

  return touch;
}
