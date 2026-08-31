import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

const DEMO_USER = {
  name: 'Demo User',
  email: 'demo@flowmesh.dev',
  password: 'demo1234',
  workspaceName: 'Demo Workspace',
};

async function createDemoUser() {
  try {
    console.log('👤 Creating demo user...\n');

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: DEMO_USER.email },
    });

    if (existing) {
      console.log('⚠️  Demo user already exists!');
      console.log('\n📋 Login Credentials:');
      console.log(`   Email:    ${DEMO_USER.email}`);
      console.log(`   Password: ${DEMO_USER.password}`);
      console.log('\n🌐 Access:');
      console.log('   http://localhost:5173\n');
      process.exit(0);
    }

    // Create user and workspace
    const passwordHash = await bcrypt.hash(DEMO_USER.password, 12);

    const slug = DEMO_USER.workspaceName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const result = await prisma.$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          name: DEMO_USER.name,
          email: DEMO_USER.email,
          passwordHash,
        },
      });

      const workspace = await tx.workspace.create({
        data: {
          name: DEMO_USER.workspaceName,
          slug,
          members: {
            create: {
              userId: user.id,
              role: 'OWNER',
            },
          },
        },
      });

      return { user, workspace };
    });

    console.log('✅ Demo user created successfully!\n');
    console.log('📋 Login Credentials:');
    console.log(`   Email:    ${DEMO_USER.email}`);
    console.log(`   Password: ${DEMO_USER.password}`);
    console.log('\n🏢 Workspace:');
    console.log(`   Name: ${DEMO_USER.workspaceName}`);
    console.log(`   ID:   ${result.workspace.id}`);
    console.log('\n🌐 Access:');
    console.log('   UI:        http://localhost:5173');
    console.log('   Dashboard: http://localhost:5173/dashboard');
    console.log('\n💡 Next steps:');
    console.log('   1. Run: npm run seed:demo');
    console.log('   2. Login with the credentials above');
    console.log('   3. Explore the demo workflow\n');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createDemoUser();
