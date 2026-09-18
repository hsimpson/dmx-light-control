import { DEFAULT_PROJECT_DETAIL_TAB } from '@/app/[locale]/project/_components/project-detail-tabs.constants';
import { redirect } from 'next/navigation';

type ProjectDetailRedirectPageProperties = {
  params: Promise<{ publicId: string }>;
};

const ProjectDetailRedirectPage = async ({ params }: ProjectDetailRedirectPageProperties) => {
  const { publicId } = await params;
  redirect(`/project/${publicId}/${DEFAULT_PROJECT_DETAIL_TAB}`);
};

export default ProjectDetailRedirectPage;
