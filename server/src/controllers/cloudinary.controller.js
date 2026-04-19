const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;
const { getCloudinaryIntegrationConfig } = require('../utils/platformSettings.utils');

exports.getUploadSignature = async (req, res) => {
  try {
    const cloudinaryConfig = await getCloudinaryIntegrationConfig();
    const cloudinaryApiSecret = cloudinaryConfig.apiSecret;
    const cloudinaryApiKey = cloudinaryConfig.apiKey;
    const cloudName = cloudinaryConfig.cloudName;
    
    // Accept folder from request body or use default
    const folder = req.body?.folder || 'lexioai';

    if (!cloudinaryApiSecret || !cloudinaryApiKey || !cloudName) {
      return res.status(400).json({
        error: 'Cloudinary credentials not configured on server',
      });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    
    // Only include parameters that will actually be sent to Cloudinary
    const params = {
      folder,
      timestamp,
    };

    // Create signature - params must be sorted by key alphabetically
    const paramsStr = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join('&');

    const signature = crypto
      .createHash('sha1')
      .update(paramsStr + cloudinaryApiSecret)
      .digest('hex');

    res.json({
      signature,
      timestamp,
      apiKey: cloudinaryApiKey,
      cloudName,
    });
  } catch (error) {
    console.error('Signature generation error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete image from Cloudinary by URL
 * Extracts public_id from URL and destroys the resource
 */
exports.deleteImageFromCloudinary = async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    const cloudinaryConfig = await getCloudinaryIntegrationConfig();
    
    if (!cloudinaryConfig.apiSecret || !cloudinaryConfig.apiKey || !cloudinaryConfig.cloudName) {
      return res.status(400).json({
        error: 'Cloudinary credentials not configured on server',
      });
    }

    // Configure cloudinary with credentials
    cloudinary.config({
      cloud_name: cloudinaryConfig.cloudName,
      api_key: cloudinaryConfig.apiKey,
      api_secret: cloudinaryConfig.apiSecret,
    });

    // Extract public_id from Cloudinary URL
    // URL format: https://res.cloudinary.com/{cloudName}/image/upload/v{version}/{publicId}.{format}
    const cloudName = cloudinaryConfig.cloudName;
    const urlParts = imageUrl.split(`/${cloudName}/image/upload/`);
    
    if (urlParts.length !== 2) {
      return res.status(400).json({ error: 'Invalid Cloudinary URL format' });
    }

    // Extract public_id (everything after /upload/ and before file extension)
    const pathWithVersion = urlParts[1];
    const publicIdWithExtension = pathWithVersion.split('/').slice(1).join('/'); // Remove version number
    const publicId = publicIdWithExtension.replace(/\.[^.]+$/, ''); // Remove file extension

    if (!publicId) {
      return res.status(400).json({ error: 'Could not extract public_id from URL' });
    }

    console.log('Deleting Cloudinary image:', publicId);

    // Delete from Cloudinary using SDK
    const deleteResult = await cloudinary.uploader.destroy(publicId);

    if (deleteResult.error) {
      // Don't throw error if image is already deleted
      if (deleteResult.error?.message?.includes('not found')) {
        return res.json({ 
          success: true, 
          message: 'Image already deleted or not found',
          deleted: [] 
        });
      }
      throw new Error(deleteResult.error.message || 'Failed to delete from Cloudinary');
    }

    console.log('Successfully deleted:', publicId, deleteResult);

    res.json({
      success: true,
      message: 'Image deleted successfully',
      deleted: [publicId],
    });
  } catch (error) {
    console.error('Delete image error:', error);
    // Don't fail the request - log the error but continue
    // The new image will replace the old one anyway
    res.json({
      success: true,
      message: 'Delete skipped - continuing with upload',
      error: error.message,
    });
  }
};
