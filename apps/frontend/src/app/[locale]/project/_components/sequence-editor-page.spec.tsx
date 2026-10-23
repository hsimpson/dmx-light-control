import {
  AddProjectFunctionDocument,
  GetProjectDocument,
  ProjectFunctionType,
  SequenceDirection,
  SequenceRunOrder,
  UpdateProjectFunctionDocument,
} from '@/shared/types/graphql/graphql';
import { mockGetProjectResult } from '@/testhelpers/mock-project-dto';
import { renderWithProviders } from '@/testhelpers/render-with-providers';
import { notifications } from '@mantine/notifications';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectFunctionDraft } from './project-function-mapping';
import SequenceEditorPage from './sequence-editor-page';

const push = vi.hoisted(() => vi.fn());
const replace = vi.hoisted(() => vi.fn());
const throwOnSave = vi.hoisted(() => ({ current: false }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

vi.mock('./project-function-mapping', async () => {
  const actual = await vi.importActual<typeof import('./project-function-mapping')>('./project-function-mapping');
  return {
    ...actual,
    draftToSequenceInput: (draft: ProjectFunctionDraft) => {
      if (throwOnSave.current) {
        // The save catch also handles rejections that are not Error instances.
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'nope';
      }
      return actual.draftToSequenceInput(draft);
    },
  };
});

vi.mock('./sequence-editor', () => ({
  default: ({
    initial,
    onSave,
    onLeave,
  }: {
    initial: ProjectFunctionDraft;
    onSave: (draft: ProjectFunctionDraft) => Promise<boolean>;
    onLeave: () => void;
  }) => (
    <div>
      <p>{initial.name || 'blank'}</p>
      <button
        type="button"
        onClick={() => {
          void onSave({
            name: ' Pulse ',
            direction: 'forward',
            runOrder: 'loop',
            steps: [],
            fixturePublicIds: [],
          });
        }}
      >
        save-draft
      </button>
      <button type="button" onClick={onLeave}>
        leave-editor
      </button>
    </div>
  ),
}));

const sequence = {
  direction: SequenceDirection.Forward,
  runOrder: SequenceRunOrder.Loop,
  steps: [],
  fixturePublicIds: [],
};

const projectWith = (functions: unknown[]) => ({
  request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
  result: mockGetProjectResult({ projectFunctions: functions }),
});

const existingFunction = {
  __typename: 'ProjectFunctionDto' as const,
  publicId: 'fn-1',
  name: 'Chase',
  type: ProjectFunctionType.Sequence,
  sequence: {
    __typename: 'SequencePropertiesDto' as const,
    direction: SequenceDirection.Forward,
    runOrder: SequenceRunOrder.Loop,
    steps: [],
    fixturePublicIds: [],
  },
};

const createdFunction = {
  __typename: 'ProjectFunctionDto' as const,
  publicId: 'fn-new',
  name: 'Pulse',
  type: ProjectFunctionType.Sequence,
  sequence: { __typename: 'SequencePropertiesDto' as const, ...sequence },
};

describe('SequenceEditorPage', () => {
  beforeEach(() => {
    push.mockClear();
    replace.mockClear();
    throwOnSave.current = false;
    vi.mocked(notifications.show).mockClear();
  });

  it('creates a function and opens it', async () => {
    const { user } = renderWithProviders(<SequenceEditorPage projectPublicId="proj-1" />, {
      apolloMocks: [
        projectWith([]),
        {
          request: {
            query: AddProjectFunctionDocument,
            variables: {
              input: {
                projectPublicId: 'proj-1',
                name: 'Pulse',
                type: ProjectFunctionType.Sequence,
                sequence,
              },
            },
          },
          result: { data: { addProjectFunction: createdFunction } },
        },
        projectWith([]),
      ],
    });

    expect(await screen.findByText('blank')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'save-draft' }));
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/project/proj-1/functions/fn-new');
    });
  });

  it('stays put when the created function has no id', async () => {
    const { user } = renderWithProviders(<SequenceEditorPage projectPublicId="proj-1" />, {
      apolloMocks: [
        projectWith([]),
        {
          request: {
            query: AddProjectFunctionDocument,
            variables: {
              input: {
                projectPublicId: 'proj-1',
                name: 'Pulse',
                type: ProjectFunctionType.Sequence,
                sequence,
              },
            },
          },
          result: {
            data: {
              addProjectFunction: { ...createdFunction, publicId: null },
            },
          },
        },
      ],
    });

    await user.click(await screen.findByRole('button', { name: 'save-draft' }));
    await waitFor(() => {
      expect(screen.getByText('blank')).toBeInTheDocument();
    });
    expect(replace).not.toHaveBeenCalled();
  });

  it('updates an existing function and leaves the editor', async () => {
    const { user } = renderWithProviders(<SequenceEditorPage projectPublicId="proj-1" functionPublicId="fn-1" />, {
      apolloMocks: [
        projectWith([existingFunction]),
        {
          request: {
            query: UpdateProjectFunctionDocument,
            variables: { input: { publicId: 'fn-1', name: 'Pulse', sequence } },
          },
          result: {
            data: {
              updateProjectFunction: { ...createdFunction, publicId: 'fn-1' },
            },
          },
        },
        projectWith([existingFunction]),
      ],
    });

    expect(await screen.findByText('Chase')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'save-draft' }));
    await waitFor(() => {
      expect(screen.getByText('Chase')).toBeInTheDocument();
    });
    expect(replace).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'leave-editor' }));
    expect(push).toHaveBeenCalledWith('/project/proj-1/functions');
  });

  it('reports a missing project, a missing function, and a failed save', async () => {
    const { unmount } = renderWithProviders(<SequenceEditorPage projectPublicId="proj-1" />, {
      apolloMocks: [
        {
          request: { query: GetProjectDocument, variables: { publicId: 'proj-1' } },
          result: { data: { project: null } },
        },
      ],
    });
    expect(await screen.findByText('Project not found')).toBeInTheDocument();
    unmount();

    const missing = renderWithProviders(<SequenceEditorPage projectPublicId="proj-1" functionPublicId="gone" />, {
      apolloMocks: [projectWith([])],
    });
    expect(await screen.findByText('Function not found')).toBeInTheDocument();
    missing.unmount();

    const failed = renderWithProviders(<SequenceEditorPage projectPublicId="proj-1" />, {
      apolloMocks: [
        projectWith([]),
        {
          request: {
            query: AddProjectFunctionDocument,
            variables: {
              input: {
                projectPublicId: 'proj-1',
                name: 'Pulse',
                type: ProjectFunctionType.Sequence,
                sequence,
              },
            },
          },
          error: new Error('nope'),
        },
      ],
    });
    await failed.user.click(await screen.findByRole('button', { name: 'save-draft' }));
    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({ color: 'red', message: 'nope' }));
    });
  });

  it('shows a generic message when saving throws a non-Error', async () => {
    throwOnSave.current = true;
    const { user } = renderWithProviders(<SequenceEditorPage projectPublicId="proj-1" />, {
      apolloMocks: [projectWith([])],
    });
    await user.click(await screen.findByRole('button', { name: 'save-draft' }));
    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({ color: 'red', message: 'Could not save the function.' }),
      );
    });
  });
});
