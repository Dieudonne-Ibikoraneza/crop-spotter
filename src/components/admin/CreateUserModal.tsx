import { useState } from "react";
import { useRegisterUser } from "@/lib/api/hooks/useAdmin";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, UserPlus } from "lucide-react";

interface CreateUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateUserModal = ({ open, onOpenChange }: CreateUserModalProps) => {
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [role, setRole] = useState("FARMER");
  
  const registerUser = useRegisterUser();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerUser.mutate(
      { email, phoneNumber, nationalId, role },
      {
        onSuccess: () => {
          setEmail("");
          setPhoneNumber("");
          setNationalId("");
          setRole("FARMER");
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Create New User
          </DialogTitle>
          <DialogDescription>
            Register a new platform user. They will receive a welcome email with their temporary credentials.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nationalId">National ID (16 digits)</Label>
            <Input
              id="nationalId"
              placeholder="e.g. 1199012345678901"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
              required
              minLength={16}
              maxLength={16}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              placeholder="0721234567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Platform Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FARMER">Farmer</SelectItem>
                <SelectItem value="ASSESSOR">Field Assessor</SelectItem>
                <SelectItem value="INSURER">Insurer</SelectItem>
                <SelectItem value="GOVERNMENT">Government Official</SelectItem>
                <SelectItem value="ADMIN">Administrator</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={registerUser.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={registerUser.isPending}>
              {registerUser.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                "Create User"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateUserModal;
