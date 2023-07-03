import React from 'react';
import type { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';
import { X } from 'react-feather';
import type { DialogProps } from '../../hooks/dialog-hooks.jsx';
import { createDialogHook, useDialogWithBackdrop } from '../../hooks/dialog-hooks.jsx';

type ModalProps = DialogProps & {
  heading?: ReactNode;
  subheading?: ReactNode;
  children?: ReactNode;
  className?: string;
};

const Modal: React.FC<ModalProps> = ({
  isOpen = false,
  close,
  heading,
  subheading,
  children,
  className,
  onClosed,
}) => {
  const { dialogProps, mountDialog, dialogClassName } = useDialogWithBackdrop({
    isOpen,
    onClosed,
    onOpenStart: dialog => {
      setTimeout(() => {
        dialog.classList.add('opacity-100');
        dialog.classList.add('translate-y-0');
      }, 0);
    },
    onCloseStart: dialog => {
      dialog.classList.remove('translate-y-0');
      dialog.classList.remove('opacity-100');
    },
  });

  if (!mountDialog) return null;

  return (
    <dialog
      {...dialogProps}
      className={twMerge(
        dialogClassName,
        `rounded-lg shadow-2xl m-auto p-0 -translate-y-10 opacity-0 transition-[opacity,transform]`,
        'grid grid-flow-row grid-rows-[max-content_1fr] h-full',
        className
      )}
    >
      <header className="grid grid-flow-col grid-cols-[1fr_30px] pl-6 pr-3 py-4 items-start border-b border-theme-seperator">
        <div>
          <h1 className="text-xl font-medium">{heading}</h1>
          {subheading ? (
            <div className="col-span-2 text-theme-helptext text-sm">{subheading}</div>
          ) : null}
        </div>

        <button onClick={close} className="text-theme-icon">
          <X size={24} />
        </button>
      </header>
      {children}
    </dialog>
  );
};

export const useModal = createDialogHook(Modal);
