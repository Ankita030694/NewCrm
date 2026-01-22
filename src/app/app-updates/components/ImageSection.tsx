'use client';

import React, { useState, useEffect } from 'react';
import { db, storage } from '@/firebase/ama_app'; // Use the secondary app instance
import { doc, updateDoc, arrayUnion, setDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { toast } from 'react-toastify';
import { FaTrash, FaUpload, FaSpinner, FaImage } from 'react-icons/fa';

interface ImageSectionProps {
  sectionName: string; // 'home', 'ama', 'services', 'casedesk'
  title: string;
}

const ImageSection: React.FC<ImageSectionProps> = ({ sectionName, title }) => {
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch images for this section
  useEffect(() => {
    const docRef = doc(db, 'images', sectionName);
    
    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setImages(data.urls || []);
      } else {
        // Create the document if it doesn't exist
        setDoc(docRef, { urls: [] });
        setImages([]);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching images:", error);
      toast.error(`Error loading ${title} images`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [sectionName, title]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // 1. Upload to Storage
      const timestamp = Date.now();
      const storagePath = `${sectionName}/${timestamp}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // 2. Save URL to Firestore
      const docRef = doc(db, 'images', sectionName);
      await updateDoc(docRef, {
        urls: arrayUnion(downloadURL)
      });

      toast.success('Image uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image.');
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };
  
  const handleDelete = async (url: string) => {
    if (!confirm('Are you sure you want to remove this image?')) return;
    
    try {
      // 1. Delete from Storage
      // Create a reference from the HTTPS URL
      // Note: ref(storage, url) works for download URLs
      try {
        const storageRef = ref(storage, url);
        await deleteObject(storageRef);
      } catch (storageError: any) {
        console.warn('Storage delete error (might already be deleted):', storageError);
        // We continue to delete from Firestore even if storage delete fails (e.g. 404)
        if (storageError.code !== 'storage/object-not-found') {
           // If it's a permission error or something else, we might want to warn user, 
           // but seeing as this is an admin tool, clearing the db entry is often desired anyway.
           toast.warn('Could not delete file from storage, but removing from list.');
        }
      }

      // 2. Remove from Firestore
      const docRef = doc(db, 'images', sectionName);
      const { arrayRemove } = await import('firebase/firestore');
      
      await updateDoc(docRef, {
        urls: arrayRemove(url)
      });
      
      toast.success('Image permanently deleted');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to remove image');
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
            <h2 className="text-xl font-bold text-gray-900 capitalize flex items-center gap-2">
                <FaImage className="text-gray-500" />
                {title}
            </h2>
            <p className="text-gray-500 text-sm mt-1">Manage assets for the {title} app section</p>
        </div>
        
        <div className="relative">
            <input
                type="file"
                id={`file-upload-${sectionName}`}
                className="hidden"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
            />
            <label 
                htmlFor={`file-upload-${sectionName}`}
                className={`flex items-center gap-2 px-4 py-2 bg-[#D2A02A] hover:bg-[#b88b25] text-white rounded-md cursor-pointer transition-colors shadow-sm font-medium text-sm ${uploading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
                {uploading ? <FaSpinner className="animate-spin" /> : <FaUpload />}
                {uploading ? 'Uploading...' : 'Upload Image'}
            </label>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
            <FaSpinner className="animate-spin text-3xl text-[#D2A02A]" />
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300 flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <FaImage className="text-gray-400 text-xl" />
            </div>
            <p className="text-gray-500 font-medium">No images uploaded yet</p>
            <p className="text-gray-400 text-sm mt-1">Upload an image to populate this section</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((url, index) => (
                <div key={index} className="group relative aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200 hover:shadow-md transition-shadow">
                    <img 
                        src={url} 
                        alt={`${title} ${index + 1}`} 
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                            onClick={() => handleDelete(url)}
                            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition-transform hover:scale-105 shadow-sm"
                            title="Remove Image"
                        >
                            <FaTrash />
                        </button>
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default ImageSection;
