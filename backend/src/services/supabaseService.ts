import { createClient } from '@supabase/supabase-js';
import config from '../config/config';

const supabase = createClient(
  config.supabase.url,
  config.supabase.key
);

export const uploadFile = async (
  bucketName: string,
  filePath: string,
  fileData: Buffer,
  fileType: string
) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileData, {
        contentType: fileType,
        upsert: true
      });

    if (error) {
      throw error;
    }

    return {
      path: data.path,
      fullPath: `${config.supabase.url}/storage/v1/object/public/${bucketName}/${data.path}`
    };
  } catch (error) {
    console.error('Error uploading file to Supabase:', error);
    throw error;
  }
};

export const getFileUrl = async (bucketName: string, filePath: string) => {
  try {
    const { data } = await supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('Error getting file URL from Supabase:', error);
    throw error;
  }
};

export const deleteFile = async (bucketName: string, filePath: string) => {
  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting file from Supabase:', error);
    throw error;
  }
};

export default {
  uploadFile,
  getFileUrl,
  deleteFile,
  client: supabase
}; 