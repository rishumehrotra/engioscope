import React from 'react';
import { useCombobox } from 'downshift';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../../helpers/trpc.js';

const SearchCombobox = () => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const navigate = useNavigate();
  const searchResult = trpc.collections.searchProjects.useQuery(
    { searchTerm },
    { enabled: searchTerm.length > 0 }
  );

  const {
    isOpen,
    getMenuProps,
    getInputProps,
    highlightedIndex,
    getItemProps,
    selectedItem,
  } = useCombobox({
    onSelectedItemChange({ selectedItem }) {
      if (selectedItem) {
        navigate(`/${selectedItem.name}/${selectedItem.project}/`);
      }
    },
    onInputValueChange({ inputValue }) {
      setSearchTerm(inputValue || '');
    },
    items: searchResult.data || [],
    itemToString(item) {
      return item ? item.name : '';
    },
    initialHighlightedIndex: 0,
    defaultHighlightedIndex: 0,
  });

  return (
    <div className="flex justify-center">
      <div className="inline-block relative">
        <input
          placeholder="Search projects..."
          className="text-2xl py-2 px-3 inline-block rounded-md  border-gray-900 border-1 shadow-md"
          {...getInputProps()}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        />

        <ul
          className={`border-solid border-1 border-stone-950 block bg-white mt-1 p-3 w-full rounded-md shadow-sm absolute ${
            !(isOpen && searchResult.data?.length) && 'hidden'
          }`}
          {...getMenuProps()}
        >
          {isOpen &&
            searchResult.data &&
            searchResult.data.map((item, index) => (
              <li
                className={`py-2 px-3 rounded-md ${
                  highlightedIndex === index ? 'bg-gray-100' : 'bg-white'
                } ${selectedItem === item ? 'font-bold' : 'normal'}`}
                key={`${item.project}`}
                {...getItemProps({ item, index })}
              >
                <button
                  type="button"
                  className="text-left w-full"
                  onClick={() => {
                    navigate(`/${item.name}/${item.project}/`);
                  }}
                >
                  <h4 className="text-zinc-950 text-base">{item.project}</h4>
                  <div className="text-gray-600 text-sm">{item.name}</div>
                </button>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
};

export default SearchCombobox;
