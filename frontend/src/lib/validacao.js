// Máscaras e validações de formulário compartilhadas pelas telas de cadastro.
// Cada validador devolve { ok, msg } ou null quando o campo vazio é neutro.

export function mascaraCPF(valor) {
  let v = valor.replace(/\D/g, '').slice(0, 11);
  return v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function mascaraTelefone(valor) {
  let v = valor.replace(/\D/g, '').slice(0, 11);
  if (v.length <= 10) v = v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  else v = v.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  return v.replace(/-$/, '');
}

export function mascaraCEP(valor) {
  let v = valor.replace(/\D/g, '').slice(0, 8);
  return v.length > 5 ? v.slice(0, 5) + '-' + v.slice(5) : v;
}

export function validarNome(v) {
  return v.trim().length < 3 ? { ok: false, msg: 'Mínimo de 3 caracteres' } : { ok: true, msg: 'Nome válido ' };
}

export function validarEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? { ok: true, msg: 'Email válido ' } : { ok: false, msg: 'Email inválido' };
}

// Mesma regra do backend (UsuarioService.senhaFraca): 8+ caracteres, com letra e número.
export function regrasSenha(v) {
  return { len: v.length >= 8, letra: /\p{L}/u.test(v), num: /\d/.test(v) };
}
export function validarSenha(v, opcional) {
  if (!v && opcional) return null;
  const r = regrasSenha(v);
  const ok = r.len && r.letra && r.num;
  return { ok, msg: ok ? 'A senha atende aos requisitos' : 'A senha ainda não atende a todos os requisitos' };
}

export function cpfValido(v) {
  v = v.replace(/\D/g, '');
  if (v.length !== 11 || /^(\d)\1{10}$/.test(v)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(v[i]) * (10 - i);
  let r = 11 - (s % 11); const d1 = r >= 10 ? 0 : r;
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(v[i]) * (11 - i);
  r = 11 - (s % 11); const d2 = r >= 10 ? 0 : r;
  return parseInt(v[9]) === d1 && parseInt(v[10]) === d2;
}
export function validarCPF(v) {
  if (!v.replace(/\D/g, '').length) return null;
  return cpfValido(v) ? { ok: true, msg: 'CPF válido ' } : { ok: false, msg: 'CPF inválido' };
}

export function validarTelefone(v) {
  const d = v.replace(/\D/g, '');
  if (!d.length) return null;
  if (d.length < 10 || d.length > 11) return { ok: false, msg: 'Telefone inválido (mínimo 10 dígitos)' };
  return { ok: true, msg: 'Telefone válido ' };
}

// Nascimento: não futuro e no máximo 100 anos atrás (mesma regra do backend).
export function validarNascimento(v) {
  if (!v) return null;
  const d = new Date(v + 'T00:00:00'), hoje = new Date(), limite = new Date();
  limite.setFullYear(hoje.getFullYear() - 100);
  const ok = !isNaN(d) && d <= hoje && d >= limite;
  return { ok, msg: ok ? '' : 'Informe uma data entre ' + limite.toLocaleDateString('pt-BR') + ' e hoje' };
}

export const hoje = () => new Date().toISOString().slice(0, 10);

export function idade(dataNasc) {
  if (!dataNasc) return null;
  const nasc = new Date(dataNasc + ' ');
  let a = new Date().getFullYear() - nasc.getFullYear();
  const m = new Date().getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && new Date().getDate() < nasc.getDate())) a--;
  return a;
}

/** Busca endereço no ViaCEP. Resolve com os campos ou null se o CEP não existir. */
export async function buscarCep(cep) {
  const d = await fetch('https://viacep.com.br/ws/' + cep.replace(/\D/g, '') + '/json/').then((r) => r.json());
  if (d.erro) return null;
  return { endereco: d.logradouro || '', bairro: d.bairro || '', cidade: d.localidade || '', estado: d.uf || '' };
}

/** Classes is-valid/is-invalid a partir de um resultado de validação. */
export const classeValidacao = (r) => (r ? (r.ok ? ' is-valid' : ' is-invalid') : '');

/** Enter avança para o próximo campo visível do form; no último, envia. */
export function enterAvanca(e, validarCampo) {
  if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
  const atual = e.target;
  if (!atual.matches('input, select')) return;
  const campos = Array.from(e.currentTarget.querySelectorAll('input, select'))
    .filter((c) => c.type !== 'hidden' && c.type !== 'file' && !c.disabled && c.offsetParent !== null && !c.classList.contains('campo-data-nativo'));
  const i = campos.indexOf(atual);
  if (i === -1) return;
  e.preventDefault();
  if (validarCampo && !validarCampo(atual)) return;
  if (campos[i + 1]) campos[i + 1].focus();
  else e.currentTarget.requestSubmit();
}
