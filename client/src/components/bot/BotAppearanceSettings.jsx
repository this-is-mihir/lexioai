import { useState, useRef, useEffect } from 'react'
import { Upload, X, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import clientApi from '../../api/axios'
import Button from '../ui/Button'
import Card from '../ui/Card'
import Input from '../ui/Input'



// Color presets
const COLOR_PRESETS = [
  { name: 'Purple', color: '#7F77DD' },
  { name: 'Blue', color: '#3B82F6' },
  { name: 'Green', color: '#10B981' },
  { name: 'Red', color: '#EF4444' },
  { name: 'Orange', color: '#F97316' },
  { name: 'Pink', color: '#EC4899' },
]

export default function BotAppearanceSettings({ botId, initialData, onUpdate }) {
  const fileInputRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  
  const [formData, setFormData] = useState({
    position: initialData?.appearance?.position || 'bottom-right',
    bubbleSize: initialData?.appearance?.bubbleSize || 'medium',
    brandColor: initialData?.appearance?.brandColor || '#7F77DD',
    avatarId: initialData?.appearance?.avatarId || 'default-1',
    avatarImageUrl: initialData?.appearance?.avatarImageUrl || null,
    chatWindowTitle: initialData?.appearance?.chatWindowTitle || 'Chat with us',
    inputPlaceholder: initialData?.behavior?.inputPlaceholder || 'Type your message...',
  })

  useEffect(() => {
    if (initialData?.appearance) {
      setFormData(prev => ({
        ...prev,
        ...initialData.appearance,
        inputPlaceholder: initialData.behavior?.inputPlaceholder || prev.inputPlaceholder,
      }))

    }
  }, [initialData])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleColorChange = (color) => {
    setFormData(prev => ({ ...prev, brandColor: color }))
  }



  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error('File size must not exceed 2MB')
      return
    }

    // Validate file type
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedMimes.includes(file.type)) {
      toast.error('Only JPG, PNG, and WebP files are allowed')
      return
    }

    // Upload to server
    setUploading(true)
    const formDataToSend = new FormData()
    formDataToSend.append('avatar', file)

    try {
      const response = await clientApi.post(`/bots/${botId}/upload-avatar`, formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const { data } = response.data
      setFormData(prev => ({
        ...prev,
        avatarImageUrl: data.avatarUrl,
        avatarId: data.publicId,
      }))
      toast.success('Avatar uploaded successfully!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload avatar')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const payload = {
        position: formData.position,
        bubbleSize: formData.bubbleSize,
        brandColor: formData.brandColor,
        avatarId: formData.avatarId,
        avatarImageUrl: formData.avatarImageUrl,
        chatWindowTitle: formData.chatWindowTitle,
      }

      await clientApi.put(`/bots/${botId}/appearance`, payload)

      // Also update input placeholder in behavior
      await clientApi.put(`/bots/${botId}/behavior`, {
        inputPlaceholder: formData.inputPlaceholder,
      })

      toast.success('Settings saved successfully!')
      onUpdate?.()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 py-4">
      {/* 1. POSITION */}
      <Card className="p-5">
        <p className="text-sm font-semibold mb-4">Bot Position</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'bottom-left', label: 'Bottom Left' },
            { value: 'bottom-right', label: 'Bottom Right' },
          ].map(option => (
            <label key={option.value} className="flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition" style={{
              borderColor: formData.position === option.value ? 'var(--primary-500)' : 'var(--border)',
              backgroundColor: formData.position === option.value ? 'var(--primary-500)/10' : 'transparent',
            }}>
              <input
                type="radio"
                name="position"
                value={option.value}
                checked={formData.position === option.value}
                onChange={handleInputChange}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">{option.label}</span>
            </label>
          ))}
        </div>
      </Card>

      {/* 2. BUBBLE SIZE */}
      <Card className="p-5">
        <p className="text-sm font-semibold mb-4">Bubble Size</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'small', label: 'Small', size: '300px' },
            { value: 'medium', label: 'Medium', size: '380px' },
            { value: 'large', label: 'Large', size: '450px' },
          ].map(option => (
            <label key={option.value} className="flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition" style={{
              borderColor: formData.bubbleSize === option.value ? 'var(--primary-500)' : 'var(--border)',
              backgroundColor: formData.bubbleSize === option.value ? 'var(--primary-500)/10' : 'transparent',
            }}>
              <input
                type="radio"
                name="bubbleSize"
                value={option.value}
                checked={formData.bubbleSize === option.value}
                onChange={handleInputChange}
                className="w-4 h-4"
              />
              <div className="flex-1">
                <p className="text-sm font-medium">{option.label}</p>
                <p className="text-xs text-[var(--text-muted)]">{option.size}</p>
              </div>
            </label>
          ))}
        </div>
      </Card>

      {/* 3. BRAND COLOR */}
      <Card className="p-5">
        <p className="text-sm font-semibold mb-4">Primary Color</p>
        <div className="flex gap-2 items-center mb-3 flex-wrap">
          {COLOR_PRESETS.map(preset => (
            <button
              key={preset.color}
              onClick={() => handleColorChange(preset.color)}
              className="w-10 h-10 rounded-full border-2 transition"
              style={{
                backgroundColor: preset.color,
                borderColor: formData.brandColor === preset.color ? '#000' : '#ccc',
                borderWidth: formData.brandColor === preset.color ? '3px' : '1px',
              }}
              title={preset.name}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="color"
            value={formData.brandColor}
            onChange={(e) => handleColorChange(e.target.value)}
            className="w-12 h-10 rounded cursor-pointer"
          />
          <input
            type="text"
            value={formData.brandColor}
            onChange={(e) => handleColorChange(e.target.value)}
            className="flex-1 px-3 py-2 border rounded bg-[var(--bg-soft)] text-sm font-mono"
            placeholder="#7F77DD"
          />
        </div>
      </Card>

      {/* 4. AVATAR */}
      <Card className="p-5">
        <p className="text-sm font-semibold mb-4">Bot Avatar</p>
        <div className="space-y-3">
          {formData.avatarImageUrl && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-soft)]">
              <img src={formData.avatarImageUrl} alt="Current avatar" className="w-16 h-16 rounded-full object-cover flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Current Avatar</p>
                <p className="text-xs text-[var(--text-muted)]">Upload date saved</p>
              </div>
            </div>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full p-4 border-2 border-dashed rounded-lg transition flex items-center justify-center gap-2 hover:bg-[var(--bg-soft)]"
            style={{ borderColor: 'var(--border)' }}
          >
            <Upload size={20} style={{ color: 'var(--primary-500)' }} />
            <div className="flex flex-col items-start">
              <p className="text-sm font-medium">{uploading ? 'Uploading...' : 'Click to upload'}</p>
              <p className="text-xs text-[var(--text-muted)]">Max 2MB • JPG, PNG, WebP</p>
            </div>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
        </div>
      </Card>

      {/* 5. TEXT CUSTOMIZATION */}
      <Card className="p-5">
        <p className="text-sm font-semibold mb-4">Text Customization</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-2">Chat Window Title</label>
            <Input
              name="chatWindowTitle"
              value={formData.chatWindowTitle}
              onChange={handleInputChange}
              placeholder="Chat with us"
              maxLength={30}
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">{formData.chatWindowTitle.length}/30</p>
          </div>

          <div>
            <label className="block text-xs font-medium mb-2">Input Placeholder</label>
            <Input
              name="inputPlaceholder"
              value={formData.inputPlaceholder}
              onChange={handleInputChange}
              placeholder="Type your message..."
              maxLength={50}
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">{formData.inputPlaceholder.length}/50</p>
          </div>
        </div>
      </Card>

      {/* SAVE BUTTON */}
      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={loading}
          className="flex-1"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}
