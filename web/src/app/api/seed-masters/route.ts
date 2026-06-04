import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const INDUSTRIES = [
  { label: "Technology & Software", icon: "Cpu" },
  { label: "Financial Services", icon: "Wallet" },
  { label: "Healthcare & Life Sciences", icon: "Activity" },
  { label: "Retail & E-Commerce", icon: "ShoppingBag" },
  { label: "Manufacturing & Industrial", icon: "Factory" },
  { label: "Education & E-Learning", icon: "BookOpen" },
  { label: "Construction & Real Estate", icon: "HardHat" },
  { label: "Food & Beverage", icon: "Utensils" },
  { label: "Energy & Utilities", icon: "Zap" },
  { label: "Telecommunications", icon: "Wifi" },
  { label: "Media & Entertainment", icon: "Play" },
  { label: "Transportation & Logistics", icon: "Truck" },
  { label: "Government & Public Sector", icon: "Landmark" },
  { label: "Agriculture & Farming", icon: "Leaf" },
  { label: "Legal & Compliance", icon: "Scale" },
  { label: "Insurance", icon: "Shield" },
  { label: "Automotive", icon: "Car" },
  { label: "Aerospace & Defence", icon: "Plane" },
  { label: "Mining & Resources", icon: "Mountain" },
  { label: "Non-Profit & NGO", icon: "Heart" },
  { label: "Hospitality & Tourism", icon: "Hotel" },
  { label: "Professional Services", icon: "Briefcase" },
  { label: "Sports & Fitness", icon: "Dumbbell" },
  { label: "Fashion & Apparel", icon: "Shirt" },
  { label: "Pharmaceuticals", icon: "Pill" },
  { label: "Biotechnology", icon: "FlaskConical" },
  { label: "Cybersecurity", icon: "Lock" },
  { label: "Artificial Intelligence", icon: "Bot" },
  { label: "Space & Satellites", icon: "Satellite" },
  { label: "Environmental Services", icon: "Recycle" },
];

const CURRENCIES = [
  { label: "United States Dollar", code: "USD", symbol: "$", icon: "DollarSign" },
  { label: "Euro", code: "EUR", symbol: "€", icon: "Euro" },
  { label: "British Pound Sterling", code: "GBP", symbol: "£", icon: "PoundSterling" },
  { label: "Japanese Yen", code: "JPY", symbol: "¥", icon: "JapaneseYen" },
  { label: "Canadian Dollar", code: "CAD", symbol: "CA$", icon: "DollarSign" },
  { label: "Australian Dollar", code: "AUD", symbol: "A$", icon: "DollarSign" },
  { label: "Swiss Franc", code: "CHF", symbol: "Fr", icon: "CreditCard" },
  { label: "Chinese Yuan", code: "CNY", symbol: "¥", icon: "JapaneseYen" },
  { label: "Indian Rupee", code: "INR", symbol: "₹", icon: "IndianRupee" },
  { label: "Singapore Dollar", code: "SGD", symbol: "S$", icon: "DollarSign" },
  { label: "South Korean Won", code: "KRW", symbol: "₩", icon: "CreditCard" },
  { label: "Brazilian Real", code: "BRL", symbol: "R$", icon: "CreditCard" },
  { label: "Mexican Peso", code: "MXN", symbol: "MX$", icon: "DollarSign" },
  { label: "South African Rand", code: "ZAR", symbol: "R", icon: "CreditCard" },
  { label: "UAE Dirham", code: "AED", symbol: "د.إ", icon: "CreditCard" },
  { label: "Saudi Riyal", code: "SAR", symbol: "﷼", icon: "CreditCard" },
  { label: "Hong Kong Dollar", code: "HKD", symbol: "HK$", icon: "DollarSign" },
  { label: "Norwegian Krone", code: "NOK", symbol: "kr", icon: "CreditCard" },
  { label: "Swedish Krona", code: "SEK", symbol: "kr", icon: "CreditCard" },
  { label: "Danish Krone", code: "DKK", symbol: "kr", icon: "CreditCard" },
  { label: "New Zealand Dollar", code: "NZD", symbol: "NZ$", icon: "DollarSign" },
  { label: "Turkish Lira", code: "TRY", symbol: "₺", icon: "CreditCard" },
  { label: "Polish Zloty", code: "PLN", symbol: "zł", icon: "CreditCard" },
  { label: "Thai Baht", code: "THB", symbol: "฿", icon: "CreditCard" },
  { label: "Malaysian Ringgit", code: "MYR", symbol: "RM", icon: "CreditCard" },
  { label: "Indonesian Rupiah", code: "IDR", symbol: "Rp", icon: "CreditCard" },
  { label: "Philippine Peso", code: "PHP", symbol: "₱", icon: "CreditCard" },
  { label: "Egyptian Pound", code: "EGP", symbol: "£", icon: "CreditCard" },
  { label: "Nigerian Naira", code: "NGN", symbol: "₦", icon: "CreditCard" },
  { label: "Kenyan Shilling", code: "KES", symbol: "KSh", icon: "CreditCard" },
];

const TIMEZONES = [
  { label: "UTC (Coordinated Universal Time)", region: "Global" },
  { label: "America/New_York (Eastern Time)", region: "North America" },
  { label: "America/Chicago (Central Time)", region: "North America" },
  { label: "America/Denver (Mountain Time)", region: "North America" },
  { label: "America/Los_Angeles (Pacific Time)", region: "North America" },
  { label: "America/Anchorage (Alaska Time)", region: "North America" },
  { label: "America/Toronto (Eastern Canada)", region: "North America" },
  { label: "America/Vancouver (Pacific Canada)", region: "North America" },
  { label: "America/Mexico_City (Mexico Central)", region: "North America" },
  { label: "America/Sao_Paulo (Brazil Time)", region: "South America" },
  { label: "America/Argentina/Buenos_Aires (Argentina)", region: "South America" },
  { label: "America/Bogota (Colombia)", region: "South America" },
  { label: "America/Lima (Peru)", region: "South America" },
  { label: "America/Santiago (Chile)", region: "South America" },
  { label: "Europe/London (GMT / BST)", region: "Europe" },
  { label: "Europe/Paris (Central European Time)", region: "Europe" },
  { label: "Europe/Berlin (Central European Time)", region: "Europe" },
  { label: "Europe/Madrid (Central European Time)", region: "Europe" },
  { label: "Europe/Rome (Central European Time)", region: "Europe" },
  { label: "Europe/Amsterdam (Central European Time)", region: "Europe" },
  { label: "Europe/Stockholm (Central European Time)", region: "Europe" },
  { label: "Europe/Zurich (Central European Time)", region: "Europe" },
  { label: "Europe/Moscow (Moscow Standard Time)", region: "Europe" },
  { label: "Europe/Istanbul (Turkey Time)", region: "Europe" },
  { label: "Africa/Cairo (Egypt Time)", region: "Africa" },
  { label: "Africa/Nairobi (East Africa Time)", region: "Africa" },
  { label: "Africa/Lagos (West Africa Time)", region: "Africa" },
  { label: "Africa/Johannesburg (South Africa Time)", region: "Africa" },
  { label: "Africa/Casablanca (Morocco Time)", region: "Africa" },
  { label: "Asia/Dubai (Gulf Standard Time)", region: "Middle East" },
  { label: "Asia/Riyadh (Arabia Standard Time)", region: "Middle East" },
  { label: "Asia/Tehran (Iran Time)", region: "Middle East" },
  { label: "Asia/Jerusalem (Israel Time)", region: "Middle East" },
  { label: "Asia/Kolkata (India Standard Time)", region: "Asia" },
  { label: "Asia/Dhaka (Bangladesh)", region: "Asia" },
  { label: "Asia/Karachi (Pakistan Time)", region: "Asia" },
  { label: "Asia/Bangkok (Indochina Time)", region: "Asia" },
  { label: "Asia/Singapore (Singapore Time)", region: "Asia" },
  { label: "Asia/Shanghai (China Standard Time)", region: "Asia" },
  { label: "Asia/Tokyo (Japan Standard Time)", region: "Asia" },
  { label: "Asia/Seoul (Korea Standard Time)", region: "Asia" },
  { label: "Asia/Manila (Philippine Time)", region: "Asia" },
  { label: "Asia/Kuala_Lumpur (Malaysia Time)", region: "Asia" },
  { label: "Asia/Jakarta (Western Indonesia)", region: "Asia" },
  { label: "Australia/Sydney (AEST)", region: "Pacific" },
  { label: "Australia/Melbourne (AEST)", region: "Pacific" },
  { label: "Australia/Perth (AWST)", region: "Pacific" },
  { label: "Pacific/Auckland (New Zealand Time)", region: "Pacific" },
  { label: "Pacific/Honolulu (Hawaii Time)", region: "Pacific" },
];

const CUSTOMER_TYPES = [
  { label: "Enterprise", description: "Large corporations with 1000+ employees and complex multi-site operations." },
  { label: "Mid-Market", description: "Growing businesses with 100–999 employees seeking scalable solutions." },
  { label: "Small Business", description: "Businesses with fewer than 100 employees, typically single-site." },
  { label: "Start-Up", description: "Early-stage companies in rapid growth and experimentation phase." },
  { label: "Government", description: "Federal, state, or municipal government bodies and agencies." },
  { label: "Non-Profit / NGO", description: "Charitable organizations and non-governmental entities." },
  { label: "Educational Institution", description: "Universities, colleges, schools, and training providers." },
  { label: "Partner / Reseller", description: "Channel partners, distributors, and value-added resellers." },
  { label: "Marketplace Vendor", description: "Third-party vendors operating within the platform marketplace." },
  { label: "System Integrator", description: "Technology firms that deploy and integrate platform solutions." },
];

const PRIORITIES = [
  { label: "Critical", description: "System down or business-critical function completely unavailable. SLA: 1-hour response." },
  { label: "High", description: "Major functionality impaired with significant business impact. SLA: 4-hour response." },
  { label: "Medium", description: "Partial functionality impaired. Workaround available. SLA: Next business day." },
  { label: "Low", description: "Minor issue or cosmetic concern with minimal business impact. SLA: 5 business days." },
  { label: "Planning", description: "Future enhancement or feature request. Scheduled into product roadmap." },
];

export async function GET() {
  const results: any = { industries: 0, currencies: 0, timezones: 0, customerTypes: 0, priorities: 0, skipped: 0, errors: [] };

  for (const item of INDUSTRIES) {
    try {
      const existing = await prisma.lookupIndustry.findFirst({ where: { label: item.label } });
      if (!existing) {
        await prisma.lookupIndustry.create({ data: { label: item.label, value: item.label, icon: item.icon, isActive: true } });
        results.industries++;
      } else { results.skipped++; }
    } catch (e: any) { results.errors.push(`Industry ${item.label}: ${e.message?.slice(0, 100)}`); }
  }

  for (const item of CURRENCIES) {
    try {
      const existing = await prisma.lookupCurrency.findFirst({ where: { OR: [{ label: item.label }, { code: item.code }] } });
      if (!existing) {
        await prisma.lookupCurrency.create({ data: { label: item.label, value: item.code, code: item.code, symbol: item.symbol, icon: item.icon, isActive: true } });
        results.currencies++;
      } else { results.skipped++; }
    } catch (e: any) { results.errors.push(`Currency ${item.code}: ${e.message?.slice(0, 100)}`); }
  }

  for (const item of TIMEZONES) {
    try {
      const existing = await prisma.lookupTimezone.findFirst({ where: { label: item.label } });
      if (!existing) {
        // Use description field to store region since LookupTimezone may not have category yet
        await (prisma.lookupTimezone as any).create({ data: { label: item.label, value: item.label, description: item.region, isActive: true } });
        results.timezones++;
      } else { results.skipped++; }
    } catch (e: any) { results.errors.push(`Timezone ${item.label}: ${e.message?.slice(0, 100)}`); }
  }

  for (const item of CUSTOMER_TYPES) {
    try {
      const existing = await prisma.lookupCustomerType.findFirst({ where: { label: item.label } });
      if (!existing) {
        await prisma.lookupCustomerType.create({ data: { label: item.label, value: item.label, description: item.description, isActive: true } });
        results.customerTypes++;
      } else { results.skipped++; }
    } catch (e: any) { results.errors.push(`CustomerType ${item.label}: ${e.message?.slice(0, 100)}`); }
  }

  for (const item of PRIORITIES) {
    try {
      const existing = await prisma.lookupPriority.findFirst({ where: { label: item.label } });
      if (!existing) {
        await prisma.lookupPriority.create({ data: { label: item.label, value: item.label, description: item.description, isActive: true } });
        results.priorities++;
      } else { results.skipped++; }
    } catch (e: any) { results.errors.push(`Priority ${item.label}: ${e.message?.slice(0, 100)}`); }
  }

  return NextResponse.json({ success: true, results });
}
