import { Logo } from "@/components/ui";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
      <div className="mb-8 flex justify-center">
        <Logo />
      </div>
      <LoginForm />
    </main>
  );
}
