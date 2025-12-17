import { useForesight } from '@/contexts/ForesightContext';
import { Button } from '@/components/ui/button';
import { X, Building2, Calendar } from 'lucide-react';

export function DashboardHeader() {
  const { data, setData, companyName } = useForesight();
  
  if (!data) return null;
  
  // Support both v2.1 and legacy schema
  const company = data.strategy_context?.company || data.company_strategy?.company;
  const strategy_snapshot = data.strategy_context?.strategy_snapshot || data.company_strategy?.strategy_snapshot;

  return (
    <header className="border-b border-border bg-card">
      <div className="container py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground truncate">{companyName || company?.name || 'Company'}</h1>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <span>{company?.industry || 'Industry'}</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {company?.as_of_date || data.meta?.generated_at?.split('T')[0] || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
            {strategy_snapshot?.one_line_positioning && (
              <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                {strategy_snapshot.one_line_positioning}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setData(null)}
            className="flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
