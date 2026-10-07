import { Helmet } from "react-helmet-async";
import { SellerLayout } from "@/components/seller/SellerLayout";
import { MessagesPanel } from "@/components/messages/MessagesPanel";
import { PageHeader } from "@/components/PageHeader";

export default function SellerMessages() {
  return (
    <>
      <Helmet>
        <title>Messages | Seller Hub</title>
      </Helmet>
      <SellerLayout>
        <PageHeader
          title="Messages"
          subtitle="Reply to inquiries from buyers"
        />
        <MessagesPanel />
      </SellerLayout>
    </>
  );
}
