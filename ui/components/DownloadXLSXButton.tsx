import React from 'react';
import { Download } from 'react-feather';

type DownloadXLSXButtonProps = {
  href: string;
};

const DownloadXLSXButton = ({ href }: DownloadXLSXButtonProps) => {
  return (
    <a
      href={href}
      download
      className="inline-flex items-center link-text p-2 text-sm font-medium"
    >
      <Download size={16} className="inline-block mr-2" />
      <span>Download XLSX</span>
    </a>
  );
};

export default DownloadXLSXButton;
