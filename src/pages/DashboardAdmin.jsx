import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getEntities } from '../api/admin';
import Loading from '../components/Loading';
import ErrorAlert from '../components/ErrorAlert';
import { Building, BookOpen, GraduationCap, Briefcase, LogOut } from 'lucide-react';

const DashboardAdmin = () => {
  const navigate = useNavigate();
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Vérifier si le token existe
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // On récupère la liste pour avoir le total (dans une vraie app, on aurait un endpoint /admin/stats)
        const [uni, fac, prog, jobs] = await Promise.all([
          getEntities('universities'),
          getEntities('faculties'),
          getEntities('programs'),
          getEntities('jobs')
        ]);
        
        setCounts({
          universities: uni.total ?? uni.items?.length ?? 0,
          faculties:    fac.total ?? fac.items?.length ?? 0,
          programs:     prog.total ?? prog.items?.length ?? 0,
          jobs:         jobs.total ?? jobs.items?.length ?? 0,
        });
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('adminToken');
          navigate('/admin/login');
        } else {
          setError("Impossible de charger les données du dashboard.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  if (loading) return <Loading />;
  if (error) return <ErrorAlert message={error} />;

  const cards = [
    { title: 'Universités', count: counts?.universities, icon: Building, color: 'text-blue-500', link: '/admin/crud/universities' },
    { title: 'Facultés', count: counts?.faculties, icon: BookOpen, color: 'text-indigo-500', link: '/admin/crud/faculties' },
    { title: 'Filières', count: counts?.programs, icon: GraduationCap, color: 'text-purple-500', link: '/admin/crud/programs' },
    { title: 'Métiers', count: counts?.jobs, icon: Briefcase, color: 'text-emerald-500', link: '/admin/crud/jobs' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-5 border-b border-slate-200">
        <h2 className="text-2xl font-bold leading-7 text-slate-900 sm:text-3xl sm:truncate">
          Tableau de bord Administrateur
        </h2>
        <button onClick={handleLogout} className="inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50">
          <LogOut className="w-4 h-4 mr-2" /> Déconnexion
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.title} to={card.link} className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Icon className={`h-8 w-8 ${card.color}`} aria-hidden="true" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-slate-500 truncate">{card.title}</dt>
                      <dd>
                        <div className="text-2xl font-bold text-slate-900">{card.count}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 px-5 py-3">
                <div className="text-sm">
                  <span className="font-medium text-primary-600 hover:text-primary-900">Gérer {card.title.toLowerCase()} &rarr;</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardAdmin;
