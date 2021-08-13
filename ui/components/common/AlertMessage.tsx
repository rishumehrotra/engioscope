import React from 'react';

type AlertMessageProps = {
  message: string;
  type?: 'alert' | 'info';
};

const AlertMessage: React.FC<AlertMessageProps> = ({ message, type = 'info' }) => (message ? (
  <div className="flex justify-center text-center items-center text-gray-600">
    <span className="flex items-center text-xs rounded-full py-1 px-2 mr-2 bg-white">
      <span
        className={`rounded-full w-3 h-3 inline-block ${type === 'alert' ? 'bg-red-400' : 'bg-purple-500'}`}
      />
      <span className="ml-1">
        {type.toUpperCase()}
      </span>
    </span>
    <span className="text-sm">{message}</span>
  </div>
) : null);

export default AlertMessage;
