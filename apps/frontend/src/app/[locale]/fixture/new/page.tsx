import { DEFAULT_FIXTURE_DETAIL_TAB } from '@/app/[locale]/fixture/_components/fixture-detail-tabs.constants';
import { redirect } from 'next/navigation';

const AddFixtureRedirectPage = () => {
  redirect(`/fixture/new/${DEFAULT_FIXTURE_DETAIL_TAB}`);
};

export default AddFixtureRedirectPage;
