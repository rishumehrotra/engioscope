import React from 'react';

const AlertMessage: React.FC<{message: string}> = ({ message }) => (message ? (
  <div className="flex justify-center text-center items-center text-gray-600">
    <span className="flex items-center text-xs rounded-full py-1 px-2 mr-2 bg-white">
      <span className="rounded-full w-3 h-3 inline-block" style={{ backgroundColor: 'rgb(255, 90, 3)' }}> </span>
      <span className="ml-1">
        ALERT
      </span>
    </span>
    <span className="text-sm">{message}</span>
  </div>
) : null);

export default AlertMessage;
