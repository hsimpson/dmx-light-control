const defaultPageId = '11111111-1111-4111-8111-111111111111';

export const mockVirtualConsoleDto = {
  __typename: 'VirtualConsoleDto' as const,
  schemaVersion: 1,
  width: 1280,
  height: 720,
  snap: 1,
  pages: [{ __typename: 'VirtualConsolePageDto' as const, id: defaultPageId, name: 'Page 1', controls: [] }],
};

const defaultNow = new Date('2026-01-01T00:00:00.000Z');

export type MockProjectDto = {
  __typename: 'ProjectDto';
  publicId: string;
  name: string;
  environmentType: string;
  roomWidth: number;
  roomLength: number;
  roomHeight: number;
  createdAt: Date;
  updatedAt: Date;
  virtualConsole: typeof mockVirtualConsoleDto | null;
  projectFixtures: unknown[];
  project3dObjects: unknown[];
};

export type MockProjectDtoOverrides = Partial<Omit<MockProjectDto, '__typename'>>;

export function mockProjectDto(overrides: MockProjectDtoOverrides = {}): MockProjectDto {
  const { virtualConsole = mockVirtualConsoleDto, ...rest } = overrides;

  return {
    __typename: 'ProjectDto',
    publicId: 'proj-1',
    name: 'Main Show',
    environmentType: 'SimpleGround',
    roomWidth: 10,
    roomLength: 8,
    roomHeight: 5,
    createdAt: defaultNow,
    updatedAt: defaultNow,
    projectFixtures: [],
    project3dObjects: [],
    virtualConsole,
    ...rest,
  };
}

export function mockGetProjectResult(overrides: MockProjectDtoOverrides = {}) {
  return { data: { project: mockProjectDto(overrides) } };
}
