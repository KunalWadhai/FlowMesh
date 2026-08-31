import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function seedDemoWorkflow() {
  try {
    console.log('🌱 Seeding demo workflow...\n');

    const workspace = await prisma.workspace.findFirst({
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!workspace) {
      console.log('❌ No workspace found. Please register a user first.\n');
      console.log('To create a user:');
      console.log('1. Start the API server: npm run dev');
      console.log('2. Register via API:');
      console.log('   curl -X POST http://localhost:3001/api/auth/register \\');
      console.log('     -H "Content-Type: application/json" \\');
      console.log('     -d \'{"name":"Demo User","email":"demo@flowmesh.dev","password":"demo123","workspaceName":"Demo Workspace"}\'');
      console.log('\n3. Or visit http://localhost:5173 and sign up via the UI\n');
      process.exit(1);
    }

    const owner = workspace.members.find(m => m.role === 'OWNER')?.user;
    console.log(`✓ Found workspace: ${workspace.name}`);
    console.log(`✓ Owner: ${owner?.name} (${owner?.email})`);
    console.log('');

    const existing = await prisma.workflow.findFirst({
      where: { workspaceId: workspace.id, name: 'User Data Processing Pipeline' },
    });

    if (existing) {
      console.log('⚠️  Demo workflow already exists. Skipping...');
      process.exit(0);
    }

    const workflow = await prisma.workflow.create({
      data: {
        name: 'User Data Processing Pipeline',
        description: 'Fetch user data from API, transform it, analyze with AI, and store results',
        workspaceId: workspace.id,
        status: 'ACTIVE',
        tags: ['demo', 'api', 'ai'],
        version: 1,
        definition: {
          nodes: [
            {
              id: 'node-start',
              type: 'http_request',
              label: 'Fetch User Data',
              position: { x: 100, y: 100 },
              config: {
                method: 'GET',
                url: 'https://jsonplaceholder.typicode.com/users/1',
                timeout: 10000,
              },
            },
            {
              id: 'node-transform',
              type: 'transform',
              label: 'Normalize Data',
              position: { x: 400, y: 100 },
              config: {
                expression: 'return { userId: input.body.id, name: input.body.name, email: input.body.email };',
              },
            },
            {
              id: 'node-log',
              type: 'log',
              label: 'Log Result',
              position: { x: 700, y: 100 },
              config: { level: 'info', message: 'User processed' },
            },
          ],
          edges: [
            { id: 'edge-1', source: 'node-start', target: 'node-transform' },
            { id: 'edge-2', source: 'node-transform', target: 'node-log' },
          ],
        },
      },
    });

    console.log(`✓ Created workflow: ${workflow.id}`);

    const execution = await prisma.execution.create({
      data: {
        workflowId: workflow.id,
        status: 'SUCCEEDED',
        trigger: 'MANUAL',
        inputData: {},
        outputData: { result: 'success' },
        durationMs: 1850,
        startedAt: new Date(Date.now() - 1850),
        completedAt: new Date(),
      },
    });

    console.log(`✓ Created execution: ${execution.id}`);

    await prisma.executionStepLog.createMany({
      data: [
        {
          executionId: execution.id,
          nodeId: 'node-start',
          nodeName: 'Fetch User Data',
          nodeType: 'http_request',
          status: 'SUCCEEDED',
          startedAt: new Date(Date.now() - 1850),
          completedAt: new Date(Date.now() - 1500),
          durationMs: 350,
          inputData: {},
          outputData: { status: 200, body: { id: 1, name: 'John Doe' } },
          logs: ['HTTP GET request sent', 'Response: 200 OK'],
        },
        {
          executionId: execution.id,
          nodeId: 'node-transform',
          nodeName: 'Normalize Data',
          nodeType: 'transform',
          status: 'SUCCEEDED',
          startedAt: new Date(Date.now() - 1500),
          completedAt: new Date(Date.now() - 1200),
          durationMs: 300,
          inputData: { body: { id: 1, name: 'John Doe' } },
          outputData: { userId: 1, name: 'John Doe' },
          logs: ['Transform executed'],
        },
        {
          executionId: execution.id,
          nodeId: 'node-log',
          nodeName: 'Log Result',
          nodeType: 'log',
          status: 'SUCCEEDED',
          startedAt: new Date(Date.now() - 1200),
          completedAt: new Date(Date.now() - 1150),
          durationMs: 50,
          inputData: { userId: 1, name: 'John Doe' },
          outputData: {},
          logs: ['[INFO] User processed'],
        },
      ],
    });

    console.log('✓ Created step logs');
    console.log('\n✨ Demo workflow seeded successfully!\n');
    console.log('📋 Login Details:');
    console.log(`   Email: ${owner?.email}`);
    console.log(`   Password: (the password you set during registration)`);
    console.log('\n🌐 Access:');
    console.log('   UI:       http://localhost:5173');
    console.log('   Dashboard: http://localhost:5173/dashboard');
    console.log('   Workflows: http://localhost:5173/workflows');
    console.log('\n💡 Next steps:');
    console.log('   1. Login with the credentials above');
    console.log('   2. View the demo workflow in the Workflows page');
    console.log('   3. Click on it to see the workflow editor');
    console.log('   4. Click "Run" to execute it\n');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedDemoWorkflow();
