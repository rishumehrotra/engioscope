import { useRef, useState } from 'react';
import useOnClickOutside from './on-click-outside.js';

const usePopover = () => {
  const ref = useRef(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  useOnClickOutside(ref, () => setIsOpen(false));

  return [ref, isOpen, setIsOpen] as const;
};

export default usePopover;
