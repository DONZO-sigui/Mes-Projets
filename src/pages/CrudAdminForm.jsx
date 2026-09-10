import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { createEntity, updateEntity } from '../api/admin';
import apiClient from '../api/apiClient';
import { uploadImageToCloudinary } from '../api/cloudinary';
import Loading from '../components/Loading';
import ErrorAlert from '../components/ErrorAlert';
import { Save, ChevronLeft, Upload, Image as ImageIcon } from 'lucide-react';

// Champs par entité — alignés exactement sur le schéma SQLite du backend
const ENTITY_CONFIGS = {
  universities: [
    { name: 'name',         label: "Nom de l'université",  type: 'text',     required: true },
    { name: 'acronym',      label: 'Acronyme',              type: 'text' },
    { name: 'status',       label: 'Statut',                type: 'select',   options: ['publique', 'privee'] },
    { name: 'city',         label: 'Ville',                 type: 'text' },
    { name: 'founded_year', label: 'Année de fondation',    type: 'number' },
    { name: 'website',      label: 'Site Web',              type: 'url' },
    { name: 'description',  label: 'Description',           type: 'textarea' },
    { name: 'logo_url',     label: 'Logo (URL ou upload)',  type: 'image' },
  ],
  faculties: [
    { name: 'university_id', label: 'Université parente',  type: 'number', required: true },
    { name: 'name',          label: 'Nom de la faculté',   type: 'text',   required: true },
    { name: 'description',   label: 'Description',         type: 'textarea' },
  ],
  programs: [
    { name: 'faculty_id',           label: 'Faculté parente',         type: 'number', required: true },
    { name: 'name',                 label: 'Nom de la filière',       type: 'text',   required: true },
    { name: 'level',                label: 'Niveau',                  type: 'select', options: ['Licence', 'Master', 'Doctorat'] },
    { name: 'duration_years',       label: 'Durée (années)',          type: 'number' },
    { name: 'description',          label: 'Description',             type: 'textarea' },
    { name: 'admission_conditions', label: "Conditions d'admission",  type: 'textarea' },
  ],
  jobs: [
    { name: 'name',           label: 'Nom du métier',                          type: 'text',     required: true },
    { name: 'sector',         label: "Secteur d'activité",                     type: 'text' },
    { name: 'interest_tags',  label: 'Centres d\'intérêt (séparés par ,)',     type: 'text' },
    { name: 'description',    label: 'Description du métier',                  type: 'textarea' },
    { name: 'required_skills',label: 'Compétences requises',                   type: 'textarea' },
  ],
};

const CrudAdminForm = () => {
  const { entity, id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  // Pour les relations (listes déroulantes)
  const [parentData, setParentData] = useState({
    universities: [],
    faculties: [],
    programs: []
  });

  const fields = ENTITY_CONFIGS[entity] || [];

  useEffect(() => {
    // Charger les listes pour les menus déroulants
    const fetchParents = async () => {
      try {
        if (entity === 'faculties') {
          const res = await apiClient.get('/admin/universities');
          setParentData(prev => ({ ...prev, universities: res.data.items || [] }));
        } else if (entity === 'programs') {
          const res = await apiClient.get('/admin/faculties');
          setParentData(prev => ({ ...prev, faculties: res.data.items || [] }));
        } else if (entity === 'jobs') {
          const res = await apiClient.get('/admin/programs');
          setParentData(prev => ({ ...prev, programs: res.data.items || [] }));
        }
      } catch (e) {
        console.error("Erreur de chargement des parents", e);
      }
    };
    fetchParents();

    if (isEditing) {
      const fetchEntityData = async () => {
        try {
          const response = await apiClient.get(`/admin/${entity}/${id}`);
          setFormData(response.data);
          if (response.data.logo_url) {
            setImagePreview(response.data.logo_url);
          }
        } catch (err) {
          setError("Erreur lors du chargement des données existantes.");
        } finally {
          setLoading(false);
        }
      };
      fetchEntityData();
    } else {
      // Initialiser avec des valeurs par défaut
      const initialData = {};
      fields.forEach(field => {
        initialData[field.name] = field.type === 'select' ? field.options[0] : '';
      });
      setFormData(initialData);
      setLoading(false);
    }
  }, [entity, id, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      let finalData = { ...formData };

      // Si une image a été sélectionnée pour l'upload (Cloudinary)
      if (imageFile) {
        try {
          const imageUrl = await uploadImageToCloudinary(imageFile);
          finalData.logo_url = imageUrl; 
        } catch (uploadErr) {
          console.warn("Upload Cloudinary échoué. Utilisation d'une image par défaut.", uploadErr);
          // Fallback : image par défaut si l'API Cloudinary n'est pas configurée
          finalData.logo_url = "https://via.placeholder.com/150?text=Logo+Uni"; 
        }
      }

      if (isEditing) {
        await updateEntity(entity, id, finalData);
      } else {
        await createEntity(entity, finalData);
      }
      
      navigate(`/admin/crud/${entity}`);
    } catch (err) {
      setError(`Erreur lors de la ${isEditing ? 'modification' : 'création'}. Veuillez réessayer.`);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const getEntityTitle = () => {
    switch(entity) {
      case 'universities': return 'Université';
      case 'faculties': return 'Faculté';
      case 'programs': return 'Filière';
      case 'jobs': return 'Métier';
      default: return entity;
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center text-sm">
        <Link to={`/admin/crud/${entity}`} className="text-slate-500 hover:text-slate-700 flex items-center">
          <ChevronLeft className="w-4 h-4 mr-1" /> Retour à la liste
        </Link>
      </div>

      <div className="pb-5 border-b border-slate-200">
        <h2 className="text-2xl font-bold leading-7 text-slate-900 sm:text-3xl sm:truncate">
          {isEditing ? 'Modifier' : 'Ajouter'} une {getEntityTitle().toLowerCase()}
        </h2>
      </div>

      {error && <ErrorAlert message={error} />}

      <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg border border-slate-200 p-6 space-y-6">
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
          {fields.map((field) => {
            if (field.type === 'textarea') {
              return (
                <div key={field.name} className="sm:col-span-2">
                  <label htmlFor={field.name} className="block text-sm font-medium text-slate-700">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <div className="mt-1">
                    <textarea
                      id={field.name}
                      name={field.name}
                      rows={4}
                      className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-slate-300 rounded-md border p-2"
                      value={formData[field.name] || ''}
                      onChange={handleChange}
                      required={field.required}
                    />
                  </div>
                </div>
              );
            }

            if (field.type === 'select') {
              return (
                <div key={field.name} className="sm:col-span-1">
                  <label htmlFor={field.name} className="block text-sm font-medium text-slate-700">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <div className="mt-1">
                    <select
                      id={field.name}
                      name={field.name}
                      className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-slate-300 rounded-md border p-2"
                      value={formData[field.name] || ''}
                      onChange={handleChange}
                      required={field.required}
                    >
                      {field.options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            }

            if (field.type === 'image') {
              return (
                <div key={field.name} className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">
                    {field.label} (Upload vers Cloudinary)
                  </label>
                  <div className="mt-1 flex items-center space-x-5">
                    <div className="h-24 w-24 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden bg-slate-50">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Aperçu" className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-slate-400" />
                      )}
                    </div>
                    <label className="cursor-pointer bg-white py-2 px-3 border border-slate-300 rounded-md shadow-sm text-sm leading-4 font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 flex items-center">
                      <Upload className="w-4 h-4 mr-2" /> Changer l'image
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                    </label>
                  </div>
                </div>
              );
            }

            if (field.name.endsWith('_id')) {
              // Déterminer la liste des options selon le champ
              let options = [];
              if (field.name === 'university_id') options = parentData.universities || [];
              if (field.name === 'faculty_id') options = parentData.faculties || [];
              if (field.name === 'program_id') options = parentData.programs || [];

              return (
                <div key={field.name} className="sm:col-span-1">
                  <label htmlFor={field.name} className="block text-sm font-medium text-slate-700">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <div className="mt-1">
                    <select
                      id={field.name}
                      name={field.name}
                      className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-slate-300 rounded-md border p-2"
                      value={formData[field.name] || ''}
                      onChange={handleChange}
                      required={field.required}
                    >
                      <option value="">Sélectionner...</option>
                      {options.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            }

            return (
              <div key={field.name} className="sm:col-span-1">
                <label htmlFor={field.name} className="block text-sm font-medium text-slate-700">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                <div className="mt-1">
                  <input
                    type={field.type}
                    id={field.name}
                    name={field.name}
                    className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-slate-300 rounded-md border p-2"
                    value={formData[field.name] || ''}
                    onChange={handleChange}
                    required={field.required}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-5 border-t border-slate-200 flex justify-end">
          <Link
            to={`/admin/crud/${entity}`}
            className="bg-white py-2 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 mr-3"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-400"
          >
            {saving ? (
              "Enregistrement..."
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Enregistrer</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CrudAdminForm;
