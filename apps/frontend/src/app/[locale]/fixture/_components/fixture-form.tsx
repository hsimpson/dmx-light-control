'use client';

import { GetFixtureDocument } from '@/shared/types/graphql/graphql';
import { useQuery } from '@apollo/client/react';
import { Button, TextInput } from '@mantine/core';
import { schemaResolver, useForm } from '@mantine/form';
import { useEffect } from 'react';
import { z } from 'zod/v4';

type FixtureFormProps = {
  fixtureId?: string;
};

type FixtureFormValues = {
  fixtureName: string;
};

const FixtureForm = ({ fixtureId }: FixtureFormProps) => {
  const { data, loading } = useQuery(GetFixtureDocument, {
    variables: { fixtureId: fixtureId ?? '' },
    skip: !fixtureId,
  });

  const schema = z.object({
    fixtureName: z.string().min(1, { message: 'Fixture name is required' }),
  });

  console.log(data?.fixture?.name);
  const form = useForm<FixtureFormValues>({
    mode: 'controlled',
    initialValues: {
      fixtureName: '',
    },
    validate: schemaResolver(schema, { sync: true }),
  });

  useEffect(() => {
    if (data?.fixture) {
      form.initialize({
        fixtureName: data.fixture.name,
      });
    }
  }, [data?.fixture]);

  return (
    <form onSubmit={form.onSubmit(console.log)}>
      <TextInput
        label="Name"
        placeholder="Name"
        key={form.key('fixtureName')}
        {...form.getInputProps('fixtureName')}
      />
      <Button type="submit" mt="sm">
        Submit
      </Button>
    </form>
  );
};

export default FixtureForm;
