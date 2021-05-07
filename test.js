//first install package: npm install sanitize-html --save
var sanitizeHtml = require('sanitize-html');
var dirty = 'This is test <a style="opacity: 0.1" href="javascript:void(0)">Link</a>';
var clean = sanitizeHtml(dirty);
console.log(clean);