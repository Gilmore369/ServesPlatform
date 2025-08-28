'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useMobileOptimizations } from '../../hooks/useMobileOptimizations';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { Evidence, Activity } from '../../lib/types';
import { JWTManager } from '../../lib/jwt';

interface MobileEvidenceUploadProps {
  activityId: string;
  onSuccess?: (evidence: Evidence | string) => void;
  onCancel?: () => void;
}

interface EvidenceForm {
  tipo: 'foto' | 'documento' | 'video' | 'otro';
  titulo: string;
  descripcion: string;
  file: File | null;
}

export function MobileEvidenceUpload({ 
  activityId, 
  onSuccess, 
  onCancel 
}: MobileEvidenceUploadProps) {
  const { isMobile, isTouch, addTouchFeedback } = useMobileOptimizations();
  const { 
    storeEvidenceOffline, 
    getCachedData, 
    isOnline, 
    syncStatus,
    isOfflineCapable 
  } = useOfflineSync();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [form, setForm] = useState<EvidenceForm>({
    tipo: 'foto',
    titulo: '',
    descripcion: '',
    file: null
  });

  const [activity, setActivity] = useState<Activity | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Camera/file capture states
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Load activity data
  useEffect(() => {
    const loadActivity = async () => {
      try {
        const cachedData = await getCachedData();
        const foundActivity = cachedData.activities.find(a => a.id === activityId);
        setActivity(foundActivity || null);
      } catch (error) {
        console.error('Failed to load activity data:', error);
      }
    };

    loadActivity();
  }, [activityId, getCachedData]);

  // Add touch feedback to interactive elements
  useEffect(() => {
    if (isTouch) {
      const buttons = document.querySelectorAll('.mobile-evidence-upload button');
      const cleanupFunctions: (() => void)[] = [];

      buttons.forEach(button => {
        const cleanup = addTouchFeedback(button as HTMLElement);
        if (cleanup) cleanupFunctions.push(cleanup);
      });

      return () => {
        cleanupFunctions.forEach(cleanup => cleanup());
      };
    }
  }, [isTouch, addTouchFeedback]);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const handleInputChange = (field: keyof EvidenceForm, value: string | File | null) => {
    setForm(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      setStream(mediaStream);
      setShowCamera(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Failed to start camera:', error);
      setErrors({ camera: 'No se pudo acceder a la cámara' });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob and create file
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `evidence_${Date.now()}.jpg`, { type: 'image/jpeg' });
        handleInputChange('file', file);
        
        // Create preview URL
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImage(imageUrl);
        
        // Auto-generate title if empty
        if (!form.titulo) {
          setForm(prev => ({ 
            ...prev, 
            titulo: `Evidencia ${activity?.codigo || activityId} - ${new Date().toLocaleDateString()}`
          }));
        }
      }
    }, 'image/jpeg', 0.8);

    stopCamera();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleInputChange('file', file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const imageUrl = URL.createObjectURL(file);
        setCapturedImage(imageUrl);
      }
      
      // Auto-generate title if empty
      if (!form.titulo) {
        const fileType = file.type.startsWith('image/') ? 'Foto' : 
                        file.type.startsWith('video/') ? 'Video' : 'Documento';
        setForm(prev => ({ 
          ...prev, 
          titulo: `${fileType} ${activity?.codigo || activityId} - ${new Date().toLocaleDateString()}`
        }));
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.titulo.trim()) {
      newErrors.titulo = 'Ingresa un título para la evidencia';
    }

    if (!form.file) {
      newErrors.file = 'Selecciona o captura un archivo';
    } else {
      // Check file size (max 10MB for mobile)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (form.file.size > maxSize) {
        newErrors.file = 'El archivo es muy grande (máximo 10MB)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const user = JWTManager.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Convert file to base64 for offline storage
      let fileData: string | undefined;
      let fileUrl = '';

      if (form.file) {
        if (!isOnline) {
          // Store file data as base64 for offline sync
          fileData = await convertFileToBase64(form.file);
          fileUrl = `offline://${form.file.name}`;
        } else {
          // In a real implementation, you would upload the file to cloud storage here
          // For now, we'll simulate this with a placeholder URL
          fileUrl = `https://storage.example.com/evidence/${Date.now()}_${form.file.name}`;
        }
      }

      const evidenceData = {
        actividad_id: activityId,
        tipo: form.tipo,
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim() || undefined,
        url: fileUrl,
        usuario_id: user.id
      };

      let result: string | Evidence;

      if (isOnline) {
        // Try to submit directly to API
        try {
          // This would be implemented with the actual API call including file upload
          // For now, we'll store offline and sync immediately
          result = await storeEvidenceOffline(evidenceData, fileData);
        } catch (error) {
          // If online submission fails, store offline
          console.warn('Online submission failed, storing offline:', error);
          result = await storeEvidenceOffline(evidenceData, fileData);
        }
      } else {
        // Store offline when not connected
        result = await storeEvidenceOffline(evidenceData, fileData);
      }

      // Show success message
      setShowSuccess(true);
      
      // Reset form
      setForm({
        tipo: 'foto',
        titulo: '',
        descripcion: '',
        file: null
      });
      setCapturedImage(null);

      // Call success callback
      if (onSuccess) {
        onSuccess(result);
      }

      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);

    } catch (error) {
      console.error('Failed to submit evidence:', error);
      setErrors({
        submit: error instanceof Error ? error.message : 'Error al guardar la evidencia'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`mobile-evidence-upload ${isMobile ? 'mobile-optimized' : ''}`}>
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Subir Evidencia
          </h2>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700 p-2 -mr-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {/* Activity Info */}
        {activity && (
          <div className="mt-2 text-sm text-gray-600">
            {activity.codigo} - {activity.nombre}
          </div>
        )}
        
        {/* Connection Status */}
        <div className="flex items-center mt-2 text-sm">
          <div className={`w-2 h-2 rounded-full mr-2 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
            {isOnline ? 'En línea' : 'Sin conexión'}
          </span>
          {syncStatus.pendingItems > 0 && (
            <span className="ml-2 text-orange-600">
              ({syncStatus.pendingItems} pendientes)
            </span>
          )}
        </div>
      </div>

      {/* Camera View */}
      {showCamera && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="flex-1 relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            
            {/* Camera Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/50 to-transparent">
              <div className="flex items-center justify-center space-x-8">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="w-16 h-16 bg-white rounded-full flex items-center justify-center"
                >
                  <div className="w-12 h-12 bg-gray-300 rounded-full" />
                </button>
                
                <div className="w-12 h-12" /> {/* Spacer */}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {showSuccess && (
        <div className="mx-4 mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Evidencia guardada {!isOnline && 'offline '}exitosamente
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* File Capture Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Archivo *
          </label>
          
          {/* Capture Options */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              type="button"
              onClick={startCamera}
              className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors"
            >
              <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm text-gray-600">Tomar Foto</span>
            </button>
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors"
            >
              <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-sm text-gray-600">Seleccionar</span>
            </button>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,.pdf,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* File Preview */}
          {capturedImage && (
            <div className="mt-4">
              <img
                src={capturedImage}
                alt="Preview"
                className="w-full h-48 object-cover rounded-lg border"
              />
            </div>
          )}

          {form.file && !capturedImage && (
            <div className="mt-4 p-3 bg-gray-100 rounded-lg">
              <div className="flex items-center">
                <svg className="w-8 h-8 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-900">{form.file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(form.file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
            </div>
          )}

          {errors.file && (
            <p className="mt-1 text-sm text-red-600">{errors.file}</p>
          )}
        </div>

        {/* Evidence Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Evidencia
          </label>
          <select
            value={form.tipo}
            onChange={(e) => handleInputChange('tipo', e.target.value as any)}
            className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              isMobile ? 'text-base' : 'text-sm'
            }`}
            disabled={isSubmitting}
          >
            <option value="foto">Fotografía</option>
            <option value="documento">Documento</option>
            <option value="video">Video</option>
            <option value="otro">Otro</option>
          </select>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Título *
          </label>
          <input
            type="text"
            value={form.titulo}
            onChange={(e) => handleInputChange('titulo', e.target.value)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.titulo ? 'border-red-500' : 'border-gray-300'
            } ${isMobile ? 'text-base' : 'text-sm'}`}
            disabled={isSubmitting}
            placeholder="Título descriptivo de la evidencia"
          />
          {errors.titulo && (
            <p className="mt-1 text-sm text-red-600">{errors.titulo}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descripción
          </label>
          <textarea
            value={form.descripcion}
            onChange={(e) => handleInputChange('descripcion', e.target.value)}
            rows={3}
            className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
              isMobile ? 'text-base' : 'text-sm'
            }`}
            disabled={isSubmitting}
            placeholder="Descripción adicional (opcional)"
          />
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {errors.submit}
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-4 px-6 rounded-lg font-medium transition-colors ${
              isSubmitting
                ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
            } ${isMobile ? 'text-base' : 'text-sm'}`}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Guardando...
              </div>
            ) : (
              `Subir Evidencia ${!isOnline ? '(Offline)' : ''}`
            )}
          </button>
        </div>

        {/* Offline Notice */}
        {!isOnline && isOfflineCapable && (
          <div className="p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded-md text-sm">
            <div className="flex items-start">
              <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium">Modo sin conexión</p>
                <p className="mt-1">La evidencia se guardará localmente y se subirá cuando se restablezca la conexión.</p>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Hidden Canvas for Photo Capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}