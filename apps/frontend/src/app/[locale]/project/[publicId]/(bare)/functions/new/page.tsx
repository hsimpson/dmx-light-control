'use client';

import SequenceEditorPage from '@/app/[locale]/project/_components/sequence-editor-page';
import { useParams } from 'next/navigation';

const NewProjectFunctionPage = () => {
  const { publicId } = useParams<{ publicId: string }>();
  return <SequenceEditorPage projectPublicId={publicId} />;
};

export default NewProjectFunctionPage;
