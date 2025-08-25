import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

interface BookDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BookDemoModal({ isOpen, onClose }: BookDemoModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    organization: "",
    email: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Here you would typically send the data to your backend
      // For now, we'll just show a success message
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast({
        title: "Demo Booked Successfully!",
        description: "We'll contact you within 24 hours to schedule your personalized demo.",
      });
      
      setFormData({ name: "", organization: "", email: "" });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to book demo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Book a Demo</DialogTitle>
          <DialogDescription>
            Get a personalized demonstration of FinNavigator's capabilities. Our team will reach out to schedule your demo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organization">Organization</Label>
            <Input
              id="organization"
              type="text"
              placeholder="Enter your organization name"
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email address"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Booking..." : "Book Demo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}