import { signOutAction } from "@/app/admin/actions";

export const metadata = { title: "Admin access unavailable", robots: { index: false, follow: false } };

export default function UnauthorisedPage() {
  return <div className="admin-login-page"><section className="admin-login-card"><p className="eyebrow">Access unavailable</p><h1>No CMS role is assigned</h1><p>Your sign-in is valid, but the owner has not assigned this account a content management role.</p><form action={signOutAction}><button className="admin-button admin-button-primary" type="submit">Sign out safely</button></form></section></div>;
}
