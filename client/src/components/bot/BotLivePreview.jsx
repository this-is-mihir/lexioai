import { MessageCircle, X, Send } from 'lucide-react'
import { useMemo } from 'react'



export default function BotLivePreview({ appearance, behavior }) {
  const {
    position = 'bottom-right',
    bubbleSize = 'medium',
    brandColor = '#7F77DD',
    avatarId = 'default-1',
    avatarImageUrl,
    chatWindowTitle = 'Chat with us',
  } = appearance || {}

  const { inputPlaceholder = 'Type your message...' } = behavior || {}

  const bubbleSizes = {
    small: { width: '300px', height: '400px', padding: '12px' },
    medium: { width: '380px', height: '500px', padding: '16px' },
    large: { width: '450px', height: '600px', padding: '20px' },
  }

  const positionClasses = useMemo(() => {
    const baseClasses = 'fixed z-50 shadow-2xl rounded-xl overflow-hidden flex flex-col'
    const positions = {
      'bottom-right': 'bottom-6 right-6',
      'bottom-left': 'bottom-6 left-6',
    }
    return `${baseClasses} ${positions[position]}`
  }, [position])

  const bubbleStyle = useMemo(() => ({
    ...bubbleSizes[bubbleSize],
    backgroundColor: '#fff',
    border: `1px solid #e5e7eb`,
  }), [bubbleSize])

  const getAvatar = () => {
    if (avatarImageUrl) {
      return <img src={avatarImageUrl} alt="Bot" className="w-8 h-8 rounded-full object-cover" onError={(e) => {e.target.style.display = 'none'}} />
    }
    return <span className="text-lg">🤖</span>
  }

  return (
    <div className="bg-[var(--bg-soft)] rounded-xl p-6 sticky top-64">
      <p className="text-sm font-semibold mb-4 text-[var(--text)]">Live Preview</p>

      {/* Chat window preview - clean and simple */}
      <div className="flex justify-center items-end min-h-96 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 relative">
        {/* Chat window */}
        <div style={bubbleStyle} className="rounded-xl overflow-hidden flex flex-col border border-gray-200 shadow-xl bg-white">
          {/* Chat window header */}
          <div style={{ backgroundColor: brandColor }} className="text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getAvatar()}
              <p className="font-medium text-sm">{chatWindowTitle}</p>
            </div>
            <button className="hover:opacity-80 transition">
              <X size={18} />
            </button>
          </div>

          {/* Chat messages */}
          <div className="flex-1 p-4 overflow-y-auto bg-white space-y-3 flex flex-col justify-end">
            {/* Bot message */}
            <div className="flex gap-2">
              <div className="flex-shrink-0 flex items-start">
                {avatarImageUrl ? (
                  <img src={avatarImageUrl} alt="Bot" className="w-6 h-6 rounded-full object-cover" onError={(e) => {e.target.style.display = 'none'}} />
                ) : (
                  <span className="text-sm">🤖</span>
                )}
              </div>
              <div className="bg-gray-100 rounded-lg p-3 max-w-xs text-sm text-gray-700">
                Hi! How can I help you today?
              </div>
            </div>

            {/* User message */}
            <div className="flex justify-end">
              <div style={{ backgroundColor: brandColor + '20', borderLeftColor: brandColor }} className="rounded-lg p-3 max-w-xs text-sm border-l-2 text-gray-900">
                Tell me more
              </div>
            </div>
          </div>

          {/* Input area */}
          <div className="border-t p-3 bg-white flex gap-2">
            <input
              type="text"
              placeholder={inputPlaceholder}
              className="flex-1 px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:outline-none focus:bg-white"
              readOnly
            />
            <button style={{ backgroundColor: brandColor }} className="text-white p-2 rounded-lg hover:opacity-90 transition">
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Preview info */}
      <div className="mt-4 text-xs text-[var(--text-muted)] text-center">
        <p>Position: <strong>{position}</strong> • Size: <strong>{bubbleSize}</strong></p>
        <p className="mt-1">Updates in real-time as you change settings</p>
      </div>
    </div>
  )
}
