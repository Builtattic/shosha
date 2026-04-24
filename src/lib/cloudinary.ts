import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export function createSignedUpload(type: 'image' | 'video') {
  const timestamp = Math.round(Date.now() / 1000);
  const folder = `shosha/${type}`;
  const resourceType = type === 'video' ? 'video' : 'image';
  const eager = type === 'image' ? 'q_auto,f_auto' : 'q_auto';
  const transformation = type === 'image' ? 'fl_strip_profile' : undefined;
  const paramsToSign = {
    folder,
    timestamp,
    ...(transformation ? { transformation } : {}),
    ...(eager ? { eager } : {})
  };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET ?? '');

  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    timestamp,
    folder,
    resourceType,
    eager,
    transformation,
    signature
  };
}
