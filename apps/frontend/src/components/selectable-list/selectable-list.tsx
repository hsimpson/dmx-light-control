import { ICON_SIZE } from '@/lib/constants';
import { globalMessages } from '@/lib/i18n/global-messages';
import { useTranslation } from '@/lib/i18n/use-translation';
import { arrayMove } from '@dnd-kit/helpers';
import { DragDropProvider } from '@dnd-kit/react';
import { ActionIcon, Flex, List, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ListPlusIcon } from '@phosphor-icons/react';
import { useRef, useState } from 'react';
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
  onItemReorder?: (items: ItemType[]) => void;
  onItemRename?: (item: ItemType, newName: string) => void;
};

function isSortableSource(source: unknown): source is { initialIndex: number; index: number } {
  return (
    typeof source === 'object' &&
    source !== null &&
    'initialIndex' in source &&
    'index' in source &&
    typeof source.initialIndex === 'number' &&
    typeof source.index === 'number'
  );
}

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
  onItemReorder,
  onItemRename,
}: SelectableListProps<ItemType>) => {
  const [addItem, setAddItem] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const editingKeyRef = useRef<string | null>(null);
  const { t } = useTranslation();
  const renameLabel = t({ id: 'SelectableList.renameItem', defaultMessage: 'Rename' });

  const itemKey = (item: ItemType) => String(item[keyAccessor]);
  const itemLabel = (item: ItemType) => String(item[accessor]);

  const cancelRename = () => {
    editingKeyRef.current = null;
    setEditingKey(null);
    setEditValue('');
  };

  const confirmRename = (item: ItemType) => {
    if (editingKeyRef.current !== itemKey(item)) {
      return;
    }

    const trimmedName = editValue.trim();
    if (!trimmedName) {
      cancelRename();
      return;
    }

    const isDuplicate = items.some(other => itemKey(other) !== itemKey(item) && itemLabel(other) === trimmedName);
    if (isDuplicate) {
      notifications.show({
        color: 'red',
        title: t(globalMessages.error),
        message: t({ id: 'SelectableList.itemAlreadyExists', defaultMessage: 'Item already exists' }),
      });
      return;
    }

    if (trimmedName === itemLabel(item)) {
      cancelRename();
      return;
    }

    onItemRename?.(item, trimmedName);
    cancelRename();
  };

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
              if (event.key === 'Enter') {
                event.preventDefault();
                if (addItem.trim()) {
                  handleAddItem(addItem);
                }
              }
            }}
          />
          <ActionIcon
            type="button"
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
      <DragDropProvider
        onDragEnd={event => {
          if (!onItemReorder || event.operation.canceled) {
            return;
          }
          const source = event.operation.source;
          if (!isSortableSource(source) || source.initialIndex === source.index) {
            return;
          }
          onItemReorder(arrayMove(items, source.initialIndex, source.index));
        }}
      >
        <List listStyleType="none">
          <Flex direction="column" gap="xs">
            {items.map((item, index) => {
              const key = itemKey(item);
              const isEditing = editingKey === key;

              return (
                <SelectableListItem
                  key={key}
                  id={key}
                  index={index}
                  isSelected={item === selectedItem}
                  onClick={() => {
                    handleSelectedItemChange(item);
                  }}
                  canDelete={Boolean(onItemRemove)}
                  canRename={Boolean(onItemRename)}
                  renameLabel={renameLabel}
                  onRename={() => {
                    editingKeyRef.current = key;
                    setEditingKey(key);
                    setEditValue(itemLabel(item));
                  }}
                  onDelete={() => {
                    handleRemoveItem(item);
                  }}
                >
                  {isEditing ? (
                    <TextInput
                      style={{ flex: 1 }}
                      value={editValue}
                      autoFocus
                      onClick={event => {
                        event.stopPropagation();
                      }}
                      onChange={event => {
                        setEditValue(event.currentTarget.value);
                      }}
                      onKeyDown={event => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          event.stopPropagation();
                          confirmRename(item);
                        }
                        if (event.key === 'Escape') {
                          event.preventDefault();
                          event.stopPropagation();
                          cancelRename();
                        }
                      }}
                      onBlur={() => {
                        if (editValue.trim()) {
                          confirmRename(item);
                        } else {
                          cancelRename();
                        }
                      }}
                    />
                  ) : itemRenderer ? (
                    itemRenderer(item)
                  ) : (
                    <span>{item[accessor] as string}</span>
                  )}
                </SelectableListItem>
              );
            })}
          </Flex>
        </List>
      </DragDropProvider>
    </Flex>
  );
};

export default SelectableList;
