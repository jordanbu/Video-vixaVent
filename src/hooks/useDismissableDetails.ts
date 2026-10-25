import { useEffect, type RefObject } from 'react';

/**
 * Close a <details> dropdown on Escape or on a pointer press outside it.
 *
 * Blur alone is not enough: a press on a non-focusable surface (timeline, preview)
 * or opening another menu can leave the dropdown open underneath the new one.
 */
export function useDismissableDetails(ref: RefObject<HTMLDetailsElement | null>): void {
  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const details = ref.current;
      if (details?.open && event.target instanceof Node && !details.contains(event.target)) details.open = false;
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      const details = ref.current;
      if (event.key === 'Escape' && details?.open) details.open = false;
    };
    // Capture phase: a surface that stops propagation must still close the menu.
    document.addEventListener('pointerdown', closeOnOutsidePointer, true);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer, true);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [ref]);
}
