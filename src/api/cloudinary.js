import axios from 'axios';

// La configuration dépendra de votre compte Cloudinary
// Ajoutez VITE_CLOUDINARY_CLOUD_NAME et VITE_CLOUDINARY_UPLOAD_PRESET dans votre .env
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'demo';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'unsigned_preset';

/**
 * Upload une image sur Cloudinary
 * @param {File} file - Le fichier image à uploader
 * @returns {Promise<string>} L'URL sécurisée de l'image sur Cloudinary
 */
export const uploadImageToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  try {
    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      formData
    );
    return response.data.secure_url;
  } catch (error) {
    console.error("Erreur lors de l'upload sur Cloudinary", error);
    throw error;
  }
};
