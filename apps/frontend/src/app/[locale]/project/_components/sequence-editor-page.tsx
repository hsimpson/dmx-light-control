'use client';

import { Loading } from '@/components/loading';
import { useTranslation } from '@/lib/i18n/use-translation';
import {
  AddProjectFunctionDocument,
  GetProjectDocument,
  ProjectFunctionType,
  UpdateProjectFunctionDocument,
} from '@/shared/types/graphql/graphql';
import { useMutation, useQuery } from '@apollo/client/react';
import { Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import {
  draftToSequenceInput,
  functionToDraft,
  newFunctionDraft,
  projectSequenceFixtures,
  type ProjectFunctionDraft,
} from './project-function-mapping';
import SequenceEditor from './sequence-editor';

type SequenceEditorPageProperties = {
  projectPublicId: string;
  functionPublicId?: string;
};

const SequenceEditorPage = ({ projectPublicId, functionPublicId }: SequenceEditorPageProperties) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, loading } = useQuery(GetProjectDocument, { variables: { publicId: projectPublicId } });
  const [addProjectFunction, { loading: adding }] = useMutation(AddProjectFunctionDocument);
  const [updateProjectFunction, { loading: updating }] = useMutation(UpdateProjectFunctionDocument);
  const project = data?.project;
  const fixtures = useMemo(() => projectSequenceFixtures(project), [project]);

  if (loading && !data) {
    return <Loading />;
  }
  if (!project) {
    return <Text>{t({ id: 'ProjectDetail.notFound', defaultMessage: 'Project not found' })}</Text>;
  }
  const existing = functionPublicId ? project.projectFunctions.find(fn => fn.publicId === functionPublicId) : undefined;
  if (functionPublicId && !existing) {
    return <Text>{t({ id: 'ProjectFunction.notFound', defaultMessage: 'Function not found' })}</Text>;
  }

  const refetchQueries = [{ query: GetProjectDocument, variables: { publicId: projectPublicId } }];
  const save = async (draft: ProjectFunctionDraft): Promise<boolean> => {
    const sequence = draftToSequenceInput(draft);
    try {
      if (functionPublicId) {
        await updateProjectFunction({
          variables: { input: { publicId: functionPublicId, name: draft.name.trim(), sequence } },
          refetchQueries,
        });
      } else {
        const result = await addProjectFunction({
          variables: {
            input: { projectPublicId, name: draft.name.trim(), type: ProjectFunctionType.Sequence, sequence },
          },
          refetchQueries,
        });
        const createdId = result.data?.addProjectFunction.publicId;
        if (createdId) {
          router.replace(`/project/${projectPublicId}/functions/${createdId}`);
        }
      }
      return true;
    } catch (error) {
      notifications.show({
        color: 'red',
        message:
          error instanceof Error
            ? error.message
            : t({ id: 'ProjectFunction.saveFailed', defaultMessage: 'Could not save the function.' }),
      });
      return false;
    }
  };

  return (
    <SequenceEditor
      key={functionPublicId ?? 'new'}
      fixtures={fixtures}
      initial={existing ? functionToDraft(existing) : newFunctionDraft()}
      saving={adding || updating}
      onSave={save}
      onLeave={() => {
        router.push(`/project/${projectPublicId}/functions`);
      }}
    />
  );
};

export default SequenceEditorPage;
