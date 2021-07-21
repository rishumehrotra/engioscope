import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import ExpandingCard, { CardProps } from '../ExpandingCard';

const expandingCardProps : CardProps = {
  title: 'repo name',
  subtitle: 'languange: javascript',
  tabs: [
    {
      title: 'tab1',
      count: 12,
      content: <div>content1</div>
    },
    {
      title: 'tab2',
      count: 15,
      content: <div>content2</div>
    }
  ]
};

describe('Expanding card', () => {
  const activeTabClass = 'bg-gray-100';
  it('renders the card title and top level tabs by default', async () => {
    const card = render(<ExpandingCard {...expandingCardProps} />);
    expect(card).not.toBeNull();
    expect(await card.findByText(expandingCardProps.title)).toBeTruthy();
    expect(await card.findByText(expandingCardProps.subtitle!)).toBeTruthy();
    expect(await card.findByText(expandingCardProps.tabs[0].title)).toBeTruthy();
  });

  it('does not select any tab by default', async () => {
    const card = render(<ExpandingCard {...expandingCardProps} />);
    expect(await card.findByText(expandingCardProps.tabs[0].title)).not.toHaveClass(activeTabClass);
  });

  it('highlights only the first tab, when the top level tab is clicked', async () => {
    const card = render(<ExpandingCard {...expandingCardProps} />);
    const firstTab = await (await card.findByText(expandingCardProps.tabs[0].title)).closest('button');
    const secondTab = await (await card.findByText(expandingCardProps.tabs[1].title)).closest('button');
    expect(firstTab).not.toHaveClass(activeTabClass);
    fireEvent.click(firstTab!);
    expect(firstTab).toHaveClass(activeTabClass);
    expect(secondTab).not.toHaveClass(activeTabClass);
  });

  it('shows the contents of the tab, when the top level tab is clicked', async () => {
    const card = render(<ExpandingCard {...expandingCardProps} />);
    const firstTab = await (await card.findByText(expandingCardProps.tabs[0].title)).closest('button');
    fireEvent.click(firstTab!);
    expect(card.getByRole('region')).toHaveTextContent('content1');
  });

  it('closes the tab, when an opened tab is clicked again', async () => {
    const card = render(<ExpandingCard {...expandingCardProps} />);
    const firstTab = await (await card.findByText(expandingCardProps.tabs[0].title)).closest('button');
    fireEvent.click(firstTab!);
    expect(card.getByRole('region')).toHaveTextContent('content1');
    fireEvent.click(firstTab!);
    expect(firstTab).not.toHaveClass(activeTabClass);
    expect(card.getByRole('region')).not.toHaveTextContent('content1');
  });

  it('opens the first tab when global area of the card is clicked', async () => {
    const card = render(<ExpandingCard {...expandingCardProps} />);
    const globalArea = await card.findByText(expandingCardProps.tabs[0].title);
    const firstTab = await (await card.findByText(expandingCardProps.tabs[0].title)).closest('button');
    expect(firstTab).not.toHaveClass(activeTabClass);
    expect(card.getByRole('region')).not.toHaveTextContent('content1');
    fireEvent.click(globalArea!);
    expect(firstTab).toHaveClass(activeTabClass);
    expect(card.getByRole('region')).toHaveTextContent('content1');
  });

  it('closes the first tab when global area of the card is clicked again', async () => {
    const card = render(<ExpandingCard {...expandingCardProps} />);
    const globalArea = await card.findByText(expandingCardProps.tabs[0].title);
    const firstTab = await (await card.findByText(expandingCardProps.tabs[0].title)).closest('button');
    fireEvent.click(globalArea!);
    expect(firstTab).toHaveClass(activeTabClass);
    expect(card.getByRole('region')).toHaveTextContent('content1');
    fireEvent.click(globalArea!);
    expect(firstTab).not.toHaveClass(activeTabClass);
    expect(card.getByRole('region')).not.toHaveTextContent('content1');
  });
});
