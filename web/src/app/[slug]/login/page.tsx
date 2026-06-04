import CustomerLogin from "@/components/ui/customer-login";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

// Next.js versions often require handling params differently. 
// Assuming an async Server Component pattern for fetching data.
export default async function CustomerLoginPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const slug = params.slug;

  const customer = await prisma.customer.findUnique({
    where: { slug },
    include: { tenants: true }
  });
  
  if (!customer) {
    notFound();
  }

  const isRegistrationEnabled = customer.isRegistrationEnabled;

  return (
    <CustomerLogin 
      customerId={customer.id}
      customerName={customer.companyName} 
      logoUrl={customer.logoUrl}
      slug={slug} 
      isRegistrationEnabled={isRegistrationEnabled} 
    />
  );
}
