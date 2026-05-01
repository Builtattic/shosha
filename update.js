const fs = require('fs');

const path = 'src/app/api/reports/route.ts';
let content = fs.readFileSync(path, 'utf8');

const oldStr = `    media: parsed.data.media,
    status: verdict.abuseFlags.length > 0 ? 'flagged' : 'ai_reviewed',
    aiVerdict: { ...verdict, analyzedAt: verdict.analyzedAt.toISOString() },`;

const newStr = `    media: parsed.data.media,
    repetitionPattern: parsed.data.repetitionPattern,
    intent: parsed.data.intent,
    status: verdict.abuseFlags.length > 0 ? 'flagged' : 'ai_reviewed',
    aiVerdict: { ...verdict, analyzedAt: verdict.analyzedAt.toISOString() },`;

content = content.replace(oldStr.replace(/\r\n/g, '\n'), newStr);
content = content.replace(oldStr, newStr);

fs.writeFileSync(path, content, 'utf8');
