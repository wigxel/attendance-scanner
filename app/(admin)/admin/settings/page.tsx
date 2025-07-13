import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OccupationManagement from "@/components/manage-occupation";

export default function SettingsPage() {
  return (
    <div>
      <section className="p-8">
        <h1 className="text-3xl font-bold mb-4">Settings</h1>
        <p>Manage all settings here.</p>
      </section>

      <Tabs defaultValue="onboarding">
        <section className="flex min-h-[400px]">
          <div className="flex w-full mx-auto bg-white p-1  dark:bg-black rounded-lg gap-4">
            {/* Tabs List (Sidebar) */}
            <div className="w-96 p-4">
              <TabsList className="flex flex-col gap-2 w-full bg-transparent p-0">
                <TabsTrigger
                  value="onboarding"
                  className="justify-start w-full"
                >
                  Onboarding
                </TabsTrigger>
                <TabsTrigger value="profile" className="justify-start w-full">
                  User Profile
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tabs Content */}
            <section className="flex-1 p-6 shadow-inner rounded-lg bg-gray-50">
              <TabsContent value="onboarding">
                <OccupationManagement />
              </TabsContent>

              <TabsContent value="profile">Hello man</TabsContent>
            </section>
          </div>
        </section>
      </Tabs>
    </div>
  );
}
