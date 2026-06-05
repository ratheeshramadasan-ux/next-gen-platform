import CustomerLogin from "@/components/ui/customer-login";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation"
import { headers } from "next/headers";

export default async function CustomerLoginPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const slug = params.slug;

  // Get host server-side to avoid hydration mismatch
  const headersList = await headers();
  const host = headersList.get("host") ?? "platform.io";

  const customer = await prisma.customer.findUnique({
    where: { slug },
    select: {
      id: true,
      companyName: true,
      logoUrl: true,
      isRegistrationEnabled: true,
      authType: true,
      allowedDomains: true,
      mfaEnforced: true,
      industry: true,
      location: true,
      status: true,
      theme: true,
    }
  });

  if (!customer) notFound();
  if (customer.status === 'Suspended') notFound();

  return (
    <CustomerLogin
      customerId={customer.id}
      customerName={customer.companyName}
      logoUrl={customer.logoUrl}
      slug={slug}
      host={host}
      isRegistrationEnabled={customer.isRegistrationEnabled}
      authType={customer.authType}
      allowedDomains={customer.allowedDomains}
      mfaEnforced={customer.mfaEnforced}
      industry={customer.industry}
      location={customer.location}
      theme={customer.theme}
    />
  );
}
