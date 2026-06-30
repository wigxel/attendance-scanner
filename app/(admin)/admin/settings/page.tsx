import {
  BadgeDollarSign,
  Grid2X2Icon,
  KeyRound,
  ScrollText,
  Shield,
  User,
  Users,
  Wrench,
} from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";
import PermissionsSettingsPage from "@/app/(admin)/admin/settings/permissions/page";
import RolesSettingsPage from "@/app/(admin)/admin/settings/roles/page";
import TeamSettingsPage from "@/app/(admin)/admin/settings/team/page";
import { AuditLogsTab } from "@/components/audit-logs-tab";
import OccupationManagement from "@/components/manage-occupation";
import PricingManagement from "@/components/manage-pricing";
import { RoleHas } from "@/components/RoleHas";
import {
  SeatStructureGrid,
  SeatStructureGridErrorFallback,
} from "@/components/SeatStructureGrid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsPage() {
  return (
    <div>
      <section className="p-8">
        <h1 className="text-3xl font-bold mb-4">Settings</h1>
        <p>Manage all settings here.</p>
      </section>

      <Tabs defaultValue="onboarding">
        <section className="flex min-h-[400px]">
          <div className="flex w-full mx-auto bg-(--background) p-1 items-start rounded-lg gap-4">
            {/* Tabs List (Sidebar) */}
            <div className="w-96 p-4 sticky top-0">
              <TabsList className="flex flex-col gap-2 w-full bg-transparent p-0">
                <TabsTrigger
                  value="onboarding"
                  className="justify-start w-full"
                >
                  <Wrench className="w-4 h-4 mr-2" />
                  Onboarding
                </TabsTrigger>
                <TabsTrigger value="pricing" className="justify-start w-full">
                  <BadgeDollarSign className="w-4 h-4 mr-2" />
                  Pricing
                </TabsTrigger>
                <TabsTrigger value="profile" className="justify-start w-full">
                  <User className="w-4 h-4 mr-2" />
                  User Profile
                </TabsTrigger>
                <TabsTrigger value="seats" className="justify-start w-full">
                  <Grid2X2Icon className="w-4 h-4 mr-2" />
                  Seat Layout
                </TabsTrigger>

                <RoleHas privileges={["user:assign:role"]}>
                  <TabsTrigger value="roles" className="justify-start w-full">
                    <Shield className="w-4 h-4 mr-2" />
                    Roles
                  </TabsTrigger>

                  <TabsTrigger value="team" className="justify-start w-full">
                    <Users className="w-4 h-4 mr-2" />
                    Team
                  </TabsTrigger>

                  <TabsTrigger
                    value="permissions"
                    className="justify-start w-full"
                  >
                    <KeyRound className="w-4 h-4 mr-2" />
                    Permissions
                  </TabsTrigger>
                </RoleHas>

                <RoleHas privileges={["audit:read"]}>
                  <TabsTrigger value="audit" className="justify-start w-full">
                    <ScrollText className="w-4 h-4 mr-2" />
                    Audit Logs
                  </TabsTrigger>
                </RoleHas>
              </TabsList>
            </div>

            {/* Tabs Content */}
            <section className="flex-1 self-stretch p-6 shadow-inner rounded-lg bg-(--background-lv1)">
              <TabsContent value="onboarding">
                <OccupationManagement />
              </TabsContent>

              <TabsContent value="pricing">
                <PricingManagement />
              </TabsContent>

              <TabsContent value="profile">Work In Progress</TabsContent>

              <TabsContent value="seats">
                <ErrorBoundary
                  FallbackComponent={SeatStructureGridErrorFallback}
                >
                  <SeatStructureGrid />
                </ErrorBoundary>
              </TabsContent>

              <TabsContent value="roles">
                <RoleHas privileges={["user:assign:role"]}>
                  <RolesSettingsPage />
                </RoleHas>
              </TabsContent>

              <TabsContent value="team">
                <RoleHas privileges={["user:assign:role"]}>
                  <TeamSettingsPage />
                </RoleHas>
              </TabsContent>

              <TabsContent value="permissions">
                <RoleHas privileges={["user:assign:role"]}>
                  <PermissionsSettingsPage />
                </RoleHas>
              </TabsContent>

              <TabsContent value="audit">
                <RoleHas privileges={["audit:read"]}>
                  <AuditLogsTab />
                </RoleHas>
              </TabsContent>
            </section>
          </div>
        </section>
      </Tabs>
    </div>
  );
}
