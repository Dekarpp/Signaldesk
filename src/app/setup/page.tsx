import {notFound} from "next/navigation";
import SetupClient from "@/components/SetupClient";

export default function SetupPage() {
  if (process.env.SIGNALDESK_SETUP_ENABLED !== "true") {
    notFound();
  }

  return <SetupClient />;
}
