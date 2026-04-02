import { Suspense } from "react";
import { HomeTodayDashboard } from "@/components/home/HomeTodayDashboard";
import { GuestModeNotice } from "@/components/landing/GuestModeNotice";

export default function DashboardLegacyPage() {
  return (
    <>
      <Suspense fallback={null}>
        <GuestModeNotice />
      </Suspense>
      <HomeTodayDashboard />
    </>
  );
}
