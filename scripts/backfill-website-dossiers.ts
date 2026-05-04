import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

async function main() {
  const [accountsRepo, usersRepo] = await Promise.all([
    import('../src/lib/repos/accounts'),
    import('../src/lib/repos/users'),
  ]);

  const users = await usersRepo.listAll(10_000);
  let createdOrUpdated = 0;

  for (const user of users) {
    const account = await accountsRepo.ensureWebsiteAccountForUser(user);
    await usersRepo.addClaimedAccount(user._id, account._id);
    createdOrUpdated += 1;
    console.log(`ensured ${account._id} for ${user._id}`);
  }

  console.log(`Done. Ensured website dossiers for ${createdOrUpdated} users.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
