import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MessageCircle, X, Minimize2, Maximize2 } from 'lucide-react';
import SmartQueryChat from './SmartQuery/SmartQueryChat';

const FloatingSmartAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ y: window.innerHeight - 120 }); // 120px from bottom (6*4 + 14*4 + some margin)
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const dragRef = useRef<HTMLButtonElement>(null);
  const dragStart = useRef<{ y: number; startY: number; initialY: number }>({ y: 0, startY: 0, initialY: 0 });

  // Handle drag start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setHasDragged(false);
    dragStart.current = {
      y: e.clientY,
      startY: position.y,
      initialY: e.clientY
    };
  }, [position.y]);

  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setHasDragged(false);
    const touch = e.touches[0];
    dragStart.current = {
      y: touch.clientY,
      startY: position.y,
      initialY: touch.clientY
    };
  }, [position.y]);

  // Handle drag move
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaY = e.clientY - dragStart.current.y;
    const newY = dragStart.current.startY + deltaY;
    
    // Check if user has actually dragged (moved more than 5px)
    const totalDelta = Math.abs(e.clientY - dragStart.current.initialY);
    if (totalDelta > 5) {
      setHasDragged(true);
    }
    
    // Constrain to screen bounds (with some padding)
    const buttonHeight = 56; // 14 * 4 (h-14)
    const padding = 24; // 6 * 4 (bottom-6)
    const minY = padding;
    const maxY = window.innerHeight - buttonHeight - padding;
    
    const constrainedY = Math.max(minY, Math.min(maxY, newY));
    setPosition({ y: constrainedY });
  }, [isDragging]);

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    const deltaY = touch.clientY - dragStart.current.y;
    const newY = dragStart.current.startY + deltaY;
    
    // Check if user has actually dragged (moved more than 5px)
    const totalDelta = Math.abs(touch.clientY - dragStart.current.initialY);
    if (totalDelta > 5) {
      setHasDragged(true);
    }
    
    // Constrain to screen bounds (with some padding)
    const buttonHeight = 56; // 14 * 4 (h-14)
    const padding = 24; // 6 * 4 (bottom-6)
    const minY = padding;
    const maxY = window.innerHeight - buttonHeight - padding;
    
    const constrainedY = Math.max(minY, Math.min(maxY, newY));
    setPosition({ y: constrainedY });
  }, [isDragging]);

  // Handle drag end
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add event listeners for drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Update position on window resize
  useEffect(() => {
    const handleResize = () => {
      const buttonHeight = 56;
      const padding = 24;
      const maxY = window.innerHeight - buttonHeight - padding;
      
      setPosition(prev => ({
        y: Math.min(prev.y, maxY)
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleAssistant = () => {
    if (isOpen) {
      setIsOpen(false);
      setIsMinimized(false);
    } else {
      setIsOpen(true);
      setIsMinimized(false);
    }
  };

  // Handle button click - only open if user hasn't dragged
  const handleButtonClick = useCallback(() => {
    if (!hasDragged) {
      if (isOpen) {
        setIsOpen(false);
        setIsMinimized(false);
      } else {
        setIsOpen(true);
        setIsMinimized(false);
      }
    }
  }, [hasDragged, isOpen]);

  const minimizeAssistant = () => {
    setIsMinimized(true);
  };

  const restoreAssistant = () => {
    setIsMinimized(false);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          ref={dragRef}
          onClick={handleButtonClick}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className={`fixed right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all duration-300 ease-in-out transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 z-50 ${
            isDragging ? 'cursor-grabbing scale-110' : 'cursor-grab'
          }`}
          style={{ 
            top: `${position.y}px`,
            userSelect: 'none',
            touchAction: 'none'
          }}
          title="Drag to move • Click to open Smart Assistant"
        >
          <div className="relative">
            <MessageCircle className="h-6 w-6 mx-auto" />
            {/* Drag indicator */}
            {/* <div className="absolute -left-1 top-1/2 transform -translate-y-1/2">
              <GripVertical className="h-3 w-3 text-blue-200 opacity-60" />
            </div> */}
          </div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed right-6 z-50 transition-all duration-300 ease-in-out ${
          isMinimized ? 'w-80 h-16' : 'w-96 h-[600px] max-h-[80vh]'
        } max-w-[calc(100vw-2rem)] md:max-w-96`}
        style={{ 
          top: `${Math.max(20, Math.min(position.y, window.innerHeight - (isMinimized ? 64 : 600) - 20))}px`
        }}>
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden h-full flex flex-col">
            {/* Header */}
            <div className="bg-blue-600 text-white p-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5" />
                <h3 className="font-semibold text-sm">Smart Assistant</h3>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={isMinimized ? restoreAssistant : minimizeAssistant}
                  className="p-1 hover:bg-blue-700 rounded transition-colors"
                  title={isMinimized ? 'Restore' : 'Minimize'}
                >{isMinimized?  (<Maximize2 className="h-4 w-4" />
                  ) : (
                    <Minimize2 className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={toggleAssistant}
                  className="p-1 hover:bg-blue-700 rounded transition-colors"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Chat Content */}
            {!isMinimized && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <SmartQueryChat />
              </div>
            )}

            {/* Minimized State */}
            {isMinimized && (
              <div 
                className="flex-1 flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={restoreAssistant}
              >
                {/* <span className="text-gray-600 text-sm">Click to expand chat</span> */}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Backdrop for mobile */}
      {isOpen && !isMinimized && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-20 z-40 lg:hidden"
          onClick={toggleAssistant}
        />
      )}
    </>
  );
};

export default FloatingSmartAssistant;
