import { getCriteria } from "@/lib/data";
import RubricManager from "./RubricManager";

export const dynamic = "force-dynamic";

export default async function RubricPage() {
  const criteria = await getCriteria();
  return <RubricManager criteria={criteria} />;
}
