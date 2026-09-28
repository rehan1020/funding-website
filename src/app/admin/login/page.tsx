import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/admin-auth";
import { AdminLoginForm } from "@/components/AdminLoginForm";

export const metadata = { title: "Admin · The Capital Room", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  // Already an admin? Skip straight to the dashboard.
  const admin = await getAdminUser();
  if (admin) redirect("/admin");

  return (
    <section className="bg-navy-gradient flex min-h-[calc(100vh-8rem)] items-center">
      <div className="container-tr">
        <div className="mx-auto max-w-sm rounded-3xl bg-white p-8 shadow-sm">
          <p className="eyebrow text-navy/50">The Capital Room</p>
          <h1 className="mt-3 font-display text-3xl text-navy">Admin access</h1>
          <p className="mt-2 text-sm text-navy/60">
            Restricted. Authorised reviewers only.
          </p>
          <div className="mt-6">
            <AdminLoginForm />
          </div>
        </div>
      </div>
    </section>
  );
}
