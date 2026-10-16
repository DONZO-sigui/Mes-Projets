import axios from 'axios';

/**
 * Remplacez par l'IP locale de votre machine en développement.
 * Ex : 'http://192.168.1.42:5000'
 * En production, pointez vers votre serveur déployé.
 */
export const BASE_URL = __DEV__
  ? 'http://10.0.2.2:5000'   // Android Emulator → localhost
  : 'https://api.gnftoken.com';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.erreur || err.message || 'Erreur réseau';
    return Promise.reject(new Error(msg));
  }
);

export const api = {
  getStats:        ()       => client.get('/api/stats'),
  getChain:        ()       => client.get('/api/chaine'),
  sendTransaction: (body)   => client.post('/api/transaction', body),
  simulate:        (n)      => client.post('/api/simulation', { nb_transactions: n }),
  reset:           ()       => client.post('/api/reset'),

  mnbc: {
    getWallets:    ()     => client.get('/api/mnbc/portefeuilles'),
    getHistory:    ()     => client.get('/api/mnbc/historique'),
    getAML:        ()     => client.get('/api/mnbc/aml'),
    createWallet:  (body) => client.post('/api/mnbc/creer', body),
    transfer:      (body) => client.post('/api/mnbc/transfert', body),
  },
};
