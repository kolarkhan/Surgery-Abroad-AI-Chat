import { Suspense } from "react";
import Chat from "./components/Chat";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center px-6 text-sm font-medium text-muted-foreground">
          Loading assistant...
        </div>
      }
    >
      <Chat />
    </Suspense>
  );
}
