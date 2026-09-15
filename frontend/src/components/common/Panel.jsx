import React from 'react';
import { cn } from '../../lib/utils';

// Reusable bordered surface panel matching the intelligence-platform aesthetic.
export const Panel = React.forwardRef(({ className, children, hover = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'bg-surface border border-hairline rounded-lg',
      hover && 'hover:border-[#383C45] transition-colors duration-150',
      className,
    )}
    {...props}
  >
    {children}
  </div>
));
Panel.displayName = 'Panel';

export const PanelHeader = ({ title, subtitle, action, className }) => (
  <div className={cn('flex items-start justify-between gap-4 px-5 py-4 border-b border-divider', className)}>
    <div>
      <h3 className="text-sm font-semibold text-[#EDEDED] tracking-tight">{title}</h3>
      {subtitle && <p className="text-xs text-[#737987] mt-0.5">{subtitle}</p>}
    </div>
    {action}
  </div>
);
