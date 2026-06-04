import { db } from '../src/lib/prisma';

async function main() {
  console.log("Truncating platform.lookup_currencies...");
  await db.$executeRawUnsafe(`TRUNCATE TABLE platform.lookup_currencies CASCADE;`);
  
  const currencies = [
    { label: 'US Dollar', code: 'USD', symbol: '$', icon: '🇺🇸' },
    { label: 'Euro', code: 'EUR', symbol: '€', icon: '🇪🇺' },
    { label: 'British Pound', code: 'GBP', symbol: '£', icon: '🇬🇧' },
    { label: 'Japanese Yen', code: 'JPY', symbol: '¥', icon: '🇯🇵' },
    { label: 'Australian Dollar', code: 'AUD', symbol: 'A$', icon: '🇦🇺' },
    { label: 'Canadian Dollar', code: 'CAD', symbol: 'C$', icon: '🇨🇦' },
    { label: 'Swiss Franc', code: 'CHF', symbol: 'Fr', icon: '🇨🇭' },
    { label: 'Chinese Yuan', code: 'CNY', symbol: '¥', icon: '🇨🇳' },
    { label: 'Indian Rupee', code: 'INR', symbol: '₹', icon: '🇮🇳' },
    { label: 'Singapore Dollar', code: 'SGD', symbol: 'S$', icon: '🇸🇬' },
    { label: 'New Zealand Dollar', code: 'NZD', symbol: 'NZ$', icon: '🇳🇿' },
    { label: 'Hong Kong Dollar', code: 'HKD', symbol: 'HK$', icon: '🇭🇰' },
    { label: 'UAE Dirham', code: 'AED', symbol: 'د.إ', icon: '🇦🇪' },
    { label: 'South African Rand', code: 'ZAR', symbol: 'R', icon: '🇿🇦' },
    { label: 'Brazilian Real', code: 'BRL', symbol: 'R$', icon: '🇧🇷' },
    { label: 'Mexican Peso', code: 'MXN', symbol: '$', icon: '🇲🇽' },
    { label: 'Saudi Riyal', code: 'SAR', symbol: '﷼', icon: '🇸🇦' },
    { label: 'Norwegian Krone', code: 'NOK', symbol: 'kr', icon: '🇳🇴' },
    { label: 'Swedish Krona', code: 'SEK', symbol: 'kr', icon: '🇸🇪' },
    { label: 'Danish Krone', code: 'DKK', symbol: 'kr', icon: '🇩🇰' }
  ];

  for (const c of currencies) {
    try {
      await db.lookupCurrency.create({
        data: {
          ...c,
          isActive: true,
          isGovernanceLocked: true
        }
      });
      console.log(`Inserted ${c.code}`);
    } catch (e: any) {
      console.error(`Failed to insert ${c.code}:`, e.message);
    }
  }

  console.log("Currency population complete.");
}

main().catch(console.error).finally(() => db.$disconnect());
