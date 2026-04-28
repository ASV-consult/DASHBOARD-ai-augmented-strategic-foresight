import { Link } from "react-router-dom";
import { ForesightProvider, useForesight } from "@/contexts/ForesightContext";
import { FileUpload } from "@/components/FileUpload";
import { Dashboard } from "@/components/Dashboard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

function UploadContent() {
  const { isLoaded } = useForesight();
  const { signOut } = useAuth();

  if (isLoaded) return <Dashboard />;

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-muted-foreground hover:underline">
              ← Home
            </Link>
            <h1 className="text-lg font-semibold">Upload JSON</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => signOut()}>
            Sign out
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <FileUpload />
      </main>
    </div>
  );
}

export default function UploadPage() {
  return (
    <ForesightProvider>
      <UploadContent />
    </ForesightProvider>
  );
}
