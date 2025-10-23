import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface BulkDeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (unstarredOnly: boolean) => Promise<void>;
  totalCount: number;
  unstarredCount: number;
}

export function BulkDeleteModal({
  open,
  onOpenChange,
  onConfirm,
  totalCount,
  unstarredCount,
}: BulkDeleteModalProps) {
  const [unstarredOnly, setUnstarredOnly] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(unstarredOnly);
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
      setUnstarredOnly(true); // Reset for next time
    }
  };

  const countToDelete = unstarredOnly ? unstarredCount : totalCount;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete all saved leagues?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              Are you sure you want to delete <strong>ALL data</strong> in{' '}
              <strong>ALL</strong> of your saved leagues?
            </p>

            {/* Checkbox for unstarred only */}
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="unstarred-only"
                checked={unstarredOnly}
                onCheckedChange={(checked) => setUnstarredOnly(checked === true)}
                disabled={isDeleting}
              />
              <Label
                htmlFor="unstarred-only"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Unstarred leagues only
              </Label>
            </div>

            {/* Show count */}
            {countToDelete > 0 ? (
              <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
                {countToDelete} league{countToDelete !== 1 ? 's' : ''} will be deleted.
              </p>
            ) : (
              <p className="text-sm text-amber-500" role="status" aria-live="polite">
                No {unstarredOnly ? 'unstarred ' : ''}leagues to delete.
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting || countToDelete === 0}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              `Delete All Leagues`
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
