import { PackageOpen } from 'lucide-react';

const EmptyState = ({ message = "Aucune donnée disponible." }) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-white rounded-2xl border border-dashed border-slate-200">
    <div className="h-16 w-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
      <PackageOpen className="h-8 w-8 text-slate-300" />
    </div>
    <h3 className="text-base font-semibold text-slate-700 mb-1">Aucun résultat</h3>
    <p className="text-sm text-slate-400 max-w-xs leading-relaxed">{message}</p>
  </div>
);

export default EmptyState;
