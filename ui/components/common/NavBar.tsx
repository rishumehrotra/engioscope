import React, {
  Fragment, useCallback, useLayoutEffect, useRef, useState
} from 'react';
import { Link } from 'react-router-dom';
import useResizeObserver from '@react-hook/resize-observer';
import { not } from 'rambda';
import { useHotkeys } from 'react-hotkeys-hook';
import useOnClickOutside from '../../hooks/on-click-outside.js';

export type NavItem<T extends string> = {
  key: T;
  label: string;
  linkTo: string;
};

export type NavBarProps<T extends string> = {
  navItems: NavItem<T>[];
  selectedTab: NavBarProps<T>['navItems'][number]['key'];
  right?: React.ReactNode;
};

const NavBar: React.FC<NavBarProps<string>> = ({ navItems, selectedTab, right }) => {
  const [overflowNavItems, setOverflowNavItems] = useState<typeof navItems | null>(null);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const menuContainerRef = useRef<HTMLUListElement | null>(null);
  const overflowMenuButtonRef = useRef<HTMLDivElement | null>(null);

  const toggleOverflow = useCallback(() => setIsOverflowOpen(not), []);
  const closeOverflow = useCallback(() => setIsOverflowOpen(false), []);

  useOnClickOutside(overflowMenuButtonRef, closeOverflow);
  useHotkeys('esc', closeOverflow);

  const onResize = useCallback(() => {
    const container = menuContainerRef.current;
    if (!container) return;

    const lis = [...(container?.querySelectorAll<HTMLLIElement>('li:not(.overflow-menu)') || [])];
    const offsetTops = lis.map(e => e.offsetTop);
    const offsetTopOfFirstElement = offsetTops[0];

    if (offsetTops.every(e => e === offsetTopOfFirstElement)) {
      setOverflowNavItems(null);
    } else {
      setOverflowNavItems(navItems.filter((_, i) => offsetTops[i] > offsetTopOfFirstElement));
    }

    lis.forEach(li => {
      if (li.offsetTop > offsetTopOfFirstElement) {
        li.classList.add('invisible');
      } else {
        li.classList.remove('invisible');
      }
    });

    const lastVisible = [...lis].reverse().find(li => li.offsetTop === offsetTopOfFirstElement);
    if (!lastVisible) return; // stupid TS
    if (!overflowMenuButtonRef.current) return;

    overflowMenuButtonRef.current.style.left = `${lastVisible.offsetLeft + lastVisible.offsetWidth}px`;
  }, [navItems]);

  useResizeObserver(menuContainerRef, onResize);
  useLayoutEffect(() => { onResize(); }, [onResize]);

  return (
    <div
      className="grid grid-flow-col gap-8 justify-between items-center mb-8 rounded-lg p-4 bg-white shadow"
      style={{ gridAutoColumns: '1fr min-content' }}
    >
      <div className="relative">
        <ul className="overflow-hidden max-h-10 mr-24" ref={menuContainerRef}>
          {navItems.map(({ key, label, linkTo }) => (
            <Fragment key={key}>
              <li className="inline-block">
                <Link
                  to={linkTo}
                  className={`nav-link ${selectedTab === key ? 'selected' : 'not-selected'}`}
                >
                  {label}
                </Link>
              </li>
            </Fragment>
          ))}
        </ul>
        <div className="absolute top-0" ref={overflowMenuButtonRef}>
          {overflowNavItems?.length ? (
            <div className="relative">
              <button
                onClick={toggleOverflow}
                className={`nav-link ${isOverflowOpen ? 'selected' : 'not-selected'}`}
              >
                ...
              </button>
              {isOverflowOpen ? (
                <ul
                  className="absolute right-2 top-9 border border-gray-800 bg-white rounded-md shadow z-50"
                  style={{ minWidth: '200px' }}
                >
                  {overflowNavItems.map(({ key, label, linkTo }) => (
                    <li key={key}>
                      <Link
                        to={linkTo}
                        className="text-gray-800 hover:text-gray-100 hover:bg-gray-800
                        px-4 py-4 block focus:text-gray-100 focus:bg-gray-800"
                        onClick={() => setIsOverflowOpen(false)}
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <div>
        {right}
      </div>
    </div>
  );
};

export default NavBar;
