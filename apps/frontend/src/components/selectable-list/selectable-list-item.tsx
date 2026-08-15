import { ICON_SIZE } from '@/lib/constants';
import { useSortable } from '@dnd-kit/react/sortable';
import { ActionIcon, List } from '@mantine/core';
import { DotsSixVerticalIcon, PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import { ReactNode } from 'react';
import styles from './selectable-list-item.module.css';

type SelectableListItemProps = {
  id: string;
  index: number;
  children: ReactNode;
  isSelected?: boolean;
  canDelete?: boolean;
  canRename?: boolean;
  renameLabel?: string;
  onClick?: () => void;
  onDelete?: () => void;
  onRename?: () => void;
};

const SelectableListItem = ({
  id,
  index,
  children,
  isSelected,
  canDelete,
  canRename,
  renameLabel,
  onClick,
  onDelete,
  onRename,
}: SelectableListItemProps) => {
  const { ref, isDragging, handleRef } = useSortable({ id, index });

  return (
    <List.Item
      ref={ref}
      className={styles.item}
      onClick={onClick}
      data-dragging={isDragging}
      data-selected={isSelected}
    >
      <DotsSixVerticalIcon ref={handleRef} size={ICON_SIZE} />
      {children}
      {(Boolean(canRename) || Boolean(canDelete)) && (
        <div className={styles.actions}>
          {canRename && (
            <ActionIcon
              type="button"
              aria-label={renameLabel}
              title={renameLabel}
              onClick={event => {
                event.stopPropagation();
                onRename?.();
              }}
            >
              <PencilSimpleIcon size={ICON_SIZE} weight="fill" />
            </ActionIcon>
          )}
          {canDelete && (
            <ActionIcon
              type="button"
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
        </div>
      )}
    </List.Item>
  );
};

export default SelectableListItem;
