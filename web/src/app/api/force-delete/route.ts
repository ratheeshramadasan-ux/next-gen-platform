import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Log what is there right now
    const customersBefore: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM Customer;`);
    
    // 2. Clear foreign keys just in case
    await prisma.$executeRawUnsafe(`UPDATE AppUser SET customerId = NULL;`);
    await prisma.$executeRawUnsafe(`UPDATE AutomationWorkflow SET customerId = NULL;`);
    
    // 3. Delete cascading relations explicitly just in case Prisma PostgreSQL adapter isn't doing it
    await prisma.$executeRawUnsafe(`DELETE FROM TenantAdmin;`);
    await prisma.$executeRawUnsafe(`DELETE FROM Tenant;`);
    await prisma.$executeRawUnsafe(`DELETE FROM SmtpConfig;`);
    // Delete User relations
    await prisma.$executeRawUnsafe(`DELETE FROM AppUser WHERE customerId IS NOT NULL;`);
    
    // 4. Force Delete all customers using raw SQL
    const deletedCount = await prisma.$executeRawUnsafe(`DELETE FROM Customer;`);
    
    // 5. Query after deletion
    const customersAfter: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM Customer;`);

    return NextResponse.json({ 
      success: true, 
      before: customersBefore, 
      deletedCount: Number(deletedCount),
      after: customersAfter
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: String(error) });
  }
}
