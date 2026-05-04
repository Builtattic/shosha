const fs = require('fs');
const path = 'src/app/(auth)/sign-in/page.tsx';
let content = fs.readFileSync(path, 'utf-8');

content = content.replace(
  '<AnimatePresence mode="wait">',
  '<div id="recaptcha-container" className="my-2" />\n          <AnimatePresence mode="wait">'
);

content = content.replace(
  '<div id="recaptcha-container" />',
  ''
);

fs.writeFileSync(path, content);
console.log('Fixed OTP 2');
