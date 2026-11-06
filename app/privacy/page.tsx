export default function PrivacyPage() {
  const sections = [
    {
      title: "Information We Collect",
      content:
        "When you sign in to Worksy using Google, we receive basic account information such as your name, email address, and profile image. We also collect information you provide during onboarding, including your education, skills, job preferences, preferred locations, and work mode.",
    },
    {
      title: "How We Use Your Information",
      content:
        "We use your information to personalize job recommendations, match you with relevant opportunities, maintain your profile, and improve the overall Worksy experience.",
    },
    {
      title: "Job Applications",
      content:
        "Worksy helps you discover relevant job opportunities. When you choose to apply, you are redirected to the respective company's application platform. Any information you provide there is governed by that platform's privacy policy.",
    },
    {
      title: "Saved Jobs and Activity",
      content:
        "We store your saved jobs and relevant activity to help you manage and revisit opportunities. This information is associated with your account.",
    },
    {
      title: "Data Security",
      content:
        "We take reasonable measures to protect your personal information against unauthorized access, alteration, disclosure, or loss. However, no online service can guarantee complete security.",
    },
    {
      title: "Data Sharing",
      content:
        "We do not sell your personal information. Your information is used to provide and improve Worksy's services. We may rely on trusted third-party providers for authentication, hosting, and infrastructure.",
    },
    {
      title: "Your Privacy Choices",
      content:
        "You can review and update your profile information through your account. You may also request the deletion of your account and associated personal information by contacting us.",
    },
    {
      title: "Changes to This Policy",
      content:
        "We may update this Privacy Policy from time to time. Any changes will be reflected on this page along with the updated revision date.",
    },
    {
      title: "Contact Us",
      content:
        "If you have any questions, concerns, or requests regarding this Privacy Policy, you can reach us at bichitrabehera.345@gmail.com.",
    },
  ];

  return (
    <main className="bg-background text-foreground min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-3xl px-6 py-16 sm:px-10 lg:py-20">
        <header className="border-border mb-12 border-b pb-8">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Privacy Policy
          </h1>

          <p className="text-muted-foreground mt-4 max-w-2xl text-sm leading-6">
            Your privacy matters. This policy explains how Worksy collects,
            uses, and protects your information when you use our platform.
          </p>

          <p className="text-muted-foreground mt-5 text-xs">
            Last updated: November 6, 2026
          </p>
        </header>

        <div className="space-y-10">
          {sections.map((section, index) => (
            <section key={section.title} className="space-y-3">
              <h2 className="text-lg font-semibold tracking-tight">
                {index + 1}. {section.title}
              </h2>

              <p className="text-muted-foreground text-sm leading-7">
                {section.content}
              </p>
            </section>
          ))}
        </div>

        <div className="border-border mt-14 border-t pt-6"></div>
      </div>
    </main>
  );
}
