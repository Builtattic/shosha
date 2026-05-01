const fs = require('fs');

let reportModal = fs.readFileSync('src/components/report/ReportModal.tsx', 'utf8');
reportModal = reportModal.replace("import { Button } from '@/components/ui/button';", "import { Button } from '@/components/ui/Button';");
reportModal = reportModal.replace("import { Input } from '@/components/ui/input';", "import { Input } from '@/components/ui/Input';");
fs.writeFileSync('src/components/report/ReportModal.tsx', reportModal, 'utf8');

let seed = fs.readFileSync('scripts/seed.ts', 'utf8');
seed = seed.replace(`      aiVerdict: {
        valid: true,
        confidence: 0.8,
        proposedImpact: impact,
        reasoning: 'Auto-seeded historical claim.',
        categoryTags: ['historical'],
        abuseFlags: [],
        analyzedAt: date
      },`, `      aiVerdict: {
        valid: true,
        confidence: 0.8,
        proposedImpact: impact,
        reasoning: 'Auto-seeded historical claim.',
        categoryTags: ['historical'],
        abuseFlags: [],
        isAiFabricated: false,
        analyzedAt: date
      },`);
fs.writeFileSync('scripts/seed.ts', seed, 'utf8');

let adminRoute = fs.readFileSync('src/app/api/admin/evidence/[id]/decide/route.ts', 'utf8');
adminRoute = adminRoute.replace(`        aiVerdict: {
          valid: true,
          confidence: 1.0,
          proposedImpact: adminImpact,
          reasoning: 'Admin generated dispute verdict.',
          categoryTags: ['admin_override'],
          abuseFlags: [],
          analyzedAt: now
        },`, `        aiVerdict: {
          valid: true,
          confidence: 1.0,
          proposedImpact: adminImpact,
          reasoning: 'Admin generated dispute verdict.',
          categoryTags: ['admin_override'],
          abuseFlags: [],
          isAiFabricated: false,
          analyzedAt: now
        },`);
fs.writeFileSync('src/app/api/admin/evidence/[id]/decide/route.ts', adminRoute, 'utf8');
