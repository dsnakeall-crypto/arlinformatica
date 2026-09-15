import { expect, test } from '@playwright/test';
import { api, login, uniqueDocument } from './helpers';

test('Histórico de alterações exibe auditoria em linguagem legível', async ({ page }) => {
  await login(page);
  const suffix = Date.now();
  const originalName = `Cliente Histórico ${suffix}`;
  const replacementName = `Cliente Histórico Novo ${suffix}`;

  const original = await api(page, '/clients', 'POST', {
    name: originalName,
    document: uniqueDocument(suffix),
    phone: '35999994001',
    postal_code: '37160000',
    street: 'Rua Histórico',
    number: '10',
    district: 'Centro',
    city: 'Campos Gerais',
    state: 'MG',
  });
  const replacement = await api(page, '/clients', 'POST', {
    name: replacementName,
    document: uniqueDocument(suffix + 1),
    phone: '35999994002',
    postal_code: '37160000',
    street: 'Rua Histórico',
    number: '20',
    district: 'Centro',
    city: 'Campos Gerais',
    state: 'MG',
  });
  expect(original.status, JSON.stringify(original.body)).toBe(201);
  expect(replacement.status, JSON.stringify(replacement.body)).toBe(201);

  const equipment = await api(page, '/catalogs/equipment');
  const equipmentType = equipment.body?.[0];
  expect(equipmentType).toBeTruthy();

  const created = await api(page, '/orders', 'POST', {
    client_id: original.body.id,
    equipment_type_id: equipmentType.id,
    attendance_type: 'bench',
    reported_problem: 'Teste do histórico legível',
    checklist: [],
    items: [],
  });
  expect(created.status, JSON.stringify(created.body)).toBe(201);

  const edited = await api(page, `/orders/${created.body.id}`, 'PATCH', {
    client_id: replacement.body.id,
    equipment_description: 'Notebook histórico + carregador',
  });
  expect(edited.status, JSON.stringify(edited.body)).toBe(200);

  const history = await api(page, `/orders/${created.body.id}/audit-history`);
  expect(history.status, JSON.stringify(history.body)).toBe(200);
  const edit = history.body.find((entry: any) => entry.action === 'Alteração da OS');
  expect(edit, 'O histórico preservado deve conter a edição da OS').toBeTruthy();
  expect(edit.changes).toContain(`Cliente alterado de ${originalName} para ${replacementName}`);
  expect(edit.changes).toContain(`Equipamento alterado de ${equipmentType.name} para Notebook histórico + carregador`);
  expect(edit.changes).not.toContain('service_order.edited');
  expect(edit.changes).not.toContain('client_id');
  expect(edit.changes).not.toContain('equipment_description');
});
