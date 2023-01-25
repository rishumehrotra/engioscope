import { useEffect, useRef, useState } from 'react';

const useHover = <T extends HTMLElement>() => {
  const [value, setValue] = useState<boolean>(false);
  const ref = useRef<T | null>(null);
  const handleMouseOver = (): void => setValue(true);
  const handleMouseOut = (): void => setValue(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    node.addEventListener('mouseover', handleMouseOver);
    node.addEventListener('mouseout', handleMouseOut);

    return () => {
      node.removeEventListener('mouseover', handleMouseOver);
      node.removeEventListener('mouseout', handleMouseOut);
    };
  }, []);

  return [ref, value] as const;
};

export default useHover;
