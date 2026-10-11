import test from 'node:test';
import assert from 'node:assert/strict';
import { jsPDF } from 'jspdf';

test('jsPDF atual gera relatorio simples com as primitivas utilizadas pelo ARL', () => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(27, 49, 78);
  doc.setFillColor(190, 16, 58);
  doc.roundedRect(16, 17, 39, 10, 2, 2, 'F');
  const lines = doc.splitTextToSize('Relatorio financeiro de validacao', 100);
  doc.text(lines, 16, 45);
  doc.addPage();
  doc.setPage(2);
  doc.text('Pagina 2 de 2', 194, 288, { align: 'right' });
  assert.equal(doc.getNumberOfPages(), 2);
  const result = doc.output('arraybuffer');
  assert.ok(result instanceof ArrayBuffer);
  assert.ok(result.byteLength > 500);
  const header = new TextDecoder('ascii').decode(result.slice(0, 8));
  assert.match(header, /^%PDF-1\./);
});
