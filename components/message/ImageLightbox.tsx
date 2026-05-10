'use client'

import { Button } from '@/components/ui/button'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ImageLightboxProps {
  images: string[]
  initialIndex: number
  onClose: () => void
}

export default function ImageLightbox({ images, initialIndex, onClose }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') handleNext()
      if (e.key === 'ArrowLeft') handlePrev()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (images.length === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      >
        <button
          className="absolute top-4 right-4 z-110 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          onClick={onClose}
        >
          <X className="w-6 h-6" />
        </button>

        {images.length > 1 && (
          <>
            <button
              className="absolute left-4 z-110 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              onClick={handlePrev}
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              className="absolute right-4 z-110 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              onClick={handleNext}
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </>
        )}

        <div className="relative w-full h-full flex items-center justify-center p-4">
          <motion.img
            key={images[currentIndex]}
            src={images[currentIndex]}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="max-w-full max-h-full object-contain shadow-2xl rounded-sm"
            onClick={(e) => e.stopPropagation()}
            alt={`Image ${currentIndex + 1}`}
          />
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md">
          {currentIndex + 1} / {images.length}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
