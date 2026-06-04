import { prisma } from '../src/lib/prisma';

async function repair() {
  console.log('[REPAIR] Starting DEFINITIVE Platform Repair...');
  
  const customers = await prisma.customer.findMany({
    include: { tenants: true }
  });
  
  console.log(`[REPAIR] Found ${customers.length} customers.`);

  for (const customer of customers) {
    const shortId = customer.id.substring(0, 4).toUpperCase();
    const cleanName = customer.companyName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase();
    const prefix = `${cleanName}-${shortId}`;

    console.log(`[REPAIR] Processing: ${customer.companyName} (Prefix: ${prefix})`);

    const required = [
      { name: "Development", type: "DEV", code: `${prefix}-DEV`, isProtected: true, isDefault: false },
      { name: "UAT", type: "UAT", code: `${prefix}-UAT`, isProtected: true, isDefault: false },
      { name: "Staging", type: "STAGING", code: `${prefix}-STG`, isProtected: true, isDefault: false },
      { name: "Production", type: "PROD", code: `${prefix}-PROD`, isProtected: true, isDefault: true }
    ];

    for (const req of required) {
      // Logic: If a tenant with this TYPE already exists for this customer, we skip it
      // Otherwise we create it with a UNIQUE code
      const existing = customer.tenants.find(t => t.type === req.type);

      if (!existing) {
        console.log(`[REPAIR]   + Creating ${req.name} environment...`);
        try {
          await prisma.$transaction(async (tx) => {
            // 1. Create Resource
            const resource = await tx.resource.create({
              data: {
                resourceType: "TENANT",
                name: req.name,
                ownerId: customer.id
              }
            });

            // 2. Create Tenant
            const tenant = await tx.tenant.create({
              data: {
                name: req.name,
                code: req.code,
                type: req.type,
                status: "ACTIVE",
                isDefault: req.isDefault,
                isProtected: req.isProtected,
                customerId: customer.id,
                resourceId: resource.id
              }
            });

            // 3. Create Default Workspace
            const wsRes = await tx.resource.create({
               data: {
                 resourceType: "WORKSPACE",
                 name: "Default Workspace",
                 tenantId: tenant.id,
                 ownerId: customer.id
               }
            });

            await tx.workspace.create({
              data: {
                name: "Default Workspace",
                customerId: customer.id,
                tenantId: tenant.id,
                resourceId: wsRes.id,
                slug: `${prefix.toLowerCase()}-${req.type.toLowerCase()}-root`,
                language: "en",
                region: customer.location || "Global"
              }
            });
          });
        } catch (err: any) {
          console.error(`[REPAIR]   ! Failed to provision ${req.name}: ${err.message}`);
        }
      } else {
        console.log(`[REPAIR]   - ${req.name} already exists.`);
        // Ensure Resource link exists if missing
        if (!existing.resourceId) {
            console.log(`[REPAIR]     * Fixing missing Resource link for ${existing.name}...`);
            await prisma.$transaction(async (tx) => {
                const res = await tx.resource.create({
                    data: { resourceType: "TENANT", name: existing.name, ownerId: customer.id }
                });
                await tx.tenant.update({ where: { id: existing.id }, data: { resourceId: res.id } });
            });
        }
      }
    }
  }

  console.log('[REPAIR] Platform Repair Complete.');
}

repair().catch(console.error);
