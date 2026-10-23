'use client';

import SequenceEditorPage from '@/app/[locale]/project/_components/sequence-editor-page';
import { useParams } from 'next/navigation';

const EditProjectFunctionPage = () => {
  const { publicId, functionPublicId } = useParams<{ publicId: string; functionPublicId: string }>();
  return <SequenceEditorPage projectPublicId={publicId} functionPublicId={functionPublicId} />;
};

export default EditProjectFunctionPage;
