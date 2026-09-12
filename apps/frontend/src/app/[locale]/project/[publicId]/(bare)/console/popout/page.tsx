'use client';

import VirtualConsoleView from '@/app/[locale]/project/_components/virtual-console-view';
import { useParams } from 'next/navigation';

const VirtualConsolePopoutPage = () => {
  const { publicId } = useParams<{ publicId: string }>();
  return <VirtualConsoleView mode="play" projectPublicId={publicId} />;
};

export default VirtualConsolePopoutPage;
