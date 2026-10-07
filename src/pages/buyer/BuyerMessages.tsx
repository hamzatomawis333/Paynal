import { Helmet } from "react-helmet-async";
import { BuyerLayout } from "@/components/buyer/BuyerLayout";
import { MessagesPanel } from "@/components/messages/MessagesPanel";
import { PageHeader } from "@/components/PageHeader";

export default function BuyerMessages() {
  return (
    <>
      <Helmet>
        <title>Messages | My Account</title>
      </Helmet>
      <BuyerLayout>
        <PageHeader
          title="Messages"
          subtitle="Chat directly with artisans and sellers"
        />
        <MessagesPanel />
      </BuyerLayout>
    </>
  );
}
