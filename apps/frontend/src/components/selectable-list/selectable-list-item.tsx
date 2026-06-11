import { useSortable } from '@dnd-kit/react/sortable';
import { List } from '@mantine/core';
import { ReactNode } from 'react';
import styles from './selectable-list.module.css';

type SelectableListItemProps = {
  id: string;
  index: number;
  children: ReactNode;
  isSelected?: boolean;
  onClick?: () => void;
};

const SelectableListItem = ({ id, index, children, isSelected, onClick }: SelectableListItemProps) => {
  const { ref, isDragging } = useSortable({ id, index });

  return (
    <List.Item ref={ref} data-dragging={isDragging} className={isSelected ? styles.selectedItem : ''} onClick={onClick}>
      {children}
    </List.Item>
  );
};

export default SelectableListItem;
