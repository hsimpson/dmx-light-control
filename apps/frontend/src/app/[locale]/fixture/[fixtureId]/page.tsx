'use client';

import { useParams } from 'next/navigation';
import FixtureForm from '../_components/fixture-form';

const EditFixturePage = () => {
  const { fixtureId } = useParams<{ fixtureId: string }>();

  return (
    <>
      <FixtureForm fixtureId={fixtureId} />
    </>
  );
};

export default EditFixturePage;
