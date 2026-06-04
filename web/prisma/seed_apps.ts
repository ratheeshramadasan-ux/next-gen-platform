import "dotenv/config";
import { prisma } from '../src/lib/prisma';
import { ResourceType } from '../src/generated/prisma-client';

async function main() {
  console.log("Seeding Application Module data...");

  try {
    // 1. Seed Environments
    const envNames = ["DEV", "UAT", "PROD", "GLOBAL"];
    const envs = [];
    for (const name of envNames) {
      const env = await prisma.applicationEnvironment.upsert({
        where: { name },
        update: {},
        create: { name }
      });
      envs.push(env);
      console.log(`Synced environment: ${name}`);
    }

    // 2. Find a tenant to attach sample apps to
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      console.log("No tenant found to attach sample apps. Skipping app seeding.");
      return;
    }

    const tenantId = tenant.id;

    // 3. Create Sample Applications
    const sampleApps = [
      { name: "SAP GUI", category: "Enterprise", owner: "John Doe", criticality: "High" },
      { name: "Salesforce", category: "Web", owner: "Jane Smith", criticality: "Medium" },
      { name: "Workday", category: "Web", owner: "Robert Brown", criticality: "High" },
      { name: "ServiceNow", category: "Web", owner: "Alice Wilson", criticality: "Medium" },
      { name: "Oracle EBS", category: "Enterprise", owner: "Michael Davis", criticality: "High" }
    ];

    for (const appData of sampleApps) {
      // Check if already exists
      let app = await prisma.application.findFirst({
        where: { name: appData.name, tenantId }
      });

      if (!app) {
        // Create Resource
        const resource = await prisma.resource.create({
          data: {
            resourceType: ResourceType.APPLICATION,
            name: appData.name,
            tenantId
          }
        });

        app = await prisma.application.create({
          data: {
            ...appData,
            tenantId,
            resourceId: resource.id,
            isActive: true
          }
        });
        console.log(`Created application: ${appData.name}`);

        // Create Version
        const version = await prisma.applicationVersion.create({
          data: {
            applicationId: app.id,
            versionNumber: "1.0.0",
            isLatest: true,
            releaseDate: new Date()
          }
        });

        // Create Configs for each environment
        for (const env of envs) {
          await prisma.applicationConfig.create({
            data: {
              applicationId: app.id,
              versionId: version.id,
              environmentId: env.id,
              launchType: appData.category === "Web" ? "Browser" : "Executable",
              url: appData.category === "Web" ? `https://${appData.name.toLowerCase()}.company.com` : null,
              executablePath: appData.category === "Enterprise" ? `C:\\Program Files\\${appData.name}\\app.exe` : null,
              timeoutSeconds: 60,
              retryCount: 3,
              isActive: true
            }
          });
        }
      } else {
        console.log(`Application already exists: ${appData.name}`);
      }
    }

    console.log("Application module seeding completed.");
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
