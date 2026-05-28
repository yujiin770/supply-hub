import Navbar from "../components/navbar";
import { ImpersonationBanner } from "../components/impersonation_banner";

interface Props {
  children: React.ReactNode;
}

export default function AppLayout({ children }: Props) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <ImpersonationBanner />
      <Navbar />
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">{children}</main>
    </div>
  );
}
