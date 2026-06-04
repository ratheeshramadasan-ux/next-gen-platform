import { getPlatformLookups } from '../src/app/actions/lookupActions';

async function main() {
  try {
    console.log('[TEST] Calling getPlatformLookups...');
    const result = await getPlatformLookups(true);
    console.log('[TEST] Success! Keys returned:', Object.keys(result).join(', '));
    console.log('[TEST] Industries count:', result.industries?.length);
  } catch (e: any) {
    console.error('[TEST] Action failed:', e);
  }
}

main().catch(console.error);
