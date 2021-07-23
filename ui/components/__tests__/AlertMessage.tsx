import React from 'react';
import { render } from '@testing-library/react';
import AlertMessage from '../AlertMessage';

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

  it('should not render when no message is passed', () => {
    const { asFragment } = render(<AlertMessage />);
    expect(asFragment()).toMatchSnapshot();
  });
});
