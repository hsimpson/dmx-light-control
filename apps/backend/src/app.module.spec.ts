/// <reference types="vitest/globals" />

const ORIGINAL_ENV = process.env;

beforeAll(() => {
  process.env = {
    ...ORIGINAL_ENV,
    BACKEND_PORT: '3000',
    POSTGRES_USER: 'u',
    POSTGRES_PASSWORD: 'p',
    POSTGRES_HOST: 'h',
    POSTGRES_PORT: '5432',
    POSTGRES_DB: 'db',
  };
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe('AppModule', () => {
  it('is defined and decorated as a module', async () => {
    const { AppModule } = await import('./app.module');
    expect(AppModule).toBeDefined();
    expect(AppModule.name).toBe('AppModule');
  });
});
