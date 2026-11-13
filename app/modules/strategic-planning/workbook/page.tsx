import { getStrategicWorkbookData } from "@/lib/data/strategic-workbook";

import { StrategicWorkbook } from "./strategic-workbook";

export const dynamic = "force-dynamic";

export default async function StrategicWorkbookPage() {
  return <StrategicWorkbook data={await getStrategicWorkbookData()} />;
}
