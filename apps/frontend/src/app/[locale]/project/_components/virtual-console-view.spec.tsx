import { GetProjectDocument, UpdateProjectVirtualConsoleDocument } from '@/shared/types/graphql/graphql';
import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { notifications } from '@mantine/notifications';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { frameHeaderHeight, VIRTUAL_CONSOLE_PALETTE_MIME } from './virtual-console-document';
import { reloadVirtualConsolePlayWindow } from './virtual-console-reload';
import VirtualConsoleView from './virtual-console-view';

vi.mock('./virtual-console-reload', async () => {
  const actual = await vi.importActual<typeof import('./virtual-console-reload')>('./virtual-console-reload');
  return {
    ...actual,
    reloadVirtualConsolePlayWindow: vi.fn(),
  };
});

vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'en', publicId: 'proj-1' }),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

const now = new Date('2026-01-01T00:00:00.000Z');
const pageId = '11111111-1111-4111-8111-111111111111';

const virtualConsole = {
  __typename: 'VirtualConsoleDto',
  schemaVersion: 1,
  width: 1280,
  height: 720,
  snap: 1,
  pages: [{ __typename: 'VirtualConsolePageDto', id: pageId, name: 'Page 1', controls: [] }],
};

const project = {
  publicId: 'proj-1',
  name: 'Show',
  environmentType: 'SimpleGround',
  roomWidth: 10,
  roomLength: 8,
  roomHeight: 5,
  virtualConsole,
  projectFixtures: [],
  project3dObjects: [],
  createdAt: now,
  updatedAt: now,
};

describe('VirtualConsoleView', () => {
  beforeEach(() => {
    vi.mocked(notifications.show).mockClear();
  });

  it('adds a page and keeps at least one page', async () => {
    const { user } = renderWithProviders(<VirtualConsoleView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project } },
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Page 1' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Add page' }));
    expect(screen.getByRole('tab', { name: 'Page 2' })).toBeInTheDocument();

    const deletePage = screen.getAllByLabelText('Delete page').at(0);
    expect(deletePage).toBeDefined();
    if (deletePage) {
      await user.click(deletePage);
    }
    expect(screen.getByRole('tab', { name: 'Page 2' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Delete page')).not.toBeInTheDocument();
  });

  it('does not save until Save is clicked', async () => {
    const messages: string[] = [];
    const channel = new BroadcastChannel('dmx-virtual-console:proj-1');
    channel.onmessage = event => {
      messages.push(String(event.data));
    };
    const { user } = renderWithProviders(<VirtualConsoleView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project } },
        },
        {
          request: {
            query: UpdateProjectVirtualConsoleDocument,
            variables: {
              input: {
                publicId: 'proj-1',
                virtualConsole: {
                  schemaVersion: 1,
                  width: 1024,
                  height: 720,
                  snap: 1,
                  pages: [{ id: pageId, name: 'Page 1', controls: [] }],
                },
              },
            },
          },
          result: {
            data: { updateProjectVirtualConsole: { ...project, virtualConsole: { ...virtualConsole, width: 1024 } } },
          },
        },
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project: { ...project, virtualConsole: { ...virtualConsole, width: 1024 } } } },
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });

    await user.click(screen.getByText('Canvas'));
    const width = screen.getByLabelText('Width');
    await user.clear(width);
    await user.type(width, '1024');
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({ color: 'green' }));
    });
    await waitFor(() => {
      expect(messages).toEqual(['saved']);
    });
    channel.close();
  });

  it('hides the sidebar in play mode and puts fullscreen in the page header', async () => {
    renderWithProviders(<VirtualConsoleView mode="play" projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project } },
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Fullscreen' })).toBeInTheDocument();
    });
    expect(screen.getByRole('tab', { name: 'Page 1' })).toBeInTheDocument();
    expect(screen.queryByText('Add control')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Console' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    expect(screen.queryByRole('separator', { name: 'Resize panels' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('virtual-console-split')).not.toBeInTheDocument();
  });

  it('starts with a 4/1 split and resizes when the splitter is dragged', async () => {
    renderWithProviders(<VirtualConsoleView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project } },
        },
      ],
    });

    const split = await screen.findByTestId('virtual-console-split');
    expect(split).toHaveStyle({ gridTemplateColumns: '4fr 6px 1fr' });
    expect(screen.getByTestId('virtual-console-canvas')).toHaveStyle({ minHeight: '100%' });

    const splitter = screen.getByRole('separator', { name: 'Resize panels' });
    vi.spyOn(split, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      bottom: 400,
      right: 400,
      width: 400,
      height: 400,
      toJSON: () => ({}),
    });

    fireEvent.pointerDown(splitter, { clientX: 300, pointerId: 1 });
    fireEvent.pointerMove(splitter, { clientX: 120, pointerId: 1 });
    fireEvent.pointerUp(splitter, { pointerId: 1 });

    expect(split).toHaveStyle({ gridTemplateColumns: '1.5fr 6px 3.5fr' });
  });

  it('resizes a selected control from every handle', async () => {
    const buttonId = '22222222-2222-4222-8222-222222222222';
    const projectWithButton = {
      ...project,
      virtualConsole: {
        ...virtualConsole,
        pages: [
          {
            ...virtualConsole.pages[0],
            controls: [
              {
                __typename: 'VirtualConsoleControlDto',
                id: buttonId,
                type: 'button',
                x: 40,
                y: 50,
                width: 80,
                height: 40,
                label: 'Go',
                backgroundColor: '#111111',
                borderWidth: null,
                borderColor: null,
                orientation: null,
                foregroundColor: null,
                fontFamily: null,
                fontSize: null,
                fontWeight: null,
                valueType: null,
                channelBindings: null,
                children: [],
              },
            ],
          },
        ],
      },
    };

    const { user } = renderWithProviders(<VirtualConsoleView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project: projectWithButton } },
        },
      ],
    });

    await user.click(await screen.findByTestId(`virtual-console-control-${buttonId}`));
    const handle = screen.getByTestId('virtual-console-resize-se');
    fireEvent.pointerDown(handle, { clientX: 120, clientY: 90, pointerId: 7 });
    fireEvent.pointerMove(window, { clientX: 160, clientY: 110, pointerId: 7 });
    fireEvent.pointerUp(window, { pointerId: 7 });

    expect(screen.getByLabelText('Width')).toHaveValue('120');
    expect(screen.getByLabelText('Height')).toHaveValue('60');
  });

  it('highlights a frame while a control is dragged over it and reparents on drop', async () => {
    const frameId = '33333333-3333-4333-8333-333333333333';
    const buttonId = '22222222-2222-4222-8222-222222222222';
    const graphqlControl = {
      __typename: 'VirtualConsoleControlDto' as const,
      borderWidth: null,
      borderColor: null,
      orientation: null,
      foregroundColor: null,
      fontFamily: null,
      fontSize: null,
      fontWeight: null,
      valueType: null,
      channelBindings: null,
      children: [] as unknown[],
    };
    const projectWithControls = {
      ...project,
      virtualConsole: {
        ...virtualConsole,
        pages: [
          {
            ...virtualConsole.pages[0],
            controls: [
              {
                ...graphqlControl,
                id: frameId,
                type: 'frame',
                x: 10,
                y: 10,
                width: 200,
                height: 180,
                label: 'Frame',
                backgroundColor: '#1a1b1e',
              },
              {
                ...graphqlControl,
                id: buttonId,
                type: 'button',
                x: 300,
                y: 40,
                width: 80,
                height: 40,
                label: 'Go',
                backgroundColor: '#111111',
              },
            ],
          },
        ],
      },
    };

    renderWithProviders(<VirtualConsoleView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project: projectWithControls } },
        },
      ],
    });

    const canvas = await screen.findByTestId('virtual-console-canvas');
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      bottom: 720,
      right: 1280,
      width: 1280,
      height: 720,
      toJSON: () => ({}),
    });

    fireEvent.pointerDown(screen.getByTestId(`virtual-console-control-${buttonId}`), {
      clientX: 320,
      clientY: 50,
      pointerId: 3,
    });
    fireEvent.pointerMove(window, { clientX: 80, clientY: 60, pointerId: 3 });

    expect(screen.getByTestId('virtual-console-frame')).toHaveAttribute('data-drop-target', 'true');
    expect(canvas).not.toHaveAttribute('data-drop-target');

    fireEvent.pointerUp(window, { clientX: 80, clientY: 60, pointerId: 3 });

    expect(
      screen.getByTestId('virtual-console-frame').querySelector(`[data-testid="virtual-console-control-${buttonId}"]`),
    ).not.toBeNull();
    expect(screen.getByTestId('virtual-console-frame')).not.toHaveAttribute('data-drop-target');
  });

  it('highlights the canvas while a control is dragged over empty space', async () => {
    const buttonId = '22222222-2222-4222-8222-222222222222';
    const projectWithButton = {
      ...project,
      virtualConsole: {
        ...virtualConsole,
        pages: [
          {
            ...virtualConsole.pages[0],
            controls: [
              {
                __typename: 'VirtualConsoleControlDto',
                id: buttonId,
                type: 'button',
                x: 40,
                y: 50,
                width: 80,
                height: 40,
                label: 'Go',
                backgroundColor: '#111111',
                borderWidth: null,
                borderColor: null,
                orientation: null,
                foregroundColor: null,
                fontFamily: null,
                fontSize: null,
                fontWeight: null,
                valueType: null,
                channelBindings: null,
                children: [],
              },
            ],
          },
        ],
      },
    };

    renderWithProviders(<VirtualConsoleView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project: projectWithButton } },
        },
      ],
    });

    const canvas = await screen.findByTestId('virtual-console-canvas');
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      bottom: 720,
      right: 1280,
      width: 1280,
      height: 720,
      toJSON: () => ({}),
    });

    const button = screen.getByTestId(`virtual-console-control-${buttonId}`);
    fireEvent.pointerDown(button, { clientX: 60, clientY: 60, pointerId: 4 });
    fireEvent.pointerMove(window, { clientX: 400, clientY: 80, pointerId: 4 });

    expect(canvas).toHaveAttribute('data-drop-target', 'true');
    expect(button).toHaveStyle({ zIndex: '2' });

    fireEvent.pointerUp(window, { clientX: 400, clientY: 80, pointerId: 4 });
    expect(canvas).not.toHaveAttribute('data-drop-target');
  });

  it('deletes the selected control from the canvas', async () => {
    const buttonId = '22222222-2222-4222-8222-222222222222';
    const nestedId = '44444444-4444-4444-8444-444444444444';
    const frameId = '33333333-3333-4333-8333-333333333333';
    const graphqlControl = {
      __typename: 'VirtualConsoleControlDto' as const,
      borderWidth: null,
      borderColor: null,
      orientation: null,
      foregroundColor: null,
      fontFamily: null,
      fontSize: null,
      fontWeight: null,
      valueType: null,
      channelBindings: null,
    };
    const projectWithControls = {
      ...project,
      virtualConsole: {
        ...virtualConsole,
        pages: [
          {
            ...virtualConsole.pages[0],
            controls: [
              {
                ...graphqlControl,
                id: buttonId,
                type: 'button',
                x: 40,
                y: 50,
                width: 80,
                height: 40,
                label: 'Go',
                backgroundColor: '#111111',
                children: [],
              },
              {
                ...graphqlControl,
                id: frameId,
                type: 'frame',
                x: 200,
                y: 20,
                width: 160,
                height: 120,
                label: 'Group',
                backgroundColor: '#1a1b1e',
                children: [
                  {
                    ...graphqlControl,
                    id: nestedId,
                    type: 'button',
                    x: 8,
                    y: 8,
                    width: 80,
                    height: 40,
                    label: 'Nested',
                    backgroundColor: '#222222',
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    const { user } = renderWithProviders(<VirtualConsoleView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project: projectWithControls } },
        },
      ],
    });

    await user.click(await screen.findByTestId(`virtual-console-control-${buttonId}`));
    await user.click(screen.getByRole('button', { name: 'Delete control' }));
    expect(screen.queryByTestId(`virtual-console-control-${buttonId}`)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();

    await user.click(screen.getByTestId(`virtual-console-control-${frameId}`));
    fireEvent.keyDown(window, { key: 'Delete' });
    expect(screen.queryByTestId(`virtual-console-control-${frameId}`)).not.toBeInTheDocument();
    expect(screen.queryByTestId(`virtual-console-control-${nestedId}`)).not.toBeInTheDocument();
  });

  it('snaps a dragged control to the configured grid', async () => {
    const buttonId = '22222222-2222-4222-8222-222222222222';
    const projectWithButton = {
      ...project,
      virtualConsole: {
        ...virtualConsole,
        snap: 8,
        pages: [
          {
            ...virtualConsole.pages[0],
            controls: [
              {
                __typename: 'VirtualConsoleControlDto',
                id: buttonId,
                type: 'button',
                x: 40,
                y: 50,
                width: 80,
                height: 40,
                label: 'Go',
                backgroundColor: '#111111',
                borderWidth: null,
                borderColor: null,
                orientation: null,
                foregroundColor: null,
                fontFamily: null,
                fontSize: null,
                fontWeight: null,
                valueType: null,
                channelBindings: null,
                children: [],
              },
            ],
          },
        ],
      },
    };

    const { user } = renderWithProviders(<VirtualConsoleView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project: projectWithButton } },
        },
      ],
    });

    await user.click(await screen.findByTestId(`virtual-console-control-${buttonId}`));
    const control = screen.getByTestId(`virtual-console-control-${buttonId}`);
    fireEvent.pointerDown(control, { clientX: 60, clientY: 60, pointerId: 5 });
    fireEvent.pointerMove(window, { clientX: 70, clientY: 60, pointerId: 5 });
    fireEvent.pointerUp(window, { pointerId: 5 });

    expect(screen.getByLabelText('X')).toHaveValue('48');
    expect(screen.getByLabelText('Y')).toHaveValue('48');
  });

  it('shows a loader while the project query is in flight', () => {
    renderWithProviders(<VirtualConsoleView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project } },
          delay: Number.POSITIVE_INFINITY,
        },
      ],
    });

    expect(document.querySelector('.mantine-Loader-root')).not.toBeNull();
  });

  it('falls back to a default console when the project has none', async () => {
    renderWithProviders(<VirtualConsoleView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project: { ...project, virtualConsole: null } } },
        },
      ],
    });

    expect(await screen.findByRole('tab', { name: 'Page 1' })).toBeInTheDocument();
  });

  it('drops a palette control onto the canvas', async () => {
    const { user } = renderWithProviders(<VirtualConsoleView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project } },
        },
      ],
    });

    const canvas = await screen.findByTestId('virtual-console-canvas');
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      bottom: 720,
      right: 1280,
      width: 1280,
      height: 720,
      toJSON: () => ({}),
    });

    const dropEvent = {
      clientX: 80,
      clientY: 60,
      dataTransfer: {
        getData: (type: string) => (type === VIRTUAL_CONSOLE_PALETTE_MIME ? 'button' : ''),
      },
    };
    Object.defineProperty(dropEvent, 'clientX', { value: 80 });
    fireEvent.dragOver(canvas, dropEvent);
    fireEvent.drop(canvas, dropEvent);

    expect(await screen.findByTestId('virtual-console-button')).toHaveTextContent('Button');
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();

    fireEvent.drop(canvas, {
      clientX: 80,
      clientY: 60,
      dataTransfer: { getData: () => 'unknown' },
    });
    expect(screen.getAllByTestId('virtual-console-button')).toHaveLength(1);

    await user.click(screen.getByText('Canvas'));
    expect(screen.queryByLabelText('Label')).not.toBeInTheDocument();
  });

  it('opens the pop-out window from the sidebar', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const { user } = renderWithProviders(<VirtualConsoleView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project } },
        },
      ],
    });

    await user.click(await screen.findByRole('button', { name: 'Pop out' }));
    expect(open).toHaveBeenCalledWith('/en/project/proj-1/console/popout', 'virtual-console', 'noopener,noreferrer');
    open.mockRestore();
  });

  it('shows an error notification when save fails', async () => {
    const messages: string[] = [];
    const channel = new BroadcastChannel('dmx-virtual-console:proj-1');
    channel.onmessage = event => {
      messages.push(String(event.data));
    };
    const { user } = renderWithProviders(<VirtualConsoleView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project } },
        },
        {
          request: {
            query: UpdateProjectVirtualConsoleDocument,
            variables: {
              input: {
                publicId: 'proj-1',
                virtualConsole: {
                  schemaVersion: 1,
                  width: 1024,
                  height: 720,
                  snap: 1,
                  pages: [{ id: pageId, name: 'Page 1', controls: [] }],
                },
              },
            },
          },
          error: new Error('network'),
        },
      ],
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });
    await user.click(screen.getByText('Canvas'));
    const width = screen.getByLabelText('Width');
    await user.clear(width);
    await user.type(width, '1024');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({ color: 'red' }));
    });
    expect(messages).toEqual([]);
    channel.close();
  });

  it('moves the splitter with arrow keys and ignores other keys', async () => {
    renderWithProviders(<VirtualConsoleView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project } },
        },
      ],
    });

    const split = await screen.findByTestId('virtual-console-split');
    const splitter = screen.getByRole('separator', { name: 'Resize panels' });
    vi.spyOn(split, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      bottom: 400,
      right: 400,
      width: 400,
      height: 400,
      toJSON: () => ({}),
    });

    fireEvent.pointerMove(splitter, { clientX: 50, pointerId: 1 });
    expect(split).toHaveStyle({ gridTemplateColumns: '4fr 6px 1fr' });

    fireEvent.keyDown(splitter, { key: 'a' });
    fireEvent.keyDown(splitter, { key: 'ArrowLeft' });
    expect(split).not.toHaveStyle({ gridTemplateColumns: '4fr 6px 1fr' });
    fireEvent.keyDown(splitter, { key: 'ArrowRight' });
  });

  it('does not delete a control when Backspace is typed in an input', async () => {
    const buttonId = '22222222-2222-4222-8222-222222222222';
    const projectWithButton = {
      ...project,
      virtualConsole: {
        ...virtualConsole,
        pages: [
          {
            ...virtualConsole.pages[0],
            controls: [
              {
                __typename: 'VirtualConsoleControlDto',
                id: buttonId,
                type: 'button',
                x: 40,
                y: 50,
                width: 80,
                height: 40,
                label: 'Go',
                backgroundColor: '#111111',
                borderWidth: null,
                borderColor: null,
                orientation: null,
                foregroundColor: null,
                fontFamily: null,
                fontSize: null,
                fontWeight: null,
                valueType: null,
                channelBindings: null,
                children: [],
              },
            ],
          },
        ],
      },
    };

    const { user } = renderWithProviders(<VirtualConsoleView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project: projectWithButton } },
        },
      ],
    });

    await user.click(await screen.findByTestId(`virtual-console-control-${buttonId}`));
    fireEvent.keyDown(screen.getByLabelText('Label'), { key: 'Backspace' });
    expect(screen.getByTestId(`virtual-console-control-${buttonId}`)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'a' });
    expect(screen.getByTestId(`virtual-console-control-${buttonId}`)).toBeInTheDocument();
  });

  it('pastes a copied control on the canvas at the snapped cursor', async () => {
    const buttonId = '22222222-2222-4222-8222-222222222222';
    const projectWithButton = {
      ...project,
      virtualConsole: {
        ...virtualConsole,
        snap: 8,
        pages: [
          {
            ...virtualConsole.pages[0],
            controls: [
              {
                __typename: 'VirtualConsoleControlDto',
                id: buttonId,
                type: 'button',
                x: 40,
                y: 50,
                width: 80,
                height: 40,
                label: 'Go',
                backgroundColor: '#111111',
                borderWidth: null,
                borderColor: null,
                orientation: null,
                foregroundColor: '#ffffff',
                fontFamily: null,
                fontSize: null,
                fontWeight: null,
                valueType: null,
                channelBindings: null,
                children: [],
              },
            ],
          },
        ],
      },
    };

    const { user } = renderWithProviders(<VirtualConsoleView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project: projectWithButton } },
        },
      ],
    });

    const canvas = await screen.findByTestId('virtual-console-canvas');
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      bottom: 720,
      right: 1280,
      width: 1280,
      height: 720,
      toJSON: () => ({}),
    });

    fireEvent.keyDown(window, { key: 'c', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'v', ctrlKey: true });
    expect(screen.getAllByTestId('virtual-console-button')).toHaveLength(1);

    await user.click(screen.getByTestId(`virtual-console-control-${buttonId}`));
    fireEvent.keyDown(window, { key: 'v', ctrlKey: true });
    expect(screen.getAllByTestId('virtual-console-button')).toHaveLength(1);

    fireEvent.keyDown(window, { key: 'c', ctrlKey: true });
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Stop' } });
    fireEvent.keyDown(window, { key: 'v', ctrlKey: true });

    const originPaste = screen.getByText('Go (1)').closest('[data-testid^="virtual-console-control-"]');
    expect(originPaste).toHaveStyle({ left: '0px', top: '0px', zIndex: '1' });
    expect(originPaste?.parentElement).toBe(canvas);
    expect(screen.getByLabelText('Label')).toHaveValue('Go (1)');
    expect(screen.getByLabelText('X')).toHaveValue('0');
    expect(screen.getByLabelText('Y')).toHaveValue('0');
    expect(screen.getByText('Stop')).toBeInTheDocument();

    await user.click(screen.getByTestId(`virtual-console-control-${buttonId}`));
    fireEvent.pointerMove(canvas, { clientX: 100, clientY: 70 });
    fireEvent.keyDown(window, { key: 'v', ctrlKey: true });

    const snapped = screen
      .getAllByText('Go (1)')
      .map(node => node.closest('[data-testid^="virtual-console-control-"]'));
    const cursorPaste = snapped.find(node => node !== originPaste);
    expect(cursorPaste).toHaveStyle({ left: '104px', top: '72px', zIndex: '1' });
    expect(cursorPaste?.parentElement).toBe(canvas);
    expect(screen.getByLabelText('X')).toHaveValue('104');
    expect(screen.getByLabelText('Y')).toHaveValue('72');

    await user.click(screen.getByText('Canvas'));
    fireEvent.pointerMove(canvas, { clientX: 16, clientY: 24 });
    fireEvent.keyDown(window, { key: 'v', metaKey: true });

    const canvasPaste = screen
      .getAllByText('Go (1)')
      .map(node => node.closest('[data-testid^="virtual-console-control-"]'))
      .find(node => node !== originPaste && node !== cursorPaste);
    expect(canvasPaste).toHaveStyle({ left: '16px', top: '24px', zIndex: '1' });
    expect(canvasPaste?.parentElement).toBe(canvas);
    expect(screen.getByLabelText('X')).toHaveValue('16');
    expect(screen.getByLabelText('Y')).toHaveValue('24');
    expect(screen.getAllByTestId('virtual-console-button')).toHaveLength(4);
  });

  it('pastes a copied control into the selected frame using local coordinates', async () => {
    const buttonId = '22222222-2222-4222-8222-222222222222';
    const frameId = '33333333-3333-4333-8333-333333333333';
    const frame = {
      __typename: 'VirtualConsoleControlDto' as const,
      id: frameId,
      type: 'frame',
      x: 200,
      y: 40,
      width: 220,
      height: 180,
      label: 'Group',
      backgroundColor: '#1a1b1e',
      borderWidth: 2,
      borderColor: '#868e96',
      orientation: null,
      foregroundColor: null,
      fontFamily: null,
      fontSize: null,
      fontWeight: null,
      valueType: null,
      channelBindings: null,
      children: [],
    };
    const projectWithFrame = {
      ...project,
      virtualConsole: {
        ...virtualConsole,
        snap: 8,
        pages: [
          {
            ...virtualConsole.pages[0],
            controls: [
              {
                __typename: 'VirtualConsoleControlDto',
                id: buttonId,
                type: 'button',
                x: 40,
                y: 50,
                width: 80,
                height: 40,
                label: 'Go',
                backgroundColor: '#111111',
                borderWidth: null,
                borderColor: null,
                orientation: null,
                foregroundColor: '#ffffff',
                fontFamily: null,
                fontSize: null,
                fontWeight: null,
                valueType: null,
                channelBindings: null,
                children: [],
              },
              frame,
            ],
          },
        ],
      },
    };

    const { user } = renderWithProviders(<VirtualConsoleView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project: projectWithFrame } },
        },
      ],
    });

    const canvas = await screen.findByTestId('virtual-console-canvas');
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      bottom: 720,
      right: 1280,
      width: 1280,
      height: 720,
      toJSON: () => ({}),
    });

    await user.click(screen.getByTestId(`virtual-console-control-${buttonId}`));
    fireEvent.keyDown(window, { key: 'c', ctrlKey: true });
    await user.click(screen.getByTestId(`virtual-console-control-${frameId}`));

    const header = frameHeaderHeight({ fontSize: undefined });
    fireEvent.pointerMove(canvas, { clientX: frame.x + 17, clientY: frame.y + header + 15 });
    fireEvent.keyDown(window, { key: 'v', ctrlKey: true });

    const frameElement = screen.getByTestId(`virtual-console-control-${frameId}`);
    const pasted = screen.getByText('Go (1)').closest('[data-testid^="virtual-console-control-"]');
    expect(pasted).toHaveStyle({ left: '16px', top: '16px', zIndex: '1' });
    expect(pasted?.parentElement).toHaveAttribute('data-testid', 'virtual-console-frame-client');
    expect(frameElement.contains(pasted)).toBe(true);
    expect(screen.getByTestId(`virtual-console-control-${buttonId}`).parentElement).toBe(canvas);
    expect(screen.getByLabelText('Label')).toHaveValue('Go (1)');
    expect(screen.getByLabelText('X')).toHaveValue('16');
    expect(screen.getByLabelText('Y')).toHaveValue('16');
  });

  it('does not paste in play mode', async () => {
    const buttonId = '22222222-2222-4222-8222-222222222222';
    const projectWithButton = {
      ...project,
      virtualConsole: {
        ...virtualConsole,
        pages: [
          {
            ...virtualConsole.pages[0],
            controls: [
              {
                __typename: 'VirtualConsoleControlDto',
                id: buttonId,
                type: 'button',
                x: 40,
                y: 50,
                width: 80,
                height: 40,
                label: 'Go',
                backgroundColor: '#111111',
                borderWidth: null,
                borderColor: null,
                orientation: null,
                foregroundColor: null,
                fontFamily: null,
                fontSize: null,
                fontWeight: null,
                valueType: null,
                channelBindings: null,
                children: [],
              },
            ],
          },
        ],
      },
    };

    renderWithProviders(<VirtualConsoleView mode="play" projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project: projectWithButton } },
        },
      ],
    });

    const canvas = await screen.findByTestId('virtual-console-canvas');
    fireEvent.click(screen.getByTestId(`virtual-console-control-${buttonId}`));
    fireEvent.pointerMove(canvas, { clientX: 80, clientY: 60 });
    fireEvent.keyDown(window, { key: 'c', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'v', metaKey: true });
    expect(screen.getAllByTestId('virtual-console-button')).toHaveLength(1);
  });

  it('ignores copy and paste while an input is focused', async () => {
    const buttonId = '22222222-2222-4222-8222-222222222222';
    const projectWithButton = {
      ...project,
      virtualConsole: {
        ...virtualConsole,
        pages: [
          {
            ...virtualConsole.pages[0],
            controls: [
              {
                __typename: 'VirtualConsoleControlDto',
                id: buttonId,
                type: 'button',
                x: 40,
                y: 50,
                width: 80,
                height: 40,
                label: 'Go',
                backgroundColor: '#111111',
                borderWidth: null,
                borderColor: null,
                orientation: null,
                foregroundColor: null,
                fontFamily: null,
                fontSize: null,
                fontWeight: null,
                valueType: null,
                channelBindings: null,
                children: [],
              },
            ],
          },
        ],
      },
    };

    const { user } = renderWithProviders(<VirtualConsoleView projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project: projectWithButton } },
        },
      ],
    });

    const canvas = await screen.findByTestId('virtual-console-canvas');
    await user.click(screen.getByTestId(`virtual-console-control-${buttonId}`));
    const label = screen.getByLabelText('Label');
    fireEvent.pointerMove(canvas, { clientX: 80, clientY: 60 });
    fireEvent.keyDown(label, { key: 'c', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'v', ctrlKey: true });
    expect(screen.getAllByTestId('virtual-console-button')).toHaveLength(1);

    fireEvent.keyDown(window, { key: 'c', ctrlKey: true });
    fireEvent.keyDown(label, { key: 'v', metaKey: true });
    expect(screen.getAllByTestId('virtual-console-button')).toHaveLength(1);
  });

  it('reloads the play window when the editor saves the console', async () => {
    vi.mocked(reloadVirtualConsolePlayWindow).mockClear();
    renderWithProviders(<VirtualConsoleView mode="play" projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project } },
        },
      ],
    });

    await screen.findByRole('tab', { name: 'Page 1' });
    const channel = new BroadcastChannel('dmx-virtual-console:proj-1');
    channel.postMessage('saved');
    await waitFor(() => {
      expect(reloadVirtualConsolePlayWindow).toHaveBeenCalledTimes(1);
    });
    channel.close();
  });

  it('requests fullscreen and refetches when the play window becomes visible', async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    document.documentElement.requestFullscreen = requestFullscreen;

    const { user } = renderWithProviders(<VirtualConsoleView mode="play" projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project } },
        },
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project } },
        },
      ],
    });

    await user.click(await screen.findByRole('button', { name: 'Fullscreen' }));
    expect(requestFullscreen).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
});
