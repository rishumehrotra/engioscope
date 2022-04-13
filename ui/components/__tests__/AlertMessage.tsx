import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AlertMessage from '../common/AlertMessage';

describe('Alert Message', () => {
  it('should render the message passed', () => {
    const message = 'This is an alert message';
    render(<AlertMessage message={message} />);
    expect(screen.findByText(message)).toBeTruthy();
  });

  it('should render an alert message with an alert pill and appropriate styles', () => {
    const { asFragment } = render(<AlertMessage message="This is an alert message" />);
    expect(asFragment()).toMatchSnapshot();
  });
});
