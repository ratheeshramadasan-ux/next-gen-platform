import { prisma } from '../src/lib/prisma';

async function harden() {
  console.log('[REPAIR] Starting Tenant Quadrant Hardening...');
  
  const customers = await prisma.customer.findMany();
  console.log(`[REPAIR] Found ${customers.length} customers.`);

  for (const customer of customers) {
    console.log(`[REPAIR] Hardening environments for: ${customer.companyName} (${customer.id})`);
    
    const customerCode = customer.companyName.toUpperCase().replace(/\s+/g, '-').substring(0, 10);
    const existingTenants = await prisma.tenant.findMany({ where: { customerId: customer.id } });
    
    const required = [
      { name: "Development", type: "DEV", code: `${customerCode}-DEV`, isProtected: true, isDefault: false },
      { name: "UAT", type: "UAT", code: `${customerCode}-UAT`, isProtected: true, isDefault: false },
      { name: "Staging", type: "STAGING", code: `${customerCode}-STG`, isProtected: true, isDefault: false },
      { name: "Production", type: "PROD", code: `${customerCode}-PROD`, isProtected: true, isDefault: true }
    ];

    for (const req of required) {
      const existsByCode = existingTenants.find(t => t.code === req.code);
      const existsByType = existingTenants.find(t => t.type === req.type);
      const exists = existsByCode || existsByType;

      if (!exists) {
        console.log(`[REPAIR]  + Missing ${req.name} (${req.code}). Creating...`);
        
        try {
          await prisma.$transaction(async (tx) => {
            // 1. Tenant Resource
            const tRes = await tx.resource.create({
              data: {
                resourceType: "TENANT",
                name: req.name,
                ownerId: customer.id
              }
            });

            // 2. Tenant
            const tenant = await tx.tenant.create({
              data: {
                name: req.name,
                code: req.code,
                type: req.type,
                status: "ACTIVE",
                isDefault: req.isDefault,
                isProtected: req.isProtected,
                customerId: customer.id,
                resourceId: tRes.id
              }
            });

            // 3. Workspace Resource
            const wRes = await tx.resource.create({
              data: {
                resourceType: "WORKSPACE",
                name: "Default Workspace",
                tenantId: tenant.id,
                ownerId: customer.id
              }
            });

            // 4. Workspace
            await tx.workspace.create({
              data: {
                name: "Default Workspace",
                customerId: customer.id,
                tenantId: tenant.id,
                slug: `${customerCode.toLowerCase()}-root-${req.type.toLowerCase()}`,
                language: "en",
                region: customer.location,
                resourceId: wRes.id
              }
            });
          });
        } catch (err: any) {
          console.error(`[REPAIR]  ! Failed to create ${req.name}: ${err.message}`);
        }
      } else {
        console.log(`[REPAIR]  - ${req.name} already exists.`);
        // Fix missing resource link if needed
        if (!exists.resourceId) {
            console.log(`[REPAIR]    * Fixing missing resource link for ${exists.name}...`);
            try {
                await prisma.$transaction(async (tx) => {
                    const resource = await tx.resource.create({
                        data: {
                            resourceType: "TENANT",
                            name: exists.name,
                            ownerId: customer.id
                        }
                    });
                    await tx.tenant.update({
                        where: { id: exists.id },
                        data: { resourceId: resource.id }
                    });
                });
            } catch (err: any) {
                console.error(`[REPAIR]    ! Link fix failed: ${err.message}`);
            }
        }
      }
    }
  }
  
  console.log('[REPAIR] Hardening complete.');
}

harden().catch(console.error);
