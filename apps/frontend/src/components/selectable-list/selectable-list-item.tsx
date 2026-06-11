import { ICON_SIZE } from '@/lib/constants';
import { useSortable } from '@dnd-kit/react/sortable';
import { ActionIcon, List } from '@mantine/core';
import { DotsSixVerticalIcon, TrashIcon } from '@phosphor-icons/react';
import { ReactNode } from 'react';
import styles from './selectable-list-item.module.css';

type SelectableListItemProps = {
  id: string;
  index: number;
  children: ReactNode;
  isSelected?: boolean;
  canDelete?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
};

const SelectableListItem = ({
  id,
  index,
  children,
  isSelected,
  canDelete,
  onClick,
  onDelete,
}: SelectableListItemProps) => {
  const { ref, isDragging, handleRef } = useSortable({ id, index });

  return (
    <List.Item ref={ref} className={styles.item} onClick={onClick}>
      <DotsSixVerticalIcon ref={handleRef} size={ICON_SIZE} />
      {children}
      {canDelete && (
        <ActionIcon
          className={styles.removeButton}
          onClick={event => {
            event.stopPropagation();
            if (onDelete) {
              onDelete();
            }
          }}
        >
          <TrashIcon size={ICON_SIZE} weight="fill" />
        </ActionIcon>
      )}
    </List.Item>
  );
};

export default SelectableListItem;
