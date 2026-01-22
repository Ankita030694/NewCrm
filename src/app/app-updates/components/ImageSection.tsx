'use client'; 

import React, { useState, useEffect } from 'react';
import { db, storage } from '@/firebase/ama_app'; // Use the secondary app instance
import { doc, updateDoc, arrayUnion, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { toast } from 'react-toastify';
import { FaTrash, FaUpload, FaSpinner, FaImage, FaSave, FaGripVertical } from 'react-icons/fa';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ImageSectionProps {
  sectionName: string; // 'home', 'ama', 'services', 'casedesk'
  title: string;
}

interface ImageItem {
  id: string; // Unique identifier for the image
  url: string;
  priority: number; 
}

// --- Sortable Image Component ---
const SortableImageItem = ({ 
    img, 
    index, 
    handleDelete 
}: { 
    img: ImageItem, 
    index: number, 
    handleDelete: (item: ImageItem) => void 
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: img.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            className="group relative bg-gray-50 rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col"
        >
            <div className="aspect-video relative overflow-hidden bg-gray-200">
                <img 
                    src={img.url} 
                    alt={`Image ${index + 1}`} 
                    className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 flex gap-2 z-20">
                     <button
                        onClick={() => handleDelete(img)}
                        className="p-1.5 bg-red-600/90 text-white rounded shadow-sm hover:bg-red-700 transition"
                        title="Remove Image"
                        onPointerDown={(e) => e.stopPropagation()} // Prevent drag start
                    >
                        <FaTrash size={12} />
                    </button>
                </div>
                
                {/* Drag Handle Overlay */}
                <div 
                    {...attributes} 
                    {...listeners}
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing bg-black/30"
                >
                     <FaGripVertical className="text-white text-3xl drop-shadow-md" />
                </div>
            </div>
            <div className="p-2 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500 bg-white">
                <span>Priority: {index + 1}</span>
                <span className="cursor-grab active:cursor-grabbing" {...listeners} {...attributes}>
                    Drag to reorder
                </span>
            </div>
        </div>
    );
};


const ImageSection: React.FC<ImageSectionProps> = ({ sectionName, title }) => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: {
            distance: 8, // Require 8px movement to start drag (prevents accidental drags)
        }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const docRef = doc(db, 'images', sectionName);
    
    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        let fetchedImages: ImageItem[] = [];

        // Handle backward compatibility
        if (Array.isArray(data.urls)) {
            fetchedImages = data.urls.map((item: any) => {
                if (typeof item === 'string') {
                    return {
                        id: item, 
                        url: item,
                        priority: 999 
                    };
                }
                return item as ImageItem;
            });
        }
        
        // Sort by priority on initial fetch
        fetchedImages.sort((a, b) => a.priority - b.priority);
        setImages(fetchedImages);
      } else {
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
      const timestamp = Date.now();
      const storagePath = `${sectionName}/${timestamp}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      const newImage: ImageItem = {
          id: storagePath,
          url: downloadURL,
          priority: images.length + 1
      };

      const docRef = doc(db, 'images', sectionName);
      await updateDoc(docRef, {
        urls: arrayUnion(newImage)
      });

      toast.success('Image uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };
  
  const handleDelete = async (item: ImageItem) => {
    if (!confirm('Are you sure you want to remove this image?')) return;
    try {
      try {
        const storageRef = ref(storage, item.url);
        await deleteObject(storageRef);
      } catch (storageError: any) {
        console.warn('Storage delete error:', storageError);
        if (storageError.code !== 'storage/object-not-found') {
           toast.warn('Could not delete file from storage, but removing from list.');
        }
      }

      const docRef = doc(db, 'images', sectionName);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
          const currentData = docSnap.data();
          const currentList = currentData.urls || [];
          const updatedList = currentList.filter((i: any) => {
              if (typeof i === 'string') return i !== item.url;
              return i.url !== item.url;
          });
          
          await updateDoc(docRef, { urls: updatedList });
      }
      toast.success('Image permanently deleted');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to remove image');
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setImages((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        
        // Create new array with correct order
        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        // Update priorities based on new index
        return newOrder.map((item, idx) => ({
            ...item,
            priority: idx + 1
        }));
      });
    }
  };

  const saveOrder = async () => {
      setSavingOrder(true);
      try {
          const docRef = doc(db, 'images', sectionName);
          await updateDoc(docRef, {
              urls: images
          });
          toast.success('Order saved successfully!');
      } catch (error) {
          console.error("Error saving order:", error);
          toast.error("Failed to save order");
      } finally {
          setSavingOrder(false);
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
        
        <div className="flex gap-2">
            {images.length > 0 && (
                <button
                    onClick={saveOrder}
                    disabled={savingOrder}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors shadow-sm font-medium text-sm disabled:opacity-70"
                >
                    {savingOrder ? <FaSpinner className="animate-spin" /> : <FaSave />}
                    Save Order
                </button>
            )}
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
        <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext 
                items={images.map(i => i.id)}
                strategy={rectSortingStrategy}
            >
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {images.map((img, index) => (
                        <SortableImageItem 
                            key={img.id} 
                            img={img} 
                            index={index}
                            handleDelete={handleDelete}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
      )}
    </div>
  );
};

export default ImageSection;
