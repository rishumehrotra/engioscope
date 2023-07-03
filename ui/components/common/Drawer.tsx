import React from 'react';
import type { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';
import { Close, Download } from './Icons.jsx';
import type { DialogProps } from '../../hooks/dialog-hooks.jsx';
import { createDialogHook, useDialogWithBackdrop } from '../../hooks/dialog-hooks.jsx';

type DrawerProps = DialogProps & {
  heading?: ReactNode;
  children?: ReactNode;
  downloadUrl?: string;
};

const Drawer: React.FC<DrawerProps> = ({
  children,
  isOpen = false,
  close,
  heading,
  downloadUrl,
  onClosed,
}) => {
  const { dialogProps, mountDialog, dialogClassName } = useDialogWithBackdrop({
    isOpen,
    onClosed,
    onOpenStart: dialog => {
      setTimeout(() => {
        dialog.classList.remove('translate-x-full');
        dialog.classList.remove('translate-x-0');
      }, 0);
    },
    onCloseStart: dialog => {
      dialog.classList.add('translate-x-full');
      dialog.classList.add('translate-x-0');
    },
  });

  if (!mountDialog) return null;

  return (
    <dialog
      {...dialogProps}
      className={twMerge(
        dialogClassName,
        'w-[700px] max-w-[80%] h-screen max-h-screen m-0',
        'translate-x-full duration-200 p-0',
        'grid grid-flow-row grid-rows-[auto_1fr]'
      )}
      style={{ inset: 'unset', top: 0, right: 0 }}
    >
      <div
        className={[
          'max-h-screen grid grid-flow-col grid-cols-[1fr_min-content_min-content]',
          'pl-4 pr-2 py-3 border-b border-theme-seperator items-center',
        ].join(' ')}
      >
        <h1 className="font-semibold text-xl">{heading}</h1>
        <div>
          {downloadUrl ? (
            <a
              href={downloadUrl}
              download
              className="inline-flex items-center link-text p-2 text-sm font-medium whitespace-nowrap"
            >
              <Download className="inline-block mr-2" />
              Download XLSX
            </a>
          ) : null}
        </div>
        <button onClick={close} className="p-2 self-start">
          <Close />
        </button>
      </div>
      <div className="overflow-y-auto">{children}</div>
    </dialog>
  );
};

export const useDrawer = createDialogHook(Drawer);
