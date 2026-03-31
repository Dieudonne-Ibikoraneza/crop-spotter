import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RegisterFarmForm } from "@/components/farmer/register-farm-form";

export type RegisterFarmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RegisterFarmDialog({ open, onOpenChange }: RegisterFarmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register a farm</DialogTitle>
        </DialogHeader>
        <RegisterFarmForm onSuccess={() => onOpenChange(false)} className="pt-1" />
      </DialogContent>
    </Dialog>
  );
}
