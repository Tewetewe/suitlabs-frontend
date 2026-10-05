import { redirect } from 'next/navigation';

// WA Reminders moved to the operations menu, so Staff can copy the reminders
// by hand when Wablas does not send. Old bookmarks land on the new page.
export default function OldWARemindersPage() {
  redirect('/dashboard/wa-reminders');
}
