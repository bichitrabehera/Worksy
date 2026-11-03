import HomeContent from "@/components/Home";

export default async function Home() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white dark:bg-black">
      <HomeContent />
    </div>
  );
}
