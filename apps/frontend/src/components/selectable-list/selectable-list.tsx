import { ICON_SIZE } from '@/lib/constants';
import { globalMessages } from '@/lib/i18n/global-messages';
import { useTranslation } from '@/lib/i18n/use-translation';
import { DragDropProvider } from '@dnd-kit/react';
import { ActionIcon, Flex, List, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ListPlusIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import SelectableListItem from './selectable-list-item';

type SelectableListProps<ItemType> = {
  addNewItem?: boolean;
  addNewItemPlaceholder?: string;
  items: ItemType[];
  accessor: keyof ItemType;
  keyAccessor: keyof ItemType;
  selectedItem?: ItemType;
  itemRenderer?: (item: ItemType) => React.ReactNode;
  onSelectedItemChange?: (item?: ItemType) => void;
  onItemAdd?: (itemToAdd: string) => void;
  onItemRemove?: (itemToRemove: ItemType) => void;
};

const SelectableList = <ItemType,>({
  addNewItem,
  addNewItemPlaceholder,
  items,
  accessor,
  keyAccessor,
  itemRenderer,
  selectedItem,
  onSelectedItemChange,
  onItemAdd,
  onItemRemove,
}: SelectableListProps<ItemType>) => {
  const [addItem, setAddItem] = useState('');
  const { t } = useTranslation();

  const handleAddItem = (itemToAdd: string) => {
    if (items.some(item => item[accessor] === itemToAdd)) {
      notifications.show({
        color: 'red',
        title: t(globalMessages.error),
        message: t({ id: 'SelectableList.itemAlreadyExists', defaultMessage: 'Item already exists' }),
      });
      return;
    }

    setAddItem('');
    if (onItemAdd) {
      onItemAdd(itemToAdd);
    }
  };

  const handleRemoveItem = (itemToRemove: ItemType) => {
    const newItems = items.filter(i => i !== itemToRemove);
    if (onItemRemove) {
      onItemRemove(itemToRemove);
    }

    if (selectedItem === itemToRemove && newItems.length > 0) {
      handleSelectedItemChange(newItems[0]);
    } else if (newItems.length === 0) {
      handleSelectedItemChange(undefined);
    }
  };

  const handleSelectedItemChange = (item?: ItemType) => {
    if (onSelectedItemChange) {
      onSelectedItemChange(item);
    }
  };

  return (
    <Flex direction="column" gap="md">
      {addNewItem && (
        <Flex direction="row" gap="xs" align="center">
          <TextInput
            style={{ flex: 1 }}
            placeholder={addNewItemPlaceholder}
            value={addItem}
            onChange={event => {
              setAddItem(event.currentTarget.value);
            }}
            onKeyDown={event => {
              if (event.key === 'Enter' && addItem.trim()) {
                handleAddItem(addItem);
              }
            }}
          />
          <ActionIcon
            variant="filled"
            size="lg"
            radius="lg"
            disabled={!addItem.trim()}
            onClick={() => {
              handleAddItem(addItem);
            }}
          >
            <ListPlusIcon size={ICON_SIZE} weight="fill" />
          </ActionIcon>
        </Flex>
      )}
      <DragDropProvider>
        <List listStyleType="none">
          <Flex direction="column" gap="xs">
            {items.map((item, index) => (
              <SelectableListItem
                key={item[keyAccessor] as unknown as string}
                id={item[keyAccessor] as unknown as string}
                index={index}
                isSelected={item === selectedItem}
                onClick={() => {
                  handleSelectedItemChange(item);
                }}
                canDelete
                onDelete={() => {
                  handleRemoveItem(item);
                }}
              >
                {itemRenderer ? itemRenderer(item) : <span>{item[accessor] as string}</span>}
              </SelectableListItem>
            ))}
          </Flex>
        </List>
      </DragDropProvider>
    </Flex>
  );
};

export default SelectableList;
