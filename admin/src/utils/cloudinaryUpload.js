import toast from 'react-hot-toast';
import adminApi from '../api/axios'; // Use axios for auth headers

/**
 * Signed Cloudinary Upload Utility
 * Gets signature from backend aur securely upload karta hai
 */
export const uploadImageToCloudinary = async (file, folder = 'branding') => {
  if (!file) return null;

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'da0mibgyh';

  try {
    // Step 1: Get FRESH signature from backend (with auth headers via adminApi)
    // This is done RIGHT BEFORE upload to avoid stale request errors (within 1 hour)
    // Note: adminApi already has /admin in baseURL, so just use /settings/...
    console.log('Getting fresh Cloudinary signature...');
    const sigResponse = await adminApi.post('/settings/cloudinary-signature', {
      folder: `lexioai/${folder}`,
    });

    const { signature, timestamp, apiKey } = sigResponse.data;
    console.log('Signature obtained, timestamp:', new Date(timestamp * 1000).toISOString());

    // Step 2: Upload to Cloudinary immediately with fresh signature
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    formData.append('folder', `lexioai/${folder}`);

    console.log('Uploading to Cloudinary...');
    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const uploadData = await uploadResponse.json();

    if (uploadData.error) {
      console.error('Cloudinary upload error:', uploadData.error);
      throw new Error(uploadData.error.message || 'Upload failed');
    }

    console.log('Upload successful:', uploadData.secure_url);
    return uploadData.secure_url;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

/**
 * Delete image from Cloudinary by URL
 * Calls backend endpoint to securely delete from Cloudinary
 */
export const deleteImageFromCloudinary = async (imageUrl) => {
  if (!imageUrl) return null;

  try {
    const response = await adminApi.post('/settings/cloudinary-delete', {
      imageUrl: imageUrl,
    });

    if (response.data.success) {
      return true;
    } else {
      console.warn('Failed to delete image:', response.data);
      return false;
    }
  } catch (error) {
    console.error('Delete image error:', error);
    // Don't throw error - continue even if delete fails
    // The new image will replace the old one anyway
    return false;
  }
};
