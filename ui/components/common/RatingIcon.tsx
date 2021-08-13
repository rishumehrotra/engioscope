import React from 'react';
import { Done, Alert, Danger } from './Icons';

type RatingIconProps = {
  rating: number;
};

const RatingIcon: React.FC<RatingIconProps> = ({ rating }) => {
  if (rating >= 0 && rating < 50) {
    return <Danger />;
  } if (rating > 50 && rating < 75) {
    return <Alert />;
  }
  return <Done />;
};

export default RatingIcon;
