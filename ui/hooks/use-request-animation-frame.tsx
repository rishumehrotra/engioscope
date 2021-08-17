import { useCallback, useEffect, useRef } from 'react';

export default (animation: () => void) => {
  const rafRef = useRef<number | null>(null);

  const rafCallback = useCallback(() => {
    animation();
    rafRef.current = requestAnimationFrame(rafCallback);
  }, [animation]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(rafCallback);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return () => cancelAnimationFrame(rafRef.current!);
  }, [animation, rafCallback]);
};
