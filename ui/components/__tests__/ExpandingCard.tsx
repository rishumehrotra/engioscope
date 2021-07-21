import React from 'react';
import { render } from '@testing-library/react';
import ExpandingCard, { CardProps } from '../ExpandingCard';

const expandingCardProps : CardProps = {
  title: 'repo name',
  subtitle: 'languange: javascript',
  tabs: [
    {
      title: 'tab1',
      count: 12,
      content: <div>tab1</div>
    }
  ]
};

describe('Expanding card', () => {
  it('renders the card title and top level tabs by default', () => {
    const card = render(<ExpandingCard {...expandingCardProps} />);
    expect(card).not.toBeNull();
  });

  // it('highlights first tab, and shows its content, when the global area of the card is clicked', {

  // });

  // it('removes highlight of the first tab and hides the content of first tab, when the global area of the card is clicked', {

  // });

  // it('highlights the tab and opens up the tab content, when a particular tab is clicked', () => {

  // });

  // it('removes highlight of the first tab and hides the content of first tab, when a particular tab is clicked', () => {

  // });
});
