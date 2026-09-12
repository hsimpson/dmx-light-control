'use client';

import { Loading } from '@/components/loading';
import { globalMessages } from '@/lib/i18n/global-messages';
import { useTranslation } from '@/lib/i18n/use-translation';
import {
  GetProjectDocument,
  UpdateProjectVirtualConsoleDocument,
  type VirtualConsoleInput,
} from '@/shared/types/graphql/graphql';
import { useMutation, useQuery } from '@apollo/client/react';
import { ActionIcon, Box, Group, Tabs } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ArrowsOutIcon, PlusIcon, XIcon } from '@phosphor-icons/react';
import { useParams } from 'next/navigation';
import { KeyboardEvent, PointerEvent, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import VirtualConsoleControlTree from './virtual-console-control-tree';
import VirtualConsoleSidebar, { type VirtualConsoleSelection } from './virtual-console-sidebar';
import {
  cloneVirtualConsoleDocument,
  createControl,
  createDefaultVirtualConsoleDocument,
  findControl,
  findControlAbsolutePosition,
  findControlParentId,
  findDropTarget,
  findFrameOrigin,
  insertControlInTree,
  reparentControl,
  resizedControlBounds,
  updateControlInTree,
  VIRTUAL_CONSOLE_PALETTE_MIME,
  type VirtualConsoleDocument,
  type VirtualConsoleResizeHandle,
} from './virtual-console-document';
import classes from './virtual-console-view.module.css';

type VirtualConsoleViewProperties = {
  projectPublicId: string;
  mode?: 'edit' | 'play';
};

const PAGES_FR = 4;
const SIDEBAR_FR = 1;
const SPLIT_TOTAL_FR = PAGES_FR + SIDEBAR_FR;
const SPLITTER_PX = 6;
const MIN_PANE_RATIO = 0.2;

const documentsEqual = (left: VirtualConsoleDocument, right: VirtualConsoleDocument) =>
  JSON.stringify(left) === JSON.stringify(right);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toDocument = (value: VirtualConsoleDocument | null | undefined): VirtualConsoleDocument => {
  if (!value || !Array.isArray(value.pages) || value.pages.length < 1) {
    return createDefaultVirtualConsoleDocument();
  }
  return cloneVirtualConsoleDocument(value);
};

const VirtualConsoleView = ({ projectPublicId, mode = 'edit' }: VirtualConsoleViewProperties) => {
  const { t } = useTranslation();
  const params = useParams<{ locale?: string }>();
  const canvasRef = useRef<HTMLDivElement>(null);
  const splitRef = useRef<HTMLDivElement>(null);
  const splitDraggingRef = useRef(false);
  const [pagesFr, setPagesFr] = useState(PAGES_FR);
  const [sidebarFr, setSidebarFr] = useState(SIDEBAR_FR);
  const { data, loading, refetch } = useQuery(GetProjectDocument, {
    variables: { publicId: projectPublicId },
    skip: !projectPublicId,
  });
  const [updateVirtualConsole] = useMutation(UpdateProjectVirtualConsoleDocument, {
    refetchQueries: [{ query: GetProjectDocument, variables: { publicId: projectPublicId } }],
  });

  const saved = useMemo(
    () => toDocument(data?.project?.virtualConsole as VirtualConsoleDocument | null | undefined),
    [data?.project?.virtualConsole],
  );
  const [edits, setEdits] = useState<VirtualConsoleDocument | null>(null);
  const draft = edits ?? saved;
  const [selection, setSelection] = useState<VirtualConsoleSelection>({ kind: 'canvas' });
  const [saving, setSaving] = useState(false);
  const [pageOverride, setPageOverride] = useState<string | null>(null);
  const activePageId = pageOverride ?? draft.pages[0]?.id ?? null;
  const [dropTargetControlId, setDropTargetControlId] = useState<string | null>(null);
  const [draggingControlId, setDraggingControlId] = useState<string | null>(null);
  const [dropHighlightActive, setDropHighlightActive] = useState(false);
  const canvasIsDropTarget = dropHighlightActive && dropTargetControlId === null;
  const draftRef = useRef(draft);
  const dragRef = useRef<{
    id: string;
    pageId: string;
    pointerId: number;
    originX: number;
    originY: number;
    startX: number;
    startY: number;
    startAbsX: number;
    startAbsY: number;
    startParentId: string | null;
    startWidth: number;
    startHeight: number;
    handle: VirtualConsoleResizeHandle | null;
  } | null>(null);

  const setDraft = (updater: (current: VirtualConsoleDocument) => VirtualConsoleDocument) => {
    setEdits(current => updater(current ?? saved));
  };

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    if (mode !== 'play') {
      return;
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refetch();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [mode, refetch]);

  const activePage = draft.pages.find(page => page.id === activePageId) ?? draft.pages[0];
  const selectedControl =
    selection.kind === 'control' && activePage ? findControl(activePage.controls, selection.controlId) : undefined;
  const selectedPage = selection.kind === 'page' ? draft.pages.find(page => page.id === selection.pageId) : undefined;
  const dirty = !documentsEqual(draft, saved);

  const patchActivePageControls = (controls: VirtualConsoleDocument['pages'][number]['controls']) => {
    if (!activePage) {
      return;
    }
    setDraft(current => ({
      ...current,
      pages: current.pages.map(page => (page.id === activePage.id ? { ...page, controls } : page)),
    }));
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDropTargetControlId(null);
    setDropHighlightActive(false);
    setDraggingControlId(null);
    if (mode !== 'edit' || !activePage || !canvasRef.current) {
      return;
    }
    const type = event.dataTransfer.getData(VIRTUAL_CONSOLE_PALETTE_MIME);
    if (type !== 'frame' && type !== 'slider' && type !== 'button') {
      return;
    }
    const bounds = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const target = findDropTarget(activePage.controls, x, y);
    const control = createControl(type, target.localX, target.localY);
    patchActivePageControls(insertControlInTree(activePage.controls, target.parentId, control));
    setSelection({ kind: 'control', controlId: control.id });
  };

  const handleMovePointerDown = (controlId: string, event: PointerEvent<HTMLDivElement>) => {
    if (mode !== 'edit' || !activePage) {
      return;
    }
    event.stopPropagation();
    const control = findControl(activePage.controls, controlId);
    if (!control) {
      return;
    }
    setEdits(current => current ?? saved);
    setDraggingControlId(controlId);
    setDropHighlightActive(true);
    if (canvasRef.current) {
      const bounds = canvasRef.current.getBoundingClientRect();
      const target = findDropTarget(
        activePage.controls,
        event.clientX - bounds.left,
        event.clientY - bounds.top,
        controlId,
      );
      setDropTargetControlId(target.parentId);
    }
    const absolute = findControlAbsolutePosition(activePage.controls, controlId) ?? { x: control.x, y: control.y };
    dragRef.current = {
      id: controlId,
      pageId: activePage.id,
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      startX: control.x,
      startY: control.y,
      startAbsX: absolute.x,
      startAbsY: absolute.y,
      startParentId: findControlParentId(activePage.controls, controlId) ?? null,
      startWidth: control.width,
      startHeight: control.height,
      handle: null,
    };
    if (typeof event.currentTarget.setPointerCapture === 'function') {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const handleResizePointerDown = (
    controlId: string,
    handle: VirtualConsoleResizeHandle,
    event: PointerEvent<HTMLDivElement>,
  ) => {
    if (mode !== 'edit' || !activePage) {
      return;
    }
    event.stopPropagation();
    const control = findControl(activePage.controls, controlId);
    if (!control) {
      return;
    }
    setEdits(current => current ?? saved);
    setDraggingControlId(controlId);
    setDropHighlightActive(false);
    setDropTargetControlId(null);
    const absolute = findControlAbsolutePosition(activePage.controls, controlId) ?? { x: control.x, y: control.y };
    dragRef.current = {
      id: controlId,
      pageId: activePage.id,
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      startX: control.x,
      startY: control.y,
      startAbsX: absolute.x,
      startAbsY: absolute.y,
      startParentId: findControlParentId(activePage.controls, controlId) ?? null,
      startWidth: control.width,
      startHeight: control.height,
      handle,
    };
    if (typeof event.currentTarget.setPointerCapture === 'function') {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  useEffect(() => {
    const onMove = (event: globalThis.PointerEvent) => {
      const drag = dragRef.current;
      if (event.pointerId !== drag?.pointerId) {
        return;
      }
      const dx = event.clientX - drag.originX;
      const dy = event.clientY - drag.originY;
      const patch = drag.handle
        ? resizedControlBounds(
            { x: drag.startX, y: drag.startY, width: drag.startWidth, height: drag.startHeight },
            dx,
            dy,
            drag.handle,
          )
        : { x: drag.startX + dx, y: drag.startY + dy };
      setEdits(current => {
        if (!current) {
          return current;
        }
        return {
          ...current,
          pages: current.pages.map(candidate =>
            candidate.id === drag.pageId
              ? { ...candidate, controls: updateControlInTree(candidate.controls, drag.id, patch) }
              : candidate,
          ),
        };
      });
      if (drag.handle) {
        setDropTargetControlId(null);
        return;
      }
      const bounds = canvasRef.current?.getBoundingClientRect();
      const page = draftRef.current.pages.find(candidate => candidate.id === drag.pageId);
      if (!bounds || !page) {
        return;
      }
      const target = findDropTarget(page.controls, event.clientX - bounds.left, event.clientY - bounds.top, drag.id);
      setDropTargetControlId(target.parentId);
      setDropHighlightActive(true);
    };
    const onUp = (event: globalThis.PointerEvent) => {
      const drag = dragRef.current;
      if (event.pointerId !== drag?.pointerId) {
        return;
      }
      if (!drag.handle) {
        const bounds = canvasRef.current?.getBoundingClientRect();
        const page = draftRef.current.pages.find(candidate => candidate.id === drag.pageId);
        if (bounds && page) {
          const target = findDropTarget(
            page.controls,
            event.clientX - bounds.left,
            event.clientY - bounds.top,
            drag.id,
          );
          if (target.parentId !== drag.startParentId) {
            const origin = findFrameOrigin(page.controls, target.parentId);
            const dx = event.clientX - drag.originX;
            const dy = event.clientY - drag.originY;
            setEdits(current => {
              if (!current) {
                return current;
              }
              return {
                ...current,
                pages: current.pages.map(candidate =>
                  candidate.id === drag.pageId
                    ? {
                        ...candidate,
                        controls: reparentControl(
                          candidate.controls,
                          drag.id,
                          target.parentId,
                          drag.startAbsX + dx - origin.x,
                          drag.startAbsY + dy - origin.y,
                        ),
                      }
                    : candidate,
                ),
              };
            });
          }
        }
      }
      dragRef.current = null;
      setDropTargetControlId(null);
      setDropHighlightActive(false);
      setDraggingControlId(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);

  const handleAddPage = () => {
    const nextIndex = draft.pages.length + 1;
    const page = { id: crypto.randomUUID(), name: `Page ${nextIndex}`, controls: [] };
    setDraft(current => ({ ...current, pages: [...current.pages, page] }));
    setPageOverride(page.id);
    setSelection({ kind: 'page', pageId: page.id });
  };

  const handleDeletePage = (pageId: string) => {
    if (draft.pages.length <= 1) {
      return;
    }
    const remaining = draft.pages.filter(page => page.id !== pageId);
    setDraft(current => ({ ...current, pages: remaining }));
    const nextId = remaining[0]?.id ?? null;
    setPageOverride(nextId);
    setSelection({ kind: 'canvas' });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateVirtualConsole({
        variables: {
          input: {
            publicId: projectPublicId,
            virtualConsole: cloneVirtualConsoleDocument(draft) as VirtualConsoleInput,
          },
        },
      });
      setEdits(null);
      notifications.show({
        color: 'green',
        title: t(globalMessages.success),
        message: t({ id: 'ProjectDetail.virtualConsole.saveSuccess', defaultMessage: 'Virtual console saved' }),
      });
    } catch {
      notifications.show({
        color: 'red',
        title: t(globalMessages.error),
        message: t({ id: 'ProjectDetail.virtualConsole.saveError', defaultMessage: 'Failed to save virtual console' }),
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePopOut = () => {
    const locale = params.locale ?? 'de';
    window.open(`/${locale}/project/${projectPublicId}/console/popout`, 'virtual-console', 'noopener,noreferrer');
  };

  const applySplitFromClientX = (clientX: number) => {
    const split = splitRef.current;
    if (!split) {
      return;
    }
    const rect = split.getBoundingClientRect();
    if (rect.width <= SPLITTER_PX) {
      return;
    }
    const ratio = clamp((clientX - rect.left) / rect.width, MIN_PANE_RATIO, 1 - MIN_PANE_RATIO);
    setPagesFr(ratio * SPLIT_TOTAL_FR);
    setSidebarFr((1 - ratio) * SPLIT_TOTAL_FR);
  };

  const handleSplitterPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    splitDraggingRef.current = true;
    if (typeof event.currentTarget.setPointerCapture === 'function') {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    applySplitFromClientX(event.clientX);
  };

  const handleSplitterPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!splitDraggingRef.current) {
      return;
    }
    applySplitFromClientX(event.clientX);
  };

  const handleSplitterPointerUp = () => {
    splitDraggingRef.current = false;
  };

  const handleSplitterKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }
    event.preventDefault();
    const split = splitRef.current;
    if (!split) {
      return;
    }
    const rect = split.getBoundingClientRect();
    const delta = event.key === 'ArrowLeft' ? -16 : 16;
    applySplitFromClientX(rect.left + (pagesFr / SPLIT_TOTAL_FR) * rect.width + delta);
  };

  if (loading && !data) {
    return <Loading />;
  }

  const pagesPane = (
    <div className={classes.pagesPane}>
      <Group gap="xs" justify="space-between" px={mode === 'play' ? 'xs' : undefined} wrap="nowrap">
        <Tabs
          style={{ flex: 1, minWidth: 0 }}
          value={activePage?.id}
          onChange={value => {
            if (!value) {
              return;
            }
            setPageOverride(value);
            setSelection({ kind: 'page', pageId: value });
          }}
        >
          <Tabs.List>
            {draft.pages.map(page => (
              <Tabs.Tab aria-label={page.name} key={page.id} value={page.id}>
                <Group gap={6} wrap="nowrap">
                  <span aria-hidden>{page.name}</span>
                  {mode === 'edit' && draft.pages.length > 1 ? (
                    <ActionIcon
                      aria-label={t({
                        id: 'ProjectDetail.virtualConsole.deletePage',
                        defaultMessage: 'Delete page',
                      })}
                      color="gray"
                      component="span"
                      size="xs"
                      variant="subtle"
                      onClick={event => {
                        event.stopPropagation();
                        handleDeletePage(page.id);
                      }}
                    >
                      <XIcon weight="bold" />
                    </ActionIcon>
                  ) : null}
                </Group>
              </Tabs.Tab>
            ))}
            {mode === 'edit' ? (
              <ActionIcon
                aria-label={t({ id: 'ProjectDetail.virtualConsole.addPage', defaultMessage: 'Add page' })}
                ml="xs"
                mt={4}
                variant="subtle"
                onClick={handleAddPage}
              >
                <PlusIcon weight="bold" />
              </ActionIcon>
            ) : null}
          </Tabs.List>
        </Tabs>
        {mode === 'play' ? (
          <ActionIcon
            aria-label={t({ id: 'ProjectDetail.virtualConsole.fullscreen', defaultMessage: 'Fullscreen' })}
            variant="subtle"
            onClick={() => {
              void document.documentElement.requestFullscreen();
            }}
          >
            <ArrowsOutIcon weight="duotone" />
          </ActionIcon>
        ) : null}
      </Group>

      <div className={classes.workspace} data-testid="virtual-console-workspace">
        <div
          ref={canvasRef}
          className={`${classes.canvas}${canvasIsDropTarget ? ` ${classes.canvasDropTarget ?? ''}` : ''}`}
          data-drop-target={canvasIsDropTarget ? 'true' : undefined}
          data-testid="virtual-console-canvas"
          style={{ height: draft.height, minHeight: '100%', minWidth: '100%', width: draft.width }}
          onClick={() => {
            if (mode === 'edit') {
              setSelection({ kind: 'canvas' });
            }
          }}
          onDragLeave={event => {
            const related = event.relatedTarget;
            if (related instanceof Node && canvasRef.current?.contains(related)) {
              return;
            }
            setDropTargetControlId(null);
            setDropHighlightActive(false);
          }}
          onDragOver={event => {
            event.preventDefault();
            if (mode !== 'edit' || !activePage || !canvasRef.current) {
              return;
            }
            const bounds = canvasRef.current.getBoundingClientRect();
            const target = findDropTarget(activePage.controls, event.clientX - bounds.left, event.clientY - bounds.top);
            setDropTargetControlId(target.parentId);
            setDropHighlightActive(true);
          }}
          onDrop={handleDrop}
        >
          {activePage ? (
            <VirtualConsoleControlTree
              controls={activePage.controls}
              draggingControlId={draggingControlId}
              dropTargetControlId={dropTargetControlId}
              mode={mode}
              selectedControlId={selection.kind === 'control' ? selection.controlId : null}
              onSelectControl={id => {
                setSelection({ kind: 'control', controlId: id });
              }}
              onMovePointerDown={handleMovePointerDown}
              onResizePointerDown={handleResizePointerDown}
            />
          ) : null}
        </div>
      </div>
    </div>
  );

  return (
    <Box
      className={mode === 'play' ? classes.popoutRoot : classes.root}
      display="flex"
      flex={1}
      h="100%"
      mih={0}
      style={{ flexDirection: 'column' }}
    >
      {mode === 'play' ? (
        pagesPane
      ) : (
        <div
          ref={splitRef}
          className={classes.split}
          data-testid="virtual-console-split"
          style={{ gridTemplateColumns: `${pagesFr}fr ${SPLITTER_PX}px ${sidebarFr}fr` }}
        >
          {pagesPane}
          <div
            aria-label={t({ id: 'ProjectDetail.virtualConsole.resizePanels', defaultMessage: 'Resize panels' })}
            aria-orientation="vertical"
            aria-valuemax={80}
            aria-valuemin={20}
            aria-valuenow={Math.round((pagesFr / SPLIT_TOTAL_FR) * 100)}
            className={classes.splitter}
            role="separator"
            tabIndex={0}
            onKeyDown={handleSplitterKeyDown}
            onPointerDown={handleSplitterPointerDown}
            onPointerMove={handleSplitterPointerMove}
            onPointerUp={handleSplitterPointerUp}
          />
          <VirtualConsoleSidebar
            dirty={dirty}
            document={draft}
            saving={saving}
            selectedControl={selectedControl}
            selectedPage={selectedPage}
            selection={selection}
            onCanvasSizeChange={(field, value) => {
              setDraft(current => ({ ...current, [field]: value }));
            }}
            onControlPatch={patch => {
              if (!activePage || selection.kind !== 'control') {
                return;
              }
              patchActivePageControls(updateControlInTree(activePage.controls, selection.controlId, patch));
            }}
            onPageNameChange={name => {
              if (!selectedPage) {
                return;
              }
              setDraft(current => ({
                ...current,
                pages: current.pages.map(page => (page.id === selectedPage.id ? { ...page, name } : page)),
              }));
            }}
            onPopOut={handlePopOut}
            onSave={() => {
              void handleSave();
            }}
            onSelectCanvas={() => {
              setSelection({ kind: 'canvas' });
            }}
          />
        </div>
      )}
    </Box>
  );
};

export default VirtualConsoleView;
