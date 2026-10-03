import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes, webcrypto } from 'node:crypto';
import { expenseRequestId, photoSha256, expensePhotoHash } from '../../resources/js/expense-browser-crypto.ts';

test('UUID de requisição funciona sem randomUUID, preserva versão 4 e não repete IDs', () => {
  const source = { getRandomValues: bytes => webcrypto.getRandomValues(bytes) };
  const ids = Array.from({ length: 1000 }, () => expenseRequestId(source));
  assert.equal(new Set(ids).size, ids.length);
  ids.forEach(id => assert.match(id, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/));
});
test('hash local SHA-256 coincide com implementação nativa, inclusive limites de bloco e foto grande', async () => {
  for (const bytes of [Buffer.from(''), Buffer.from('abc'), Buffer.from('Fatura João e Carol'), ...[55,56,63,64,65,120,1024,1000000].map(n => randomBytes(n))]) {
    assert.equal(photoSha256(bytes), createHash('sha256').update(bytes).digest('hex'));
  }
  const input = new TextEncoder().encode('abc').buffer;
  assert.equal(await expensePhotoHash(input), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});
