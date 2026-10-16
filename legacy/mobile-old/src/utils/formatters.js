export const fmtUSD = (n) =>
  '$' + Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtGNF = (n) =>
  Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' GNF-D';

export const fmtNum = (n) => Number(n).toLocaleString('fr-FR');

export const fmtTime = (ts) => new Date(ts * 1000).toLocaleTimeString('fr-FR');

export const fmtDate = (ts) => new Date(ts * 1000).toLocaleDateString('fr-FR');

export const truncateHash = (hash, len = 12) =>
  hash ? hash.substring(0, len) + '…' : '—';
