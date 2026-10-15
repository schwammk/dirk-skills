// Parse every <pre class="mermaid"> block of an HTML file with the real Mermaid parser.
// Run through validate-mermaid.sh, which installs mermaid + jsdom next to this file.
import { JSDOM } from 'jsdom';
import fs from 'node:fs';

const file = process.argv[2];
if (!file) { console.error('usage: validate-mermaid.sh <report.html>'); process.exit(2); }

const dom = new JSDOM('<!doctype html><body></body>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
const mermaid = (await import('mermaid')).default;

const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

const html = fs.readFileSync(file, 'utf8');
const pattern = /<pre class="mermaid">([\s\S]*?)<\/pre>/g;
let match; let total = 0; let bad = 0;
while ((match = pattern.exec(html)) !== null) {
  total += 1;
  const text = decode(match[1]).trim();
  try {
    await mermaid.parse(text);
  } catch (error) {
    bad += 1;
    const firstLine = text.split('\n')[0];
    console.log(`BAD diagram ${total} (${firstLine}): ${String(error.message).split('\n').slice(0, 3).join(' | ')}`);
  }
}
console.log(`mermaid ${total} diagrams, ${bad} with errors`);
process.exit(bad === 0 ? 0 : 1);
