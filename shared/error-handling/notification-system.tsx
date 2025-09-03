// 사용자 알림 시스템 (토스트, 모달)

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AppError, ErrorSeverity, ErrorRecoveryAction } from './types'

export interface NotificationConfig {
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
  duration: number
  maxNotifications: number
  enableSound: boolean
  enableAnimation: boolean
}

export interface ToastNotification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
  recoveryActions?: ErrorRecoveryAction[]
  dismissible?: boolean
  persistent?: boolean
  createdAt: number
}

export interface ModalNotification {
  id: string
  type: 'error' | 'warning' | 'confirm'
  title: string
  message: string
  recoveryActions: ErrorRecoveryAction[]
  onClose: () => void
  persistent?: boolean
}

interface NotificationContextType {
  // Toast 관리
  toasts: ToastNotification[]
  showToast: (toast: Omit<ToastNotification, 'id' | 'createdAt'>) => string
  dismissToast: (id: string) => void
  dismissAllToasts: () => void
  
  // Modal 관리
  modal: ModalNotification | null
  showModal: (modal: Omit<ModalNotification, 'id'>) => void
  dismissModal: () => void
  
  // 에러 알림
  notifyError: (error: AppError, recoveryActions?: ErrorRecoveryAction[]) => void
  notifySuccess: (message: string, title?: string) => void
  notifyWarning: (message: string, title?: string) => void
  notifyInfo: (message: string, title?: string) => void
  
  // 설정
  config: NotificationConfig
  updateConfig: (config: Partial<NotificationConfig>) => void
}

const defaultConfig: NotificationConfig = {
  position: 'top-right',
  duration: 5000,
  maxNotifications: 5,
  enableSound: false,
  enableAnimation: true
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const useNotification = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}

interface NotificationProviderProps {
  children: React.ReactNode
  config?: Partial<NotificationConfig>
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  config: configOverrides = {}
}) => {
  const [toasts, setToasts] = useState<ToastNotification[]>([])
  const [modal, setModal] = useState<ModalNotification | null>(null)
  const [config, setConfig] = useState<NotificationConfig>({
    ...defaultConfig,
    ...configOverrides
  })

  const generateId = useCallback(() => {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }, [])

  const playNotificationSound = useCallback((type: 'success' | 'error' | 'warning' | 'info') => {
    if (!config.enableSound || typeof window === 'undefined') return

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      const frequencies = {
        success: [523.25, 659.25], // C5, E5
        error: [220, 146.83], // A3, D3
        warning: [440, 523.25], // A4, C5
        info: [329.63, 415.30] // E4, G#4
      }

      const [freq1, freq2] = frequencies[type]
      const oscillator1 = audioContext.createOscillator()
      const oscillator2 = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator1.frequency.setValueAtTime(freq1, audioContext.currentTime)
      oscillator2.frequency.setValueAtTime(freq2, audioContext.currentTime)
      
      oscillator1.connect(gainNode)
      oscillator2.connect(gainNode)
      gainNode.connect(audioContext.destination)

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

      oscillator1.start(audioContext.currentTime)
      oscillator2.start(audioContext.currentTime)
      oscillator1.stop(audioContext.currentTime + 0.3)
      oscillator2.stop(audioContext.currentTime + 0.3)
    } catch (error) {
      console.warn('Could not play notification sound:', error)
    }
  }, [config.enableSound])

  const showToast = useCallback((toast: Omit<ToastNotification, 'id' | 'createdAt'>) => {
    const id = generateId()
    const newToast: ToastNotification = {
      ...toast,
      id,
      createdAt: Date.now(),
      duration: toast.duration || config.duration,
      dismissible: toast.dismissible !== false
    }

    setToasts(prev => {
      let updated = [...prev, newToast]
      
      // 최대 개수 제한
      if (updated.length > config.maxNotifications) {
        updated = updated.slice(-config.maxNotifications)
      }
      
      return updated
    })

    // 사운드 재생
    if (config.enableSound) {
      playNotificationSound(toast.type)
    }

    // 자동 삭제 (persistent가 아닌 경우)
    if (!toast.persistent && toast.duration !== 0) {
      setTimeout(() => {
        dismissToast(id)
      }, newToast.duration)
    }

    return id
  }, [config, generateId, playNotificationSound])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const dismissAllToasts = useCallback(() => {
    setToasts([])
  }, [])

  const showModal = useCallback((modalData: Omit<ModalNotification, 'id'>) => {
    const id = generateId()
    const newModal: ModalNotification = {
      ...modalData,
      id
    }

    setModal(newModal)

    // 에러 모달인 경우 사운드 재생
    if (config.enableSound && modalData.type === 'error') {
      playNotificationSound('error')
    }
  }, [generateId, config.enableSound, playNotificationSound])

  const dismissModal = useCallback(() => {
    setModal(null)
  }, [])

  const notifyError = useCallback((error: AppError, recoveryActions?: ErrorRecoveryAction[]) => {
    const actions = recoveryActions || []

    // 심각도에 따라 알림 방식 결정
    if (error.severity === ErrorSeverity.HIGH || error.severity === ErrorSeverity.CRITICAL) {
      // 중요한 에러는 모달로 표시
      showModal({
        type: 'error',
        title: '오류 발생',
        message: error.userMessage,
        recoveryActions: actions,
        onClose: dismissModal,
        persistent: error.severity === ErrorSeverity.CRITICAL
      })
    } else {
      // 일반적인 에러는 토스트로 표시
      showToast({
        type: 'error',
        title: '오류',
        message: error.userMessage,
        recoveryActions: actions,
        duration: error.severity === ErrorSeverity.MEDIUM ? 7000 : 5000,
        persistent: false
      })
    }
  }, [showModal, showToast, dismissModal])

  const notifySuccess = useCallback((message: string, title = '성공') => {
    showToast({
      type: 'success',
      title,
      message
    })
  }, [showToast])

  const notifyWarning = useCallback((message: string, title = '경고') => {
    showToast({
      type: 'warning',
      title,
      message,
      duration: 7000
    })
  }, [showToast])

  const notifyInfo = useCallback((message: string, title = '알림') => {
    showToast({
      type: 'info',
      title,
      message
    })
  }, [showToast])

  const updateConfig = useCallback((configUpdate: Partial<NotificationConfig>) => {
    setConfig(prev => ({ ...prev, ...configUpdate }))
  }, [])

  const contextValue: NotificationContextType = {
    toasts,
    showToast,
    dismissToast,
    dismissAllToasts,
    modal,
    showModal,
    dismissModal,
    notifyError,
    notifySuccess,
    notifyWarning,
    notifyInfo,
    config,
    updateConfig
  }

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <ToastContainer />
      <ModalContainer />
    </NotificationContext.Provider>
  )
}

// 토스트 컨테이너 컴포넌트
const ToastContainer: React.FC = () => {
  const { toasts, dismissToast, config } = useNotification()

  if (typeof window === 'undefined') return null

  return createPortal(
    <div className={`toast-container toast-${config.position}`}>
      {toasts.map(toast => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => dismissToast(toast.id)}
          enableAnimation={config.enableAnimation}
        />
      ))}
      <style>{`
        .toast-container {
          position: fixed;
          z-index: 9999;
          pointer-events: none;
        }

        .toast-top-right {
          top: 1rem;
          right: 1rem;
        }

        .toast-top-left {
          top: 1rem;
          left: 1rem;
        }

        .toast-bottom-right {
          bottom: 1rem;
          right: 1rem;
        }

        .toast-bottom-left {
          bottom: 1rem;
          left: 1rem;
        }

        .toast-top-center {
          top: 1rem;
          left: 50%;
          transform: translateX(-50%);
        }

        .toast-bottom-center {
          bottom: 1rem;
          left: 50%;
          transform: translateX(-50%);
        }

        @media (max-width: 768px) {
          .toast-container {
            left: 1rem;
            right: 1rem;
          }

          .toast-top-center,
          .toast-bottom-center {
            transform: none;
          }
        }
      `}</style>
    </div>,
    document.body
  )
}

// 개별 토스트 아이템
interface ToastItemProps {
  toast: ToastNotification
  onDismiss: () => void
  enableAnimation: boolean
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss, enableAnimation }) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // 마운트 시 애니메이션
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = () => {
    if (enableAnimation) {
      setIsVisible(false)
      setTimeout(onDismiss, 300) // 애니메이션 시간 후 제거
    } else {
      onDismiss()
    }
  }

  const typeIcons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  }

  const typeColors = {
    success: { bg: '#dcfce7', border: '#16a34a', text: '#15803d' },
    error: { bg: '#fef2f2', border: '#dc2626', text: '#b91c1c' },
    warning: { bg: '#fefbeb', border: '#d97706', text: '#a16207' },
    info: { bg: '#eff6ff', border: '#2563eb', text: '#1d4ed8' }
  }

  return (
    <div
      className={`toast-item ${isVisible ? 'toast-visible' : ''}`}
      style={{
        backgroundColor: typeColors[toast.type].bg,
        borderColor: typeColors[toast.type].border,
        color: typeColors[toast.type].text
      }}
    >
      <div className="toast-content">
        <div className="toast-header">
          <span className="toast-icon">{typeIcons[toast.type]}</span>
          <span className="toast-title">{toast.title}</span>
          {toast.dismissible && (
            <button
              className="toast-dismiss"
              onClick={handleDismiss}
              aria-label="알림 닫기"
            >
              ×
            </button>
          )}
        </div>
        <div className="toast-message">{toast.message}</div>
        
        {toast.recoveryActions && toast.recoveryActions.length > 0 && (
          <div className="toast-actions">
            {toast.recoveryActions.map((action, index) => (
              <button
                key={index}
                className="toast-action-button"
                onClick={() => {
                  action.action()
                  handleDismiss()
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .toast-item {
          pointer-events: auto;
          margin-bottom: 0.5rem;
          min-width: 300px;
          max-width: 500px;
          border: 1px solid;
          border-radius: 0.5rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          opacity: ${enableAnimation ? 0 : 1};
          transform: ${enableAnimation ? 'translateX(100%)' : 'none'};
          transition: ${enableAnimation ? 'all 0.3s ease-in-out' : 'none'};
        }

        .toast-visible {
          opacity: 1;
          transform: translateX(0);
        }

        .toast-content {
          padding: 1rem;
        }

        .toast-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }

        .toast-icon {
          font-size: 1.25rem;
          margin-right: 0.5rem;
        }

        .toast-title {
          font-weight: 600;
          flex: 1;
        }

        .toast-dismiss {
          background: none;
          border: none;
          font-size: 1.5rem;
          line-height: 1;
          cursor: pointer;
          opacity: 0.6;
          transition: opacity 0.2s;
        }

        .toast-dismiss:hover {
          opacity: 1;
        }

        .toast-message {
          font-size: 0.875rem;
          line-height: 1.4;
          margin-bottom: 0.75rem;
        }

        .toast-actions {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .toast-action-button {
          padding: 0.25rem 0.75rem;
          font-size: 0.75rem;
          border: 1px solid currentColor;
          border-radius: 0.25rem;
          background: transparent;
          color: inherit;
          cursor: pointer;
          transition: all 0.2s;
        }

        .toast-action-button:hover {
          background: currentColor;
          color: white;
        }

        @media (max-width: 768px) {
          .toast-item {
            min-width: auto;
            max-width: none;
          }
        }
      `}</style>
    </div>
  )
}

// 모달 컨테이너 컴포넌트
const ModalContainer: React.FC = () => {
  const { modal, dismissModal } = useNotification()

  if (typeof window === 'undefined' || !modal) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !modal.persistent) {
      modal.onClose()
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !modal.persistent) {
      modal.onClose()
    }
  }

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'auto'
    }
  }, [modal])

  const typeIcons = {
    error: '❌',
    warning: '⚠️',
    confirm: '❓'
  }

  const typeColors = {
    error: { bg: '#fef2f2', border: '#dc2626', text: '#b91c1c' },
    warning: { bg: '#fefbeb', border: '#d97706', text: '#a16207' },
    confirm: { bg: '#eff6ff', border: '#2563eb', text: '#1d4ed8' }
  }

  return createPortal(
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div
        className="modal-content"
        style={{
          backgroundColor: typeColors[modal.type].bg,
          borderColor: typeColors[modal.type].border,
          color: typeColors[modal.type].text
        }}
      >
        <div className="modal-header">
          <div className="modal-title-container">
            <span className="modal-icon">{typeIcons[modal.type]}</span>
            <h3 className="modal-title">{modal.title}</h3>
          </div>
          {!modal.persistent && (
            <button
              className="modal-close"
              onClick={modal.onClose}
              aria-label="모달 닫기"
            >
              ×
            </button>
          )}
        </div>

        <div className="modal-body">
          <p className="modal-message">{modal.message}</p>
        </div>

        <div className="modal-footer">
          {modal.recoveryActions.map((action, index) => (
            <button
              key={index}
              className={`modal-action-button ${
                action.type === 'retry' ? 'primary' : 'secondary'
              }`}
              onClick={() => {
                action.action()
                modal.onClose()
              }}
            >
              {action.label}
            </button>
          ))}
          {!modal.persistent && (
            <button
              className="modal-action-button secondary"
              onClick={modal.onClose}
            >
              닫기
            </button>
          )}
        </div>
      </div>

      <style>{`
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 1rem;
        }

        .modal-content {
          background: white;
          border: 2px solid;
          border-radius: 0.75rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          max-width: 500px;
          width: 100%;
          max-height: 80vh;
          overflow-y: auto;
          animation: modalSlideIn 0.3s ease-out;
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem 1.5rem 0;
        }

        .modal-title-container {
          display: flex;
          align-items: center;
        }

        .modal-icon {
          font-size: 1.5rem;
          margin-right: 0.75rem;
        }

        .modal-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 2rem;
          line-height: 1;
          cursor: pointer;
          opacity: 0.6;
          transition: opacity 0.2s;
        }

        .modal-close:hover {
          opacity: 1;
        }

        .modal-body {
          padding: 1.5rem;
        }

        .modal-message {
          margin: 0;
          line-height: 1.6;
          font-size: 1rem;
        }

        .modal-footer {
          padding: 0 1.5rem 1.5rem;
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
          flex-wrap: wrap;
        }

        .modal-action-button {
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid;
        }

        .modal-action-button.primary {
          background: currentColor;
          color: white;
          border-color: currentColor;
        }

        .modal-action-button.primary:hover {
          opacity: 0.9;
        }

        .modal-action-button.secondary {
          background: transparent;
          color: currentColor;
          border-color: currentColor;
        }

        .modal-action-button.secondary:hover {
          background: currentColor;
          color: white;
        }

        @media (max-width: 768px) {
          .modal-content {
            margin: 0;
            border-radius: 0.5rem;
          }

          .modal-footer {
            flex-direction: column;
          }

          .modal-action-button {
            width: 100%;
          }
        }
      `}</style>
    </div>,
    document.body
  )
}