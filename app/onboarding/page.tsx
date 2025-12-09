import OnboardingForm from "@/components/OnboardingForm";
import { currentUser } from "@clerk/nextjs/server";

export default async function Onboarding() {
  const user = await currentUser();

  return (
    <div className="flex flex-col gap-8 w-96 mx-auto h-screen justify-center items-center p-6">
      <h1 className="text-2xl font-bold">Complete Your Profile</h1>
      <p className="text-center text-muted-foreground">
        Please provide the following information to complete your registration.
      </p>

      <OnboardingForm
        initial={{
          firstName: user?.firstName ?? "",
          lastName: user?.lastName ?? "",
        }}
      />
    </div>
  );
}
