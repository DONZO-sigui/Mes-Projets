const Loading = () => (
  <div className="flex flex-col items-center justify-center h-64 gap-4">
    <div className="relative h-12 w-12">
      <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
      <div className="absolute inset-0 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
    </div>
    <p className="text-sm text-slate-400 font-medium">Chargement en cours…</p>
  </div>
);

export default Loading;
