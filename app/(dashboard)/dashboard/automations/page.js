import { AutomationsManager } from "@/components/dashboard/automations-manager";

export const metadata = {
  title: "Automations & Media Library — RawReply",
  description: "Select Instagram media and manage comment-to-DM triggers and lead qualification workflows.",
};

export default function AutomationsPage() {
  return <AutomationsManager />;
}
