/**
 * Security Deposit money, as the backend counts it (entity.Rental).
 *
 * A lost-item Sale may take its fee from the deposit first. Damage then comes
 * off what is left, and the release refunds the rest.
 */
type DepositLike = {
  security_deposit?: number | null;
  deposit_applied_to_sales?: number | null;
  damage_charges?: number | null;
  deposit_collected_at?: string | null;
  deposit_refunded_at?: string | null;
};

/** True while the shop holds the deposit: collected and not yet released. */
export function depositHeld(rental: DepositLike): boolean {
  return Boolean(rental.deposit_collected_at) && !rental.deposit_refunded_at && (rental.security_deposit || 0) > 0;
}

/** The deposit left after lost-item Sales took their part. */
export function depositLeft(rental: DepositLike): number {
  return Math.max(0, (rental.security_deposit || 0) - (rental.deposit_applied_to_sales || 0));
}

/** What goes back to the customer after lost-item Sales and damage. */
export function refundableDeposit(rental: DepositLike, damage = rental.damage_charges || 0): number {
  return Math.max(0, depositLeft(rental) - damage);
}
