import type { ReactNode } from 'react';
import React, { useCallback, useState } from 'react';
import ReactModal from 'react-modal';

type ModalProps = {
  close: () => void;
  isOpen: boolean;
  heading?: ReactNode;
};

const Modal: React.FC<ModalProps> = ({
  isOpen, close, children, heading
}) => (
  <ReactModal
    isOpen={isOpen}
    onRequestClose={close}
    overlayClassName="fixed z-20 top-0 left-0 right-0 bottom-0 bg-black bg-opacity-40"
    className="relative z-30 top-0 left-0 right-0 bottom-0 max-h-full m-36 bg-white outline-none rounded-3xl"
    style={{
      content: {
        height: '70%'
      }
    }}
    bodyOpenClassName="overflow-hidden"
    preventScroll
  >
    <header className="absolute top-0 left-0 right-0 h-20 p-10">
      <h1 className="text-4xl font-semibold pb-8">
        {heading}
      </h1>

      <button onClick={close} className="absolute top-4 right-6 p-3 uppercase text-sm tracking-wide">
        Close
      </button>
    </header>
    <div className="absolute top-28 left-0 right-0 bottom-10 overflow-y-auto px-10">
      {children}
    </div>
  </ReactModal>
);

export const useModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => { setIsOpen(true); }, [setIsOpen]);
  const close = useCallback(() => { setIsOpen(false); }, [setIsOpen]);

  const modalProps = {
    close,
    isOpen
  };

  return [Modal, modalProps, open, isOpen, close] as const;
};

export const modalHeading = (heading: ReactNode, subheading?: ReactNode) => (
  <>
    {heading}
    <span className="text-lg font-semibold pl-2">
      {subheading}
    </span>
  </>
);
