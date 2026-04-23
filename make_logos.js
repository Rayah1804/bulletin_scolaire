const fs = require('fs');
const l1 = fs.readFileSync('assets/logo1.jpg').toString('base64');
const l2 = fs.readFileSync('assets/logo2.jpg').toString('base64');
fs.writeFileSync('src/utils/logosBase64.ts', "export const logoLeftBase64 = 'data:image/jpeg;base64," + l1 + "';\nexport const logoTopBase64 = 'data:image/jpeg;base64," + l2 + "';\n");
console.log('done');
