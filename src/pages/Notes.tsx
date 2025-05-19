
import MainLayout from "@/components/layout/MainLayout";
import NoteBin from "@/components/notebin/NoteBin";

const Notes = () => {
  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">NoteBin</h1>
        </div>
        
        <NoteBin />
      </div>
    </MainLayout>
  );
};

export default Notes;
