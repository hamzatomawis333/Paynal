import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatGcashNumber, formatGcashReference } from "@/lib/payments-api";
import type { PaymentGroup } from "@/lib/payments-api";

const formatPrice = (v: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(v);

interface Props {
  group: PaymentGroup;
  reference: string;
  open: boolean;
  busy: boolean;
  /**
   * True when the seller had already rejected an earlier reference, so this
   * confirms a corrected second transfer rather than a first one.
   */
  resubmit?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Deliberate confirmation before the buyer claims a transfer was sent.
 *
 * This does not confirm that money arrived - only the seller can do that, by
 * checking their own GCash. It confirms the buyer's *claim*, and it repeats the
 * seller, the amount and the reference back so a mis-pasted reference is caught
 * here rather than after the seller has already gone looking for it.
 */
export default function SendPaymentDialog({
  group, reference, open, busy, resubmit, onCancel, onConfirm,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !busy) onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {resubmit ? "Confirm you sent the payment again" : "Confirm you sent this payment"}
          </DialogTitle>
          <DialogDescription>
            {resubmit
              ? `${group.seller_name} rejected your last reference. The new one replaces it and will be checked again.`
              : `The seller will be notified immediately and will look for this reference in their GCash.`}
          </DialogDescription>
        </DialogHeader>

        <dl className="space-y-2 rounded-md border border-border bg-muted/50 p-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Seller</dt>
            <dd className="text-right font-medium text-foreground">{group.seller_name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Amount</dt>
            <dd className="text-right font-semibold tabular-nums text-foreground">
              {formatPrice(group.amount)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Sent to</dt>
            <dd className="text-right font-mono font-medium text-foreground">
              {group.gcash_number ? formatGcashNumber(group.gcash_number) : "-"}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-border pt-2">
            <dt className="text-muted-foreground">Your reference</dt>
            <dd className="text-right font-mono font-semibold text-foreground">
              {formatGcashReference(reference)}
            </dd>
          </div>
        </dl>

        <p className="text-xs text-muted-foreground">
          This does not confirm the payment - {group.seller_name} still has to
          verify it in their GCash.
          {resubmit
            ? " Check your own GCash history first so you send the right amount to the number shown above."
            : " If they cannot find it, they will reject it and you can sort it out over chat."}
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={busy}>
            {busy ? "Sending..." : resubmit ? "Yes, I've sent it again" : "Yes, I've sent it"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}