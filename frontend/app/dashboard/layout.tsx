import { DashboardSidebar } from "@/components/DashboardSidebar";
import { DashboardRightPanel } from "@/components/DashboardRightPanel";
import { DashboardTopBar } from "@/components/DashboardTopBar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardTopBar />
        <main className="flex-1 overflow-y-auto p-6 bg-background">
          {children}
        </main>
      </div>

      {/* Right panel — hidden on screens < xl */}
      {/* <div className="hidden xl:flex">
        <DashboardRightPanel />
      </div> */}
    </div>
  );
}
