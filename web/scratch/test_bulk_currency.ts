import { addLookupItemsBulk } from '../src/app/actions/lookupActions';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '../.env') });
dotenv.config();

const bulkData = `
| Currency        | Code | Symbol | Country/Region |
| --------------- | ---- | ------ | -------------- |
| US Dollar       | USD  | $      | United States  |
| Canadian Dollar | CAD  | $      | Canada         |
| Mexican Peso    | MXN  | $      | Mexico         |
| Brazilian Real  | BRL  | R$     | Brazil         |
| Argentine Peso  | ARS  | $      | Argentina      |
| Chilean Peso    | CLP  | $      | Chile          |
| Colombian Peso  | COP  | $      | Colombia       |
| Peruvian Sol    | PEN  | S/     | Peru           |
`;

async function run() {
  console.log("Testing Bulk Currency Import...");
  const res = await addLookupItemsBulk("CURRENCY", bulkData, "Super Admin");
  console.log("Result:", res);
}

run().catch(console.error);
