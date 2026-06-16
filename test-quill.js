const { JSDOM } = require('jsdom');
const dom = new JSDOM('<body><div id="editor"></div></body>', { url: "http://localhost" });
global.document = dom.window.document;
global.window = dom.window;
global.HTMLElement = dom.window.HTMLElement;
global.Node = dom.window.Node;
global.Element = dom.window.Element;
global.Text = dom.window.Text;
global.MutationObserver = dom.window.MutationObserver;
global.getComputedStyle = dom.window.getComputedStyle;
global.navigator = dom.window.navigator;

import('quill').then(({ default: Quill }) => {
  const quill = new Quill(document.getElementById('editor'), {
    theme: 'snow'
  });
  quill.setText('Item 1\nItem 2\n');
  quill.formatLine(0, 6, 'list', 'unchecked');
  quill.formatLine(7, 6, 'list', 'checked');
  console.log(quill.root.innerHTML);
}).catch(console.error);
