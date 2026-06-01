'use client';

import { useParams } from 'next/navigation';

const EditFixturePage = () => {
  const parameters = useParams();
  const fixtureId = parameters.fixtureId;

  return <div>Edit fixture {fixtureId}</div>;
};

export default EditFixturePage;
