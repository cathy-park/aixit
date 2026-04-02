import { HomeTodayDashboard } from "@/components/home/HomeTodayDashboard";
import { GuestModeNotice } from "@/components/landing/GuestModeNotice";

export default function DashboardLegacyPage() {
  return (
    <>
      <GuestModeNotice />
      <HomeTodayDashboard />
    </>
  );
}
