/**
 * EmptySectionView — placeholder for v3 sections not yet populated.
 *
 * Used in Outside-In, Course Correction, and Position & Financials slots
 * where the section is structurally locked but content is built in a later
 * phase. Intentionally NO fake data — just a clear "this is where X will live".
 */
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Telescope, type LucideIcon } from 'lucide-react';

interface EmptySectionViewProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  badge?: string;
}

export const EmptySectionView: React.FC<EmptySectionViewProps> = ({
  title,
  description,
  icon: Icon = Telescope,
  badge = 'Empty — to be populated in a later phase',
}) => {
  return (
    <Card className="rounded-3xl border-rose-500/30 bg-rose-500/[0.04] shadow-sm">
      <CardContent className="space-y-4 p-8">
        <div className="flex items-start gap-3">
          <div className="mt-1 rounded-full bg-rose-500/10 p-2">
            <Icon className="h-5 w-5 text-rose-500" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-foreground">{title}</h2>
              <Badge
                variant="outline"
                className="rounded-full border-rose-500/40 text-[10px] text-rose-700 dark:text-rose-300"
              >
                {badge}
              </Badge>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
            <p className="text-xs text-muted-foreground/70">
              This section is part of the locked Strategic Radar architecture (v3 structural rebuild).
              The container is in place; content will follow in subsequent build phases.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
