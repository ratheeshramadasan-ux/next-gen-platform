import CustomerRegister from "@/components/ui/customer-register";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function CustomerRegisterPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const slug = params.slug;

  const customer = await prisma.customer.findUnique({
    where: { slug },
    include: { 
      tenants: {
        where: { isDefault: true },
        take: 1
      }
    }
  });

  if (!customer || customer.tenants.length === 0) {
    notFound();
  }

  const tenant = customer.tenants[0];
  const isRegistrationEnabled = customer.isRegistrationEnabled;

  return (
    <CustomerRegister 
      customerName={customer.companyName} 
      slug={slug} 
      tenantId={tenant.id}
      customerId={customer.id}
      isRegistrationEnabled={isRegistrationEnabled} 
    />
  );
}
