import { expect, test } from '@playwright/test';
import { api, login } from './helpers';

for (const [loginName, expected] of [['e2e.admin', 403], ['e2e.funcionario', 403]] as const) {
  test(`${loginName} não administra usuários nem restaura backup`, async ({ page }) => {
    await login(page);
    const backup = await api(page, '/backups', 'POST');
    expect(backup.status).toBe(201);
    const backupId = backup.body?.id;
    expect(backupId).toBeTruthy();

    await page.context().clearCookies();
    await login(page, loginName);
    expect((await api(page, '/users')).status).toBe(expected);
    expect((await api(page, `/backups/${backupId}/restore`, 'POST', { confirmation: 'RESTAURAR BACKUP' })).status).toBe(expected);
    expect((await api(page, '/orders')).status).toBe(200);
  });
}

test('Master acessa usuários, backup, fotos e diagnóstico sem expor VAPID privada', async ({ page }) => {
  await login(page);
  expect((await api(page, '/users')).status).toBe(200);
  expect((await api(page, '/backups')).status).toBe(200);
  expect((await api(page, '/storage/photos/preview', 'POST', { filter: 'older_1' })).status).toBe(200);
  const diagnostic = await api(page, '/diagnostics');
  expect(diagnostic.status).toBe(200);
  expect(JSON.stringify(diagnostic.body)).not.toContain('private_key');
});
