import { PrismaClient, Role, Team } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing old data...');
  await prisma.task.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.subtask.deleteMany();
  await prisma.project.deleteMany();
  await prisma.adminUserAssignment.deleteMany();
  await prisma.user.deleteMany();

  console.log('Creating accounts...');

  // ── Superadmin ───────────────────────────────────────────────────────────────
  await prisma.user.create({
    data: {
      name: 'Shubhankar Mishra',
      email: 'shubhankar@vecube.club',
      password: await bcrypt.hash('Shubhankar@VcB25', 10),
      role: Role.DEV,
      team: Team.DEV,
      defaultHrs: 8,
    },
  });

  // ── Admins ───────────────────────────────────────────────────────────────────
  const ADMINS = [
    { name: 'Shivansh Awasthi', email: 'shivansh@grizlabs.com',   pwd: 'Shivansh@VcB25'  },
    { name: 'Ishank Singh',     email: 'ishank@grizlabs.com',      pwd: 'Ishank@VcB25'    },
    { name: 'Saksham Rao',      email: 'saksham@vecube.club',      pwd: 'Saksham@VcB25'   },
    { name: 'Vedanshi',         email: 'vedanshi@vecube.club',     pwd: 'Vedanshi@VcB25'  },
  ];

  for (const a of ADMINS) {
    await prisma.user.create({
      data: {
        name: a.name,
        email: a.email,
        password: await bcrypt.hash(a.pwd, 10),
        role: Role.ADMIN,
        team: Team.DEV,
        defaultHrs: 8,
      },
    });
  }

  // ── Users ────────────────────────────────────────────────────────────────────
  const USERS = [
    { name: 'Aayush Sharma',    email: 'aayush@grizlabs.com',        pwd: 'Aayush@VcB25'    },
    { name: 'Amisha Negi',      email: 'amisha@vecube.club',          pwd: 'Amisha@VcB25'    },
    { name: 'Aniket Sharma',    email: 'aniket@vecube.club',          pwd: 'Aniket@VcB25'    },
    { name: 'Antesh Sikarwar', email: 'antesh@vecube.club',          pwd: 'Antesh@VcB25'    },
    { name: 'Aryan Singh',      email: 'aryan@vecube.club',           pwd: 'Aryan@VcB25'     },
    { name: 'Ashim Bhatnagar', email: 'ashim@vecube.club',           pwd: 'Ashim@VcB25'     },
    { name: 'Bhavinee Rora',   email: 'bhavinee@steel.study',        pwd: 'Bhavinee@VcB25'  },
    { name: 'Goutham B',        email: 'goutham@vecube.club',         pwd: 'Goutham@VcB25'   },
    { name: 'Jay Dixit',        email: 'jay@tool.study',              pwd: 'Jay@VcB25'       },
    { name: 'Kanika Gupta',    email: 'kanika@vecube.club',          pwd: 'KanikaG@VcB25'   },
    { name: 'Kanika Awasthi',  email: 'kanika.awasthi@vecube.club',  pwd: 'KanikaA@VcB25'   },
    { name: 'LMS Support',     email: 'lms@vecube.club',             pwd: 'Lms@VcB25'       },
    { name: 'Pragya Jain',     email: 'pragya@vecube.club',          pwd: 'Pragya@VcB25'    },
    { name: 'Prakriti Maurya', email: 'prakriti@vecube.club',        pwd: 'Prakriti@VcB25'  },
    { name: 'Saniya Fathima',  email: 'saniya@stickmodel.com',       pwd: 'Saniya@VcB25'    },
    { name: 'Shahnawaz Ali',   email: 'shahnawaz@vecube.club',       pwd: 'Shahnawaz@VcB25' },
  ];

  for (const u of USERS) {
    await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        password: await bcrypt.hash(u.pwd, 10),
        role: Role.USER,
        team: Team.DEV,
        defaultHrs: 8,
      },
    });
  }

  // ── Print credentials ────────────────────────────────────────────────────────
  const PAD = 42;
  console.log('\nSeed complete! 21 accounts created.\n');
  console.log('── Superadmin ──────────────────────────────────────────────────');
  console.log(`  ${'shubhankar@vecube.club'.padEnd(PAD)} Shubhankar@VcB25`);
  console.log('\n── Admins ──────────────────────────────────────────────────────');
  for (const a of ADMINS) console.log(`  ${a.email.padEnd(PAD)} ${a.pwd}`);
  console.log('\n── Users ───────────────────────────────────────────────────────');
  for (const u of USERS) console.log(`  ${u.email.padEnd(PAD)} ${u.pwd}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
