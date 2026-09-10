import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getUniversityById } from '../api/universities';
import Loading from '../components/Loading';
import ErrorAlert from '../components/ErrorAlert';
import { MapPin, Globe, Calendar, Building } from 'lucide-react';

// Logo de l'université avec fallback si l'image est cassée
const UniversityLogoWithFallback = ({ university }) => {
  const [imgError, setImgError] = useState(false);
  if (university.logo_url && !imgError) {
    return (
      <img
        src={university.logo_url}
        alt={`Logo ${university.name}`}
        className="h-full w-full object-contain p-2"
        onError={() => setImgError(true)}
      />
    );
  }
  return <Building className="h-16 w-16 text-slate-300" />;
};

const FicheUniversite = () => {
  // Récupération de l'ID passé dans l'URL (ex: /universities/1 => id = 1)
  const { id } = useParams();
  
  // Création d'une variable 'university' pour stocker les données (vide au départ)
  const [university, setUniversity] = useState(null);
  
  // Création d'une variable 'loading' pour savoir si on est en train de charger (vrai au départ)
  const [loading, setLoading] = useState(true);
  
  // Création d'une variable 'error' en cas de problème (vide au départ)
  const [error, setError] = useState(null);

  // Ce bloc s'exécute au lancement de la page OU si l'ID de l'URL change
  useEffect(() => {
    // Définition de la fonction qui va interroger le serveur
    const fetchUniversity = async () => {
      try {
        // On signale qu'on commence à charger
        setLoading(true);
        // On demande au serveur les détails de l'université qui a cet 'id'
        const data = await getUniversityById(id);
        // On sauvegarde le résultat dans la variable 'university'
        setUniversity(data);
      } catch (err) {
        // Si le serveur crashe, on stocke un message d'erreur
        setError("Impossible de charger les détails de l'université.");
        console.error(err);
      } finally {
        // Peu importe ce qui s'est passé, on arrête de charger
        setLoading(false);
      }
    };

    // Lancement effectif de la fonction qu'on vient de définir
    fetchUniversity();
  }, [id]); // Le [id] signifie : "Refais cet appel API si l'ID change"

  // Si on est en train de charger, on retourne l'icône de chargement
  if (loading) return <Loading />;
  
  // Si on a eu une erreur, on l'affiche
  if (error) return <ErrorAlert message={error} />;
  
  // Si on n'a trouvé aucune université malgré la fin du chargement, on met une erreur
  if (!university) return <ErrorAlert message="Université introuvable." />;

  // On extrait la liste des facultés. Si elle n'existe pas, on met un tableau vide par défaut []
  const faculties = university.faculties || [];

  // Début du rendu visuel de la page
  return (
    // Conteneur global avec un espacement vertical (space-y-8)
    <div className="space-y-8">
      
      {/* ============================== */}
      {/* SECTION 1 : EN-TETE ET LOGO    */}
      {/* ============================== */}
      <div className="bg-white shadow rounded-2xl overflow-hidden">
        
        {/* Bandeau supérieur — dégradé avec logo MESRSI en filigrane */}
        <div className="bg-gradient-to-r from-primary-800 via-primary-600 to-primary-500 h-36 sm:h-52 relative overflow-hidden">
          {/* Points décoratifs */}
          <div className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}
          />
          {/* Logo MESRSI — grand filigrane à droite */}
          <img
            src="/mesrsi.svg"
            alt=""
            aria-hidden="true"
            className="absolute right-6 top-1/2 -translate-y-1/2 h-24 sm:h-40 w-auto object-contain opacity-25 select-none pointer-events-none"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          {/* Badge MESRSI visible en bas à gauche */}
          <div className="absolute bottom-4 left-6 hidden sm:flex items-center gap-2.5">
            <img
              src="/mesrsi.svg"
              alt="MESRSI"
              className="h-9 w-9 object-contain opacity-80"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <span className="text-white/80 text-xs font-medium leading-tight max-w-[220px]">
              Ministère de l&apos;Enseignement Supérieur,<br/>de la Recherche Scientifique et de l&apos;Innovation
            </span>
          </div>
        </div>

        {/* Conteneur principal de l'en-tête */}
        <div className="px-4 sm:px-8 pb-8 relative">

          {/* Logo de l'université */}
          <div className="-mt-16 sm:-mt-24 mb-4 flex justify-center">
            <div className="h-32 w-32 sm:h-40 sm:w-40 rounded-2xl border-4 border-white bg-white shadow-lg flex items-center justify-center overflow-hidden">
              <UniversityLogoWithFallback university={university} />
            </div>
          </div>
          
          {/* Bloc texte (Nom de l'université et statut) */}
          <div className="text-center">
            {/* Nom de l'université */}
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-2">
              Bienvenue à {university.name}
            </h1>
            
            {/* Si un acronyme existe, on l'affiche */}
            {university.acronym && (
              <p className="text-lg font-medium text-primary-600 mb-4">{university.acronym}</p>
            )}
            
            {/* Badge affichant Publique ou Privée */}
            <div className="flex justify-center mt-2">
              <span className={`px-4 py-1 text-sm font-semibold rounded-full ${
                // Condition : si statut est "publique", on met du vert, sinon du bleu
                university.status === 'publique' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {/* Texte affiché dans le badge */}
                {university.status === 'publique' ? 'Institution Publique' : 'Institution Privée'}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* ============================== */}
      {/* SECTION 2 : INFORMATIONS       */}
      {/* ============================== */}
      <div className="bg-white shadow rounded-2xl p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 border-b pb-2">Informations Générales</h2>
        
        {/* Grille divisée en 2 colonnes sur écran moyen (md:grid-cols-2) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Colonne de gauche (Ville, Année, Site Web) */}
          <div className="space-y-4">
            
            {/* Ligne : Localisation */}
            <div className="flex items-start">
              <MapPin className="w-5 h-5 text-primary-500 mt-0.5 mr-3 flex-shrink-0"/>
              <div>
                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Localisation</h4>
                <p className="text-slate-900 font-medium">{university.city}</p>
              </div>
            </div>
            
            {/* Ligne : Fondation */}
            <div className="flex items-start">
              <Calendar className="w-5 h-5 text-primary-500 mt-0.5 mr-3 flex-shrink-0"/>
              <div>
                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Fondation</h4>
                <p className="text-slate-900 font-medium">{university.founded_year}</p>
              </div>
            </div>
            
            {/* Ligne : Site Web (ne s'affiche que si l'université a un site web) */}
            {university.website && (
              <div className="flex items-start">
                <Globe className="w-5 h-5 text-primary-500 mt-0.5 mr-3 flex-shrink-0"/>
                <div>
                  <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Site Web</h4>
                  <a href={university.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 font-medium hover:underline">
                    {university.website}
                  </a>
                </div>
              </div>
            )}
          </div>
          
          {/* Colonne de droite (Description / A propos) */}
          <div>
            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">À propos</h4>
            <p className="text-slate-700 whitespace-pre-line leading-relaxed">
              {/* Si pas de description, on affiche une phrase par défaut */}
              {university.description || "Aucune description détaillée n'est disponible pour cette institution."}
            </p>
          </div>
        </div>
      </div>

      {/* ============================== */}
      {/* SECTION 3 : FORMATIONS         */}
      {/* ============================== */}
      <div className="bg-white shadow rounded-2xl p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 border-b pb-2 flex items-center">
          <Building className="w-6 h-6 mr-3 text-primary-600"/>
          Offres de Formation
        </h2>
        
        {/* Vérification : s'il y a plus de 0 facultés */}
        {faculties.length > 0 ? (
          <div className="space-y-6">
            
            {/* On boucle sur chaque faculté pour l'afficher */}
            {faculties.map((faculty) => (
              <div key={faculty.id} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                
                {/* En-tête de la faculté (Nom) */}
                <div className="bg-slate-100 px-6 py-4 border-b border-slate-200">
                  <h3 className="text-xl font-bold text-slate-800">{faculty.name}</h3>
                  {/* Si elle a une description, on l'affiche */}
                  {faculty.description && <p className="text-sm text-slate-600 mt-1">{faculty.description}</p>}
                </div>
                
                {/* Bloc contenant les filières (Programmes) */}
                <div className="p-6">
                  
                  {/* Vérification : si la faculté a des programmes */}
                  {faculty.programs && faculty.programs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* On boucle sur chaque programme pour l'afficher */}
                      {faculty.programs.map(program => (
                        <div key={program.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow transition-shadow">
                          
                          {/* Nom du programme (ex: Génie Logiciel) */}
                          <h4 className="text-lg font-semibold text-primary-700">{program.name}</h4>
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-md">
                            Niveau : {program.level || 'Non spécifié'}
                          </span>
                          
                          {/* Bloc contenant les métiers associés à ce programme */}
                          <div className="mt-4 pt-3 border-t border-slate-100">
                            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Débouchés / Métiers</h5>
                            
                            {/* Vérification : si des métiers sont renseignés */}
                            {program.jobs && program.jobs.length > 0 ? (
                              <ul className="flex flex-wrap gap-2">
                                {/* Boucle sur chaque métier pour l'afficher sous forme de "pilule" (badge) */}
                                {program.jobs.map(job => (
                                  <li key={job.id} className="px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                                    {job.name}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              // Message si aucun métier
                              <p className="text-xs text-slate-400 italic">Aucun métier renseigné.</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Message si aucune filière dans cette faculté
                    <p className="text-sm text-slate-500 italic">Aucune filière renseignée pour cette faculté.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // =======================================
          // AFFICHAGE SI AUCUNE FACULTE N'EXISTE
          // =======================================
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <Building className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-lg font-medium text-slate-900">Aucune formation disponible</h3>
            <p className="mt-2 text-sm text-slate-500">
              Les facultés et filières de cette université n'ont pas encore été renseignées.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Export du composant pour qu'il soit utilisable dans App.jsx
export default FicheUniversite;
