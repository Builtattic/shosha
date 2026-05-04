const fs = require('fs');
const path = 'src/app/(auth)/sign-in/page.tsx';
let content = fs.readFileSync(path, 'utf-8');

content = content.replace(
  '<div className="rounded-3xl border border-border bg-card p-8 shadow-lg">\n          <AnimatePresence mode="wait">',
  '<div className="rounded-3xl border border-border bg-card p-8 shadow-lg">\n          <div id="recaptcha-container" className="my-2" />\n          <AnimatePresence mode="wait">'
);

content = content.replace(
  '                <div id="recaptcha-container" />\n              </motion.div>\n            )}',
  '              </motion.div>\n            )}'
);

fs.writeFileSync(path, content);
console.log('Fixed OTP');
