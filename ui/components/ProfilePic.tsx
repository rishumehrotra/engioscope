import React, { useState } from 'react';
import type { ImgHTMLAttributes } from 'react';
import defaultProfilePic from '../default-profile-pic.png';

export const ProfilePic: React.FC<ImgHTMLAttributes<HTMLImageElement>> = ({ src, ...rest }) => {
  const [actualSrc, setActualSrc] = useState(src || defaultProfilePic);
  const onError = () => setActualSrc(defaultProfilePic);

  // eslint-disable-next-line jsx-a11y/alt-text
  return <img src={actualSrc} onError={onError} {...rest} />;
};
