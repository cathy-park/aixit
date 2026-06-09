global.document = { addEventListener: () => {} };
global.window = {};
global.navigator = {};
const rq = require('react-quill-new');
const Quill = rq.Quill;
const Parchment = Quill.import('parchment');
console.log("Parchment keys:", Object.keys(Parchment));
console.log("Attributor:", !!Parchment.Attributor);
if (Parchment.Attributor) {
    console.log("Attributor keys:", Object.keys(Parchment.Attributor));
}
