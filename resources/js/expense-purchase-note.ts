/** Hide only the known photo-import boilerplate; never change the stored note. */
export function purchaseNote(value?: string | null): string {
  return (value || '').split(/\r?\n/).map(line => line
    .replace(/^Cadastro por foto\. Dados conferidos pelo usuário\.\s*/, '')
    .trim()).filter(line => line && !['Importado por foto', 'Importado por foto.'].includes(line)).join('\n');
}
