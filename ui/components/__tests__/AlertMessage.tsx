import React from 'react';
import { render } from '@testing-library/react';
import AlertMessage from '../common/AlertMessage';

describe('Alert Message', () => {
  it('should render the message passed', () => {
    const message = 'This is an alert message';
    const alert = render(<AlertMessage message={message} />);
    expect(alert.findByText(message)).toBeTruthy();
  });

  it('should render an alert message with an alert pill and appropriate styles', () => {
    const { asFragment } = render(<AlertMessage message="This is an alert message" />);
    expect(asFragment()).toMatchSnapshot();
  });
});
