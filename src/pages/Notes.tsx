
import MainLayout from "@/components/layout/MainLayout";
import NoteFeed from "@/components/feed/NoteFeed";

const Notes = () => {
  return (
    <MainLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Notes</h1>
        <NoteFeed />
      </div>
    </MainLayout>
  );
};

export default Notes;
