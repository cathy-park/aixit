const fs = require('fs');
const css = fs.readFileSync('node_modules/quill/dist/quill.snow.css', 'utf-8');
console.log(css.includes('unchecked'), css.includes('checked'));
