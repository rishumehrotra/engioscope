import type { ReactNode } from 'react';
import React, { useCallback, useState } from 'react';
import { X } from 'react-feather';
import ReactModal from 'react-modal';

type Modal2Props = {
  close: () => void;
  isOpen: boolean;
  heading?: ReactNode;
  children?: ReactNode;
  className?: string;
};

const Modal2: React.FC<Modal2Props> = ({
  isOpen,
  close,
  children,
  heading,
  className,
}) => (
  <ReactModal
    isOpen={isOpen}
    onRequestClose={close}
    overlayClassName="fixed z-20 top-0 left-0 right-0 bottom-0 bg-black bg-opacity-40"
    className={`relative z-30 bg-white outline-none rounded-lg shadow-2xl m-auto grid grid-flow-row grid-rows-[max-content_1fr] ${className} max-h-full`}
    style={{
      content: {
        height: '70%',
      },
    }}
    bodyOpenClassName="overflow-hidden"
    preventScroll
  >
    <header className="grid grid-flow-col grid-cols-[1fr_30px] pl-6 pr-3 py-4 items-center border-b border-theme-seperator">
      <h1 className="text-xl font-medium">{heading}</h1>

      <button onClick={close} className="text-theme-icon">
        <X size={24} />
      </button>
    </header>
    {children}
  </ReactModal>
);

export const useModal2 = () => {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    setIsOpen(true);
  }, [setIsOpen]);
  const close = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  const modalProps = {
    close,
    isOpen,
  };

  return [Modal2, modalProps, open, isOpen, close] as const;
};
