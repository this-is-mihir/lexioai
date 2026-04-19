import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import clientApi from '../../api/axios'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import SelectMenu from '../../components/ui/SelectMenu'

const initial = {
  name: '',
  websiteUrl: '',
  websiteName: '',
  industry: 'other',
  description: '',
}

export default function NewBotPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [industries, setIndustries] = useState([])
  const [industriesLoading, setIndustriesLoading] = useState(true)
  const [customIndustry, setCustomIndustry] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [addingIndustry, setAddingIndustry] = useState(false)

  // Fetch industries from API
  useEffect(() => {
    const fetchIndustries = async () => {
      try {
        const res = await clientApi.get('/industries')
        const allIndustries = res?.data?.data?.industries || []
        setIndustries(allIndustries)
        
        // Set first available industry as default
        if (allIndustries.length > 0) {
          setForm((p) => ({ ...p, industry: allIndustries[0].value }))
        }
      } catch (error) {
        console.error('Error fetching industries:', error)
        toast.error('Failed to load industries')
      } finally {
        setIndustriesLoading(false)
      }
    }

    fetchIndustries()
  }, [])

  const addCustomIndustry = async () => {
    if (!customIndustry.trim()) {
      toast.error('Please enter an industry name')
      return
    }

    setAddingIndustry(true)
    try {
      const res = await clientApi.post('/industries', {
        label: customIndustry.trim(),
      })
      
      const newIndustry = res?.data?.data?.industry
      if (newIndustry) {
        // Add to UI
        setIndustries([...industries, newIndustry])
        
        // Set as selected industry
        setForm((p) => ({ ...p, industry: newIndustry.value }))
        
        // Reset
        setCustomIndustry('')
        setShowCustomInput(false)
        
        toast.success(`Industry "${customIndustry}" added to database!`)
      }
    } catch (error) {
      const errorMsg = error?.response?.data?.message || 'Failed to add industry'
      toast.error(errorMsg)
    } finally {
      setAddingIndustry(false)
    }
  }

  const create = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await clientApi.post('/bots', form)
      const bot = res?.data?.data?.bot
      toast.success('Bot created')
      navigate(`/bots/${bot?._id || ''}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Card className="p-6">
        <h1 className="text-2xl font-extrabold">Create New Bot</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Setup basic details. Training and settings can be configured next.</p>

        <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={create}>
          <Input label="Bot Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
          <Input label="Website Name" value={form.websiteName} onChange={(e) => setForm((p) => ({ ...p, websiteName: e.target.value }))} />
          <div className="sm:col-span-2">
            <Input label="Website URL" value={form.websiteUrl} onChange={(e) => setForm((p) => ({ ...p, websiteUrl: e.target.value }))} placeholder="https://yourwebsite.com" />
          </div>
          <label className="sm:col-span-2">
            <span className="label">Industry</span>
            <div className="space-y-2">
              {!showCustomInput ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
                  <div className="flex-1">
                    <SelectMenu
                      value={form.industry}
                      onChange={(value) => {
                        setForm((p) => ({ ...p, industry: value }))
                        setShowCustomInput(false)
                      }}
                      options={industries}
                      searchable={true}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCustomInput(true)}
                    className="h-10 px-3 sm:px-4 rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] text-xs sm:text-sm text-[var(--primary-500)] hover:text-[var(--primary-600)] hover:bg-[var(--bg)] font-medium transition-colors whitespace-nowrap flex items-center justify-center"
                  >
                    + Add Custom
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="e.g., Real Estate, Legal, Consulting..."
                    value={customIndustry}
                    onChange={(e) => setCustomIndustry(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addCustomIndustry()
                      }
                    }}
                    className="input w-full"
                    autoFocus
                  />
                  <div className="flex gap-2 sm:justify-start justify-end">
                    <Button 
                      type="button" 
                      onClick={addCustomIndustry} 
                      className="h-10 px-4"
                      disabled={addingIndustry}
                    >
                      {addingIndustry ? 'Adding...' : 'Add'}
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomInput(false)
                        setCustomIndustry('')
                      }}
                      className="h-10 px-3 sm:px-4 rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] text-xs sm:text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg)] font-medium transition-colors whitespace-nowrap flex items-center justify-center"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </label>
          <div className="sm:col-span-2">
            <label>
              <span className="label">Description</span>
              <textarea className="input min-h-24" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </label>
          </div>

          <div className="sm:col-span-2 flex gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate('/bots')}>Cancel</Button>
            <Button type="submit" className="justify-center" disabled={loading}>{loading ? 'Creating...' : 'Create bot'}</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
