import { GetProjectDocument, UpdateProjectVirtualConsoleDocument } from '@/shared/types/graphql/graphql';
import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { notifications } from '@mantine/notifications';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VirtualConsoleView from './virtual-console-view';

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
                valueType: null,
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
      valueType: null,
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
                valueType: null,
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
});
