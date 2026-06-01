import { getParticipants } from "@/lib/data";
import ParticipantManager from "./ParticipantManager";

export const dynamic = "force-dynamic";

export default async function ParticipantsPage() {
  const participants = await getParticipants();
  return <ParticipantManager participants={participants} />;
}
