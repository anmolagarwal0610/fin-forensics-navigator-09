import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthProps {
  password: string;
}

interface Requirement {
  label: string;
  met: boolean;
}

export const PasswordStrength = ({ password }: PasswordStrengthProps) => {
  const requirements: Requirement[] = useMemo(() => [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Contains number', met: /\d/.test(password) },
  ], [password]);

  const strength = useMemo(() => {
    const metCount = requirements.filter(r => r.met).length;
    if (metCount === 0) return { label: '', color: '' };
    if (metCount <= 2) return { label: 'Weak', color: 'text-destructive' };
    if (metCount === 3) return { label: 'Medium', color: 'text-warning' };
    return { label: 'Strong', color: 'text-success' };
  }, [requirements]);

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Password strength:</span>
        {strength.label && (
          <span className={cn('text-xs font-medium', strength.color)}>
            {strength.label}
          </span>
        )}
      </div>
      <div className="space-y-1">
        {requirements.map((req, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            {req.met ? (
              <Check className="h-3 w-3 text-success" />
            ) : (
              <X className="h-3 w-3 text-muted-foreground" />
            )}
            <span className={cn(
              'text-xs',
              req.met ? 'text-success' : 'text-muted-foreground'
            )}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
