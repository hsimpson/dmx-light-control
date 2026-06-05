import { ICON_SIZE } from '@/lib/constants';
import { globalMessages } from '@/lib/i18n/global-messages';
import { useTranslation } from '@/lib/i18n/use-translation';
import { ActionIcon, Flex, List, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ListPlusIcon, TrashIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import styles from './selectable-list.module.css';

type SelectableListProps = {
  title: React.ReactNode;
  addNewItemPlaceholder: string;
  items: string[];
  sorted?: boolean;
  selectedItem?: string;
  onSelectedItemChange?: (item: string | null) => void;
  onItemsChange?: (items: string[]) => void;
};

const SelectableList = ({
  title,
  addNewItemPlaceholder,
  items,
  sorted,
  selectedItem,
  onSelectedItemChange: onSelectedItemChange,
  onItemsChange,
}: SelectableListProps) => {
  const [addItem, setAddItem] = useState('');
  const { t } = useTranslation();

  const handleAddItem = (itemToAdd: string) => {
    if (items.includes(itemToAdd)) {
      notifications.show({
        color: 'red',
        title: t(globalMessages.error),
        message: t({ id: 'SelectableList.itemAlreadyExists', defaultMessage: 'Item already exists' }),
      });
      return;
    }

    const newItems = sorted ? [...items, itemToAdd].sort() : [...items, itemToAdd];
    setAddItem('');
    handleSelectedItemChange(itemToAdd);
    if (onItemsChange) {
      onItemsChange(newItems);
    }
  };

  const handleRemoveItem = (itemToRemove: string) => {
    const newItems = items.filter(i => i !== itemToRemove);
    if (onItemsChange) {
      onItemsChange(newItems);
    }

    if (selectedItem === itemToRemove && newItems.length > 0) {
      handleSelectedItemChange(newItems[0]);
    } else if (newItems.length === 0) {
      handleSelectedItemChange(undefined);
    }
  };

  const handleSelectedItemChange = (item?: string) => {
    if (onSelectedItemChange) {
      onSelectedItemChange(item ?? null);
    }
  };

  return (
    <Flex direction="column" gap="md">
      <div>{title}</div>
      <Flex direction="row" gap="xs" align="center">
        <TextInput
          placeholder={addNewItemPlaceholder}
          value={addItem}
          onChange={event => {
            setAddItem(event.currentTarget.value);
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
      <List className={styles.list} listStyleType="none">
        {items.map(item => (
          <List.Item
            key={item}
            className={item === selectedItem ? styles.selectedItem : ''}
            onClick={() => {
              handleSelectedItemChange(item);
            }}
          >
            <span>{item}</span>
            <ActionIcon
              onClick={event => {
                event.stopPropagation();
                handleRemoveItem(item);
              }}
            >
              <TrashIcon size={ICON_SIZE} weight="fill" />
            </ActionIcon>
          </List.Item>
        ))}
      </List>
    </Flex>
  );
};
export default SelectableList;
