import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { walletsApi } from '../../api/wallets.api'
import { BalanceCard } from '../../components/BalanceCard'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { ErrorMessage } from '../../components/ErrorMessage'
import { formatDate } from '../../utils/formatters'

export default function Wallet() {
  const navigate = useNavigate()
  const { data, isLoading, error } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => walletsApi.me().then((r) => r.data),
  })

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />

  return (
    <div>
      <h1 className="h4 fw-bold mb-4">Mon portefeuille</h1>

      {data && (
        <div className="row g-4">
          <div className="col-12">
            <BalanceCard
              wallet={data}
              onSend={() => navigate('/send')}
            />
          </div>

          <div className="col-12 col-md-8 col-lg-6">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-transparent fw-semibold py-3">
                Détails du portefeuille
              </div>
              <div className="card-body p-0">
                <dl className="mb-0">
                  {[
                    { label: 'NIF', value: data.nif, mono: true },
                    { label: 'Titulaire', value: `${data.prenom} ${data.nom}`, mono: false },
                    { label: 'Devise', value: data.devise, mono: false },
                    data.ville ? { label: 'Ville', value: data.ville, mono: false } : null,
                    { label: 'Statut', value: null, badge: data.statut },
                    { label: 'Ouvert le', value: formatDate(data.created_at), mono: false },
                    { label: 'Mis à jour', value: formatDate(data.updated_at), mono: false },
                  ]
                    .filter(Boolean)
                    .map((item) => {
                      if (!item) return null
                      const { label, value, mono, badge } = item as {
                        label: string
                        value?: string | null
                        mono?: boolean
                        badge?: string
                      }
                      return (
                        <div
                          key={label}
                          className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom"
                        >
                          <dt className="mb-0 text-muted small fw-normal">{label}</dt>
                          <dd className="mb-0 ms-3 text-end">
                            {badge ? (
                              <span
                                className={`badge ${badge === 'ACTIVE' ? 'bg-success' : 'bg-warning text-dark'}`}
                              >
                                {badge}
                              </span>
                            ) : (
                              <span className={mono ? 'font-monospace small' : 'small'}>
                                {value}
                              </span>
                            )}
                          </dd>
                        </div>
                      )
                    })}
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
