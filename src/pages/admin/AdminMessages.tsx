import { Helmet } from "react-helmet-async";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { MessagesPanel } from "@/components/messages/MessagesPanel";
import { PageHeader } from "@/components/PageHeader";

export default function AdminMessages() {
  return (
    <AdminLayout>
      <Helmet>
        <title>Messages | Admin Panel</title>
      </Helmet>
      <PageHeader
        title="Seller Messages"
        subtitle="Chat with sellers for subscription verification"
      />
      <MessagesPanel />
    </AdminLayout>
  );
}
