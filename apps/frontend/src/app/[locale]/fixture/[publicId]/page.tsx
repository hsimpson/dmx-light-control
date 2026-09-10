import { DEFAULT_FIXTURE_DETAIL_TAB } from '@/app/[locale]/fixture/_components/fixture-detail-tabs.constants';
import { redirect } from 'next/navigation';

type FixtureDetailRedirectPageProperties = {
  params: Promise<{ publicId: string }>;
};

const FixtureDetailRedirectPage = async ({ params }: FixtureDetailRedirectPageProperties) => {
  const { publicId } = await params;
  redirect(`/fixture/${publicId}/${DEFAULT_FIXTURE_DETAIL_TAB}`);
};

export default FixtureDetailRedirectPage;
