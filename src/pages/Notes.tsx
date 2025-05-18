
import MainLayout from "@/components/layout/MainLayout";
import NoteFeed from "@/components/feed/NoteFeed";

const Notes = () => {
  return (
    <MainLayout>
      <div className="flex flex-col h-full">
        <h1 className="text-2xl font-bold mb-4">Notes</h1>
        <div className="flex-1 overflow-hidden">
          <NoteFeed />
        </div>
      </div>
    </MainLayout>
  );
};

export default Notes;
