import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BookDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BookDemoModal({ isOpen, onClose }: BookDemoModalProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: "",
    organization: "",
    email: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await supabase.functions.invoke('send-book-demo', {
        body: formData,
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to submit demo request');
      }

      toast({
        title: t('demo.demoBooked'),
        description: t('demo.demoConfirmation'),
      });
      
      setFormData({ name: "", organization: "", email: "", phone: "" });
      onClose();
    } catch (error: any) {
      console.error('Book demo error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to book demo. Please try again.",
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
          <DialogTitle>{t('demo.bookDemo')}</DialogTitle>
          <DialogDescription>
            {t('demo.demoDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('demo.fullName')}</Label>
            <Input
              id="name"
              type="text"
              placeholder={t('demo.enterFullName')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organization">{t('demo.organization')}</Label>
            <Input
              id="organization"
              type="text"
              placeholder={t('demo.enterOrganization')}
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t('demo.emailAddress')}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('demo.enterEmail')}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t('demo.phoneNumber')}</Label>
            <Input
              id="phone"
              type="tel"
              placeholder={t('demo.enterPhone')}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('actions.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('demo.booking') : t('demo.bookDemoBtn')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}