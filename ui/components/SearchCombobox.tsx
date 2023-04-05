import React from 'react';
import { useCombobox } from 'downshift';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../helpers/trpc.js';

const SearchCombobox = () => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const navigate = useNavigate();
  const searchResult = trpc.collections.searchProjects.useQuery(
    { searchTerm },
    { enabled: searchTerm.length > 0 }
  );

  const { isOpen, getMenuProps, getInputProps, highlightedIndex, getItemProps } =
    useCombobox({
      onSelectedItemChange({ selectedItem }) {
        if (selectedItem) {
          navigate(`/${selectedItem.collectionName}/${selectedItem.project}/`);
        }
      },
      onInputValueChange({ inputValue }) {
        setSearchTerm(inputValue || '');
      },
      items: searchResult.data || [],
      itemToString(item) {
        return item ? `${item.collectionName}: ${item.project}` : '';
      },
      initialHighlightedIndex: 0,
      defaultHighlightedIndex: 0,
    });

  return (
    <div className="grid place-items-center">
      <div className="w-1/2 relative">
        <input
          placeholder="Search Azure DevOps projects…"
          className="text-3xl py-2 px-3 my-14 inline-block rounded-md border-gray-900 border-1 w-full"
          {...getInputProps()}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        />

        <ul
          className={`p-3 w-full rounded-md shadow-sm absolute top-24 mt-5 border border-gray-100 bg-white ${
            !(isOpen && searchResult.data?.length) && 'hidden'
          }`}
          {...getMenuProps()}
        >
          {isOpen &&
            searchResult.data &&
            searchResult.data.map((item, index) => (
              <li
                key={`${item.collectionName}-${item.project}`}
                {...getItemProps({ item, index })}
              >
                <button
                  type="button"
                  className={`py-2 px-3 mb-1 rounded-md text-left w-full border ${
                    highlightedIndex === index
                      ? 'bg-gray-100 border-gray-300'
                      : 'bg-white border-transparent'
                  }`}
                  onClick={() => {
                    navigate(`/${item.collectionName}/${item.project}/`);
                  }}
                >
                  <h4 className="text-zinc-950 text-base">{item.project}</h4>
                  <div className="text-gray-600 text-sm">{item.collectionName}</div>
                </button>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
};

export default SearchCombobox;
