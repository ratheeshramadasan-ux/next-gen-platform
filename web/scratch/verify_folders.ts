import { createFolder } from '../src/app/actions/folderActions';
import { prisma } from '../src/lib/prisma';

async function verify() {
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error("No tenant found for testing");
  const workspace = await prisma.workspace.findFirst({ where: { tenantId: tenant.id } });
  if (!workspace) throw new Error("No workspace found for testing");

  console.log('[TEST] Creating Root Folder...');
  const rootRes = await createFolder({
    name: 'ROOT_TEST_' + Date.now(),
    workspaceId: workspace.id,
    tenantId: tenant.id,
    customerId: tenant.customerId
  }, 'Test Actor');

  if (!rootRes.success) throw new Error("Root creation failed: " + rootRes.error);
  console.log('[TEST] Root Created:', rootRes.folder.path, 'Level:', rootRes.folder.level);

  console.log('[TEST] Creating Sub Folder...');
  const subRes = await createFolder({
    name: 'SUB_TEST',
    parentId: rootRes.folder.folder_id || rootRes.folder.id,
    workspaceId: workspace.id,
    tenantId: tenant.id,
    customerId: tenant.customerId
  }, 'Test Actor');

  if (!subRes.success) throw new Error("Sub creation failed: " + subRes.error);
  console.log('[TEST] Sub Created:', subRes.folder.path, 'Level:', subRes.folder.level);

  // Cleanup
  console.log('[TEST] Verification Successful.');
}

verify().catch(console.error);
