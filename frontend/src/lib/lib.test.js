// Checagens das regras de formulário e ordenação compartilhadas (node --test).
import assert from 'node:assert/strict';
import test from 'node:test';
import { alternarOrdem, ordenar } from './ordenacao.js';
import { cpfValido, mascaraCEP, mascaraCPF, mascaraTelefone, regrasSenha, validarNascimento } from './validacao.js';

test('máscaras', () => {
  assert.equal(mascaraCPF('52998224725'), '529.982.247-25');
  assert.equal(mascaraCPF('5299822472599'), '529.982.247-25');
  assert.equal(mascaraTelefone('11987654321'), '(11) 98765-4321');
  assert.equal(mascaraTelefone('1133334444'), '(11) 3333-4444');
  assert.equal(mascaraCEP('01310100'), '01310-100');
});

test('CPF', () => {
  assert.ok(cpfValido('529.982.247-25'));
  assert.ok(!cpfValido('529.982.247-24'));
  assert.ok(!cpfValido('111.111.111-11'));
});

test('senha segue a regra do backend (8+, letra e número)', () => {
  assert.deepEqual(regrasSenha('abc12345'), { len: true, letra: true, num: true });
  assert.equal(regrasSenha('12345678').letra, false);
});

test('nascimento: nem futuro nem mais de 100 anos', () => {
  assert.equal(validarNascimento(''), null);
  assert.equal(validarNascimento('2000-05-10').ok, true);
  assert.equal(validarNascimento('2999-01-01').ok, false);
  assert.equal(validarNascimento('1800-01-01').ok, false);
});

test('ordenação', () => {
  const lista = [{ n: 'Élio', d: '2026-01-02' }, { n: 'ana', d: '2025-01-01' }, { n: 'Bruno', d: null }];
  assert.deepEqual(ordenar(lista, { campo: 'n' }).map((x) => x.n), ['ana', 'Bruno', 'Élio']);
  assert.deepEqual(ordenar(lista, { campo: 'd', tipo: 'data', direcao: 'desc' }).map((x) => x.n), ['Élio', 'ana', 'Bruno']);
  assert.deepEqual(alternarOrdem({ campo: 'n', direcao: 'asc' }, 'n'), { campo: 'n', direcao: 'desc' });
  assert.deepEqual(alternarOrdem({ campo: 'n', direcao: 'desc' }, 'd', 'data'), { campo: 'd', tipo: 'data', direcao: 'asc' });
});
