const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

const ReactQuill = require('react-quill-new');
const Quill = ReactQuill.Quill;
console.log("Quill exists:", !!Quill);
const Parchment = Quill.import("parchment");
console.log("Parchment:", Object.keys(Parchment));
console.log("Parchment.Attributor:", Parchment.Attributor);
if (Parchment.Attributor) {
  console.log("Parchment.Attributor.Style:", Parchment.Attributor.Style);
}
