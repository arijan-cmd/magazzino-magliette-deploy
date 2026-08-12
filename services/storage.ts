import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export async function uploadProductImages(productId: string, files: File[]): Promise<string[]> {
  const uploads = files.map(async (file) => {
    const path = `products/${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  });
  return Promise.all(uploads);
}

export async function deleteProductImage(url: string): Promise<void> {
  await deleteObject(ref(storage, url));
}
