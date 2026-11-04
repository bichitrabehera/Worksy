export default function PrivacyPage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-white dark:bg-black">
      <div className="mx-auto max-w-3xl px-6 py-20 sm:px-10 lg:px-12">
        <p className="mb-4 text-sm font-medium text-brand">Worksy</p>
        <h1 className="font-[copper] text-4xl tracking-tight sm:text-5xl">
          Privacy policy
        </h1>
        <p className="mt-4 text-sm text-zinc-500">
          Last updated: November 4, 2026
        </p>

        <div className="mt-10 space-y-8 text-base leading-8 text-zinc-600 dark:text-zinc-400">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
              Information we collect
            </h2>
            <p>
              When you create an account, we receive the account details
              provided through our authentication provider. You may also
              provide profile details such as your skills, preferences, and
              location.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
              How we use your information
            </h2>
            <p>
              We use this information to operate Worksy, personalize job
              recommendations, save jobs for you, and maintain the security of
              your account. We do not sell your personal information.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
              Contact us
            </h2>
            <p>
              If you have questions about this policy, email{" "}
              <a
                href="mailto:bichitrabehera.345@gmail.com"
                className="text-brand underline underline-offset-4"
              >
                bichitrabehera.345@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
