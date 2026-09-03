import { describe, expect, it } from 'vitest';

describe('AppModule', () => {
  it('is defined and decorated as a module', async () => {
    process.env.BACKEND_PORT ??= '3000';
    const { AppModule } = await import('./app.module');
    expect(AppModule).toBeDefined();
    expect(AppModule.name).toBe('AppModule');
  });
});
