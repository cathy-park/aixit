import { Quill } from 'quill';
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<body><div id="editor"></div></body>');
global.document = dom.window.document;
global.window = dom.window;

const quill = new Quill('#editor', {
  modules: { toolbar: true },
  theme: 'snow'
});
quill.setText('Test\n');
quill.formatLine(0, 4, 'list', 'check');
console.log(quill.root.innerHTML);
