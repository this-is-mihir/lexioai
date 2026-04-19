import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, X, Loader2, Check, AlertCircle, Eye, EyeOff,
  Palette, Settings as SettingsIcon, Lock, FileText, Zap,
  Upload, Copy, Check as CheckIcon,
} from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';
import { SelectDropdown } from '../../components/ui/SelectDropdown';
import { uploadImageToCloudinary } from '../../utils/cloudinaryUpload';
import adminApi from '../../api/axios';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

// ─── UTILITY FUNCTIONS ───────────────────────────────────────

const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text);
  toast.success('Copied to clipboard!');
};

// ─── TAB 1: BRANDING ────────────────────────────────────────

function BrandingTab({ settings, onSave, isSaving }) {
  const [form, setForm] = useState(settings?.branding || {
    platformName: 'Lexioai',
    logoUrl: '',
    faviconUrl: '',
    watermarkUrl: '',
    primaryColor: '#7C3AED',
    secondaryColor: '#EC4899',
    accentColor: '#06B6D4',
  });

  const [uploading, setUploading] = useState({
    logo: false,
    favicon: false,
    watermark: false,
  });

  useEffect(() => {
    setForm({
      platformName: 'Lexioai',
      logoUrl: '',
      faviconUrl: '',
      watermarkUrl: '',
      primaryColor: '#7C3AED',
      secondaryColor: '#EC4899',
      accentColor: '#06B6D4',
      ...(settings?.branding || {}),
    });
  }, [settings]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const uploadToCloudinary = async (file, folder = 'branding') => {
    if (!file) return null;

    try {
      const url = await uploadImageToCloudinary(file, folder);
      toast.success('Image uploaded! 🎉');
      return url;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error.message}`);
      return null;
    }
  };

  const handleImageUpload = async (e, fieldName) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(prev => ({ ...prev, [fieldName]: true }));

    try {
      const url = await uploadToCloudinary(file, fieldName);
      if (url) {
        const fieldMap = {
          logo: 'logoUrl',
          favicon: 'faviconUrl',
          watermark: 'watermarkUrl',
        };
        handleChange(fieldMap[fieldName], url);
        toast.success(`${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} uploaded!`);
      }
    } finally {
      setUploading(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  const handleDeleteImage = (fieldName) => {
    const fieldMap = {
      logo: 'logoUrl',
      favicon: 'faviconUrl',
      watermark: 'watermarkUrl',
    };
    handleChange(fieldMap[fieldName], '');
    toast.success('Image removed');
  };

  const handleSave = () => {
    if (!form.platformName.trim()) {
      toast.error('Platform name is required');
      return;
    }
    onSave('branding', form);
  };

  const ImageUploadField = ({ label, fieldName, urlField, uploadState }) => {
    const imageUrl = form[urlField];

    return (
      <div className="p-4 rounded-lg bg-[var(--bg-hover)] border border-[var(--border)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[var(--text)]">{label}</h3>
          {imageUrl && (
            <button
              onClick={() => handleDeleteImage(fieldName)}
              className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
            >
              Delete
            </button>
          )}
        </div>

        {/* Preview */}
        {imageUrl && (
          <div className="mb-3 relative w-full h-32 rounded-lg overflow-hidden border border-[var(--border)] bg-black/10">
            <img
              src={imageUrl}
              alt={label}
              className="w-full h-full object-cover"
              onError={() => toast.error('Failed to load image')}
            />
          </div>
        )}

        {/* Upload Button */}
        <div className="space-y-2">
          <label className="btn-secondary text-sm inline-flex gap-2 cursor-pointer disabled:opacity-50">
            {uploadState ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Choose File
              </>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, fieldName)}
              disabled={uploadState}
              className="hidden"
            />
          </label>
          <p className="text-xs text-[var(--text-muted)]">
            {fieldName === 'favicon' ? 'Recommended: ICO or PNG (32x32px)' : 'JPG, PNG, or WebP'}
          </p>
        </div>

        {/* Manual URL Fallback */}
        <div className="mt-3 pt-3 border-t border-[var(--border)]">
          <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">
            Or paste URL manually (backup option)
          </label>
          <input
            type="text"
            value={imageUrl ?? ''}
            onChange={(e) => handleChange(urlField, e.target.value)}
            placeholder="https://cdn.example.com/image.png"
            className="input w-full text-xs h-fit py-2 font-mono"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Platform Name */}
      <div>
        <label className="text-sm font-semibold text-[var(--text-muted)] mb-2 block">
          Platform Name
        </label>
        <input
          type="text"
          value={form.platformName ?? ''}
          onChange={(e) => handleChange('platformName', e.target.value)}
          placeholder="e.g., Lexioai"
          className="input w-full text-sm h-fit py-2"
        />
      </div>

      {/* Logo Upload */}
      <ImageUploadField
        label="Platform Logo"
        fieldName="logo"
        urlField="logoUrl"
        uploadState={uploading.logo}
      />

      {/* Favicon Upload */}
      <ImageUploadField
        label="Favicon (Browser Tab Icon)"
        fieldName="favicon"
        urlField="faviconUrl"
        uploadState={uploading.favicon}
      />

      {/* Watermark Upload */}
      <ImageUploadField
        label="Watermark (Free Plan Widget)"
        fieldName="watermark"
        urlField="watermarkUrl"
        uploadState={uploading.watermark}
      />

      {/* Colors */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { key: 'primaryColor', label: 'Primary Color' },
          { key: 'secondaryColor', label: 'Secondary Color' },
          { key: 'accentColor', label: 'Accent Color' },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="text-xs font-semibold text-[var(--text-muted)] block mb-2">
              {label}
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={form[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                className="h-10 w-14 rounded cursor-pointer"
              />
              <input
                type="text"
                value={form[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                className="input flex-1 text-xs h-fit py-2 font-mono"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Save Button */}
      <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary inline-flex gap-2 items-center disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── TAB 2: OPERATIONS ──────────────────────────────────────

function OperationsTab({ settings, onSave, isSaving }) {
  const [form, setForm] = useState({
    maintenanceMode: settings?.general?.maintenanceMode ?? false,
    maintenanceMessage: settings?.general?.maintenanceMessage || '',
    allowNewRegistrations: settings?.general?.allowNewRegistrations ?? true,
    defaultPlan: settings?.general?.defaultPlan || 'free',
  });

  useEffect(() => {
    setForm({
      maintenanceMode: settings?.general?.maintenanceMode ?? false,
      maintenanceMessage: settings?.general?.maintenanceMessage || '',
      allowNewRegistrations: settings?.general?.allowNewRegistrations ?? true,
      defaultPlan: settings?.general?.defaultPlan || 'free',
    });
  }, [settings]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave('operations', form);
  };

  return (
    <div className="space-y-6">
      {/* Maintenance Mode */}
      <div className="p-4 rounded-lg bg-[var(--bg-hover)] border border-[var(--border)]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-[var(--text)]">Maintenance Mode</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Disable platform access for all users except SuperAdmin
            </p>
          </div>
          <input
            type="checkbox"
            checked={form.maintenanceMode}
            onChange={(e) => handleChange('maintenanceMode', e.target.checked)}
            className="w-5 h-5 cursor-pointer"
          />
        </div>
        {form.maintenanceMode && (
          <textarea
            value={form.maintenanceMessage ?? ''}
            onChange={(e) => handleChange('maintenanceMessage', e.target.value)}
            placeholder="Enter maintenance message..."
            rows={3}
            className="input w-full text-sm resize-none"
          />
        )}
      </div>

      {/* Allow New Registrations */}
      <div className="p-4 rounded-lg bg-[var(--bg-hover)] border border-[var(--border)]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-[var(--text)]">Allow New Registrations</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Enable/Disable user signup
            </p>
          </div>
          <input
            type="checkbox"
            checked={form.allowNewRegistrations}
            onChange={(e) => handleChange('allowNewRegistrations', e.target.checked)}
            className="w-5 h-5 cursor-pointer"
          />
        </div>
      </div>

      {/* Default Plan */}
      <div>
        <SelectDropdown
          label="Default Plan for New Users"
          value={form.defaultPlan ?? 'free'}
          onChange={(value) => handleChange('defaultPlan', value)}
          options={[
            { value: 'free', label: 'Free' },
            { value: 'starter', label: 'Starter' },
            { value: 'pro', label: 'Pro' },
            { value: 'business', label: 'Business' },
          ]}
        />
      </div>

      {/* Save Button */}
      <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary inline-flex gap-2 items-center disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── TAB 3: INTEGRATIONS ────────────────────────────────────

function IntegrationsTab({ settings, onSave, isSaving }) {
  const [form, setForm] = useState(settings?.integrations || {
    cloudinary: { cloudName: '', apiKey: '', apiSecret: '', enabled: false },
    smtp: { host: '', port: 587, secure: true, username: '', password: '', fromEmail: '', enabled: false },
    gemini: { apiKey: '', enabled: false },
    groq: { apiKey: '', enabled: false },
  });

  useEffect(() => {
    setForm({
      cloudinary: { cloudName: '', apiKey: '', apiSecret: '', enabled: false, ...(settings?.integrations?.cloudinary || {}) },
      smtp: { host: '', port: 587, secure: true, username: '', password: '', fromEmail: '', enabled: false, ...(settings?.integrations?.smtp || {}) },
      gemini: { apiKey: '', enabled: false, ...(settings?.integrations?.gemini || {}) },
      groq: { apiKey: '', enabled: false, ...(settings?.integrations?.groq || {}) },
    });
  }, [settings]);

  const [showPasswords, setShowPasswords] = useState({
    cloudinary: false,
    smtp: false,
    gemini: false,
    groq: false,
  });

  const handleChange = (section, field, value) => {
    setForm(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }));
  };

  const togglePassword = (service) => {
    setShowPasswords(prev => ({ ...prev, [service]: !prev[service] }));
  };

  const handleSave = () => {
    onSave('integrations', form);
  };

  return (
    <div className="space-y-6">
      {/* Cloudinary */}
      <div className="p-4 rounded-lg bg-[var(--bg-hover)] border border-[var(--border)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[var(--text)]">Cloudinary</h3>
          <input
            type="checkbox"
            checked={form.cloudinary.enabled}
            onChange={(e) => handleChange('cloudinary', 'enabled', e.target.checked)}
            className="w-5 h-5 cursor-pointer"
          />
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Cloud Name</label>
            <input type="text" value={form.cloudinary.cloudName ?? ''} onChange={(e) => handleChange('cloudinary', 'cloudName', e.target.value)} placeholder="your-cloud-name" className="input w-full text-sm h-fit py-2" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">API Key</label>
            <input type="text" value={form.cloudinary.apiKey ?? ''} onChange={(e) => handleChange('cloudinary', 'apiKey', e.target.value)} placeholder="Your API key" className="input w-full text-sm h-fit py-2" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">API Secret</label>
            <div className="flex gap-2">
              <input type={showPasswords.cloudinary ? 'text' : 'password'} value={form.cloudinary.apiSecret ?? ''} onChange={(e) => handleChange('cloudinary', 'apiSecret', e.target.value)} placeholder="Your API secret" className="input flex-1 text-sm h-fit py-2" />
              <button onClick={() => togglePassword('cloudinary')} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                {showPasswords.cloudinary ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SMTP */}
      <div className="p-4 rounded-lg bg-[var(--bg-hover)] border border-[var(--border)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[var(--text)]">SMTP Configuration</h3>
          <input
            type="checkbox"
            checked={form.smtp.enabled}
            onChange={(e) => handleChange('smtp', 'enabled', e.target.checked)}
            className="w-5 h-5 cursor-pointer"
          />
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Host</label>
              <input type="text" value={form.smtp.host ?? ''} onChange={(e) => handleChange('smtp', 'host', e.target.value)} placeholder="smtp.gmail.com" className="input w-full text-sm h-fit py-2" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Port</label>
              <input type="number" value={form.smtp.port ?? 587} onChange={(e) => handleChange('smtp', 'port', parseInt(e.target.value))} placeholder="587" className="input w-full text-sm h-fit py-2" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Username</label>
            <input type="text" value={form.smtp.username ?? ''} onChange={(e) => handleChange('smtp', 'username', e.target.value)} placeholder="Your email" className="input w-full text-sm h-fit py-2" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">Password</label>
            <div className="flex gap-2">
              <input type={showPasswords.smtp ? 'text' : 'password'} value={form.smtp.password ?? ''} onChange={(e) => handleChange('smtp', 'password', e.target.value)} placeholder="Your password" className="input flex-1 text-sm h-fit py-2" />
              <button onClick={() => togglePassword('smtp')} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                {showPasswords.smtp ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">From Email</label>
            <input type="email" value={form.smtp.fromEmail ?? ''} onChange={(e) => handleChange('smtp', 'fromEmail', e.target.value)} placeholder="noreply@example.com" className="input w-full text-sm h-fit py-2" />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.smtp.secure}
              onChange={(e) => handleChange('smtp', 'secure', e.target.checked)}
              className="w-4 h-4 cursor-pointer"
              id="smtp-secure"
            />
            <label htmlFor="smtp-secure" className="text-xs font-semibold text-[var(--text-muted)] cursor-pointer">
              Use TLS (Secure)
            </label>
          </div>
        </div>
      </div>

      {/* Gemini */}
      <div className="p-4 rounded-lg bg-[var(--bg-hover)] border border-[var(--border)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[var(--text)]">Google Gemini</h3>
          <input
            type="checkbox"
            checked={form.gemini.enabled}
            onChange={(e) => handleChange('gemini', 'enabled', e.target.checked)}
            className="w-5 h-5 cursor-pointer"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">API Key</label>
          <div className="flex gap-2">
            <input type={showPasswords.gemini ? 'text' : 'password'} value={form.gemini.apiKey ?? ''} onChange={(e) => handleChange('gemini', 'apiKey', e.target.value)} placeholder="Your Gemini API key" className="input flex-1 text-sm h-fit py-2" />
            <button onClick={() => togglePassword('gemini')} className="text-[var(--text-muted)] hover:text-[var(--text)]">
              {showPasswords.gemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Groq */}
      <div className="p-4 rounded-lg bg-[var(--bg-hover)] border border-[var(--border)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[var(--text)]">Groq</h3>
          <input
            type="checkbox"
            checked={form.groq.enabled}
            onChange={(e) => handleChange('groq', 'enabled', e.target.checked)}
            className="w-5 h-5 cursor-pointer"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">API Key</label>
          <div className="flex gap-2">
            <input type={showPasswords.groq ? 'text' : 'password'} value={form.groq.apiKey ?? ''} onChange={(e) => handleChange('groq', 'apiKey', e.target.value)} placeholder="Your Groq API key" className="input flex-1 text-sm h-fit py-2" />
            <button onClick={() => togglePassword('groq')} className="text-[var(--text-muted)] hover:text-[var(--text)]">
              {showPasswords.groq ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary inline-flex gap-2 items-center disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── TAB 4: SECURITY ────────────────────────────────────────

function SecurityTab({ settings, onSave, isSaving }) {
  const [form, setForm] = useState(settings?.security || {
    rateLimitPerMinute: 100,
    rateLimitPerHour: 1000,
    jwtExpiry: '15m',
    refreshTokenExpiry: '7d',
    sessionTimeout: 30,
    enableTwoFactor: false,
    passwordMinLength: 8,
    passwordRequireSpecialChar: true,
    passwordRequireNumbers: true,
    secretRotationIntervalDays: 90,
  });

  const [showSecret, setShowSecret] = useState(false);
  const [jwtSecret, setJwtSecret] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    setForm({
      rateLimitPerMinute: 100,
      rateLimitPerHour: 1000,
      jwtExpiry: '15m',
      refreshTokenExpiry: '7d',
      sessionTimeout: 30,
      enableTwoFactor: false,
      passwordMinLength: 8,
      passwordRequireSpecialChar: true,
      passwordRequireNumbers: true,
      secretRotationIntervalDays: 90,
      ...(settings?.security || {}),
    });
  }, [settings]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const rotateMut = useMutation({
    mutationFn: () => adminApi.post('/settings/security/rotate-secret'),
    onSuccess: (res) => {
      setJwtSecret(res.data.data.newSecret);
      toast.success('New JWT secret generated. Copy and store it securely!');
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed to rotate secret'),
  });

  const handleSave = () => {
    onSave('security', form);
  };

  return (
    <div className="space-y-6">
      {/* Rate Limiting */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold text-[var(--text-muted)] mb-2 block">
            Rate Limit (Per Minute)
          </label>
          <input type="number" value={form.rateLimitPerMinute ?? 100} onChange={(e) => handleChange('rateLimitPerMinute', parseInt(e.target.value))} min="10" max="1000" className="input w-full text-sm h-fit py-2" />
        </div>
        <div>
          <label className="text-sm font-semibold text-[var(--text-muted)] mb-2 block">
            Rate Limit (Per Hour)
          </label>
          <input type="number" value={form.rateLimitPerHour ?? 1000} onChange={(e) => handleChange('rateLimitPerHour', parseInt(e.target.value))} min="100" max="10000" className="input w-full text-sm h-fit py-2" />
        </div>
      </div>

      {/* JWT Settings */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold text-[var(--text-muted)] mb-2 block">
            JWT Access Expiry
          </label>
          <input type="text" value={form.jwtExpiry ?? '15m'} onChange={(e) => handleChange('jwtExpiry', e.target.value)} placeholder="15m" className="input w-full text-sm h-fit py-2" />
          <p className="text-xs text-[var(--text-muted)] mt-1">Format: 15m, 1h, 7d</p>
        </div>
        <div>
          <label className="text-sm font-semibold text-[var(--text-muted)] mb-2 block">
            JWT Refresh Expiry
          </label>
          <input type="text" value={form.refreshTokenExpiry ?? '7d'} onChange={(e) => handleChange('refreshTokenExpiry', e.target.value)} placeholder="7d" className="input w-full text-sm h-fit py-2" />
          <p className="text-xs text-[var(--text-muted)] mt-1">Format: 15m, 1h, 7d</p>
        </div>
      </div>

      {/* Session Timeout */}
      <div>
        <label className="text-sm font-semibold text-[var(--text-muted)] mb-2 block">
          Session Timeout (Minutes)
        </label>
        <input type="number" value={form.sessionTimeout ?? 30} onChange={(e) => handleChange('sessionTimeout', parseInt(e.target.value))} min="5" max="480" className="input w-full text-sm h-fit py-2" />
      </div>

      {/* Password Requirements */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-[var(--text)]">Password Requirements</h4>
        <div className="p-3 rounded bg-[var(--bg-hover)] border border-[var(--border)] space-y-3">
          <div className="grid grid-cols-1 gap-2">
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">
                Minimum Length
              </label>
              <input type="number" value={form.passwordMinLength ?? 8} onChange={(e) => handleChange('passwordMinLength', parseInt(e.target.value))} min="4" max="32" className="input w-full text-sm h-fit py-2" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.passwordRequireSpecialChar}
              onChange={(e) => handleChange('passwordRequireSpecialChar', e.target.checked)}
              className="w-4 h-4 cursor-pointer"
              id="special-char"
            />
            <label htmlFor="special-char" className="text-xs font-semibold text-[var(--text-muted)] cursor-pointer">
              Require special characters (!@#$%^&*)
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.passwordRequireNumbers}
              onChange={(e) => handleChange('passwordRequireNumbers', e.target.checked)}
              className="w-4 h-4 cursor-pointer"
              id="require-num"
            />
            <label htmlFor="require-num" className="text-xs font-semibold text-[var(--text-muted)] cursor-pointer">
              Require numbers (0-9)
            </label>
          </div>
        </div>
      </div>

      {/* JWT Secret Rotation */}
      <div className="p-4 rounded-lg bg-yellow-400/10 border border-yellow-400/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-[var(--text)] mb-2">Rotate JWT Secret</h3>
            <p className="text-xs text-[var(--text-muted)] mb-3">
              Generate a new JWT secret. All existing tokens will be invalidated.
            </p>
            {jwtSecret && (
              <div className="mb-3 p-3 rounded bg-[var(--bg-hover)] border border-[var(--border)]">
                <p className="text-xs text-[var(--text-muted)] mb-2">New Secret (copy and save):</p>
                <div className="flex gap-2">
                  <code className="flex-1 text-xs font-mono text-[var(--text)] break-all p-2 rounded bg-black/20">
                    {showSecret ? jwtSecret : '•'.repeat(48)}
                  </code>
                  <button
                    onClick={() => setShowSecret(!showSecret)}
                    className="text-[var(--text-muted)] hover:text-[var(--text)] transition"
                    title="Toggle visibility"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => copyToClipboard(jwtSecret)}
                    className="text-[var(--text-muted)] hover:text-[var(--text)] transition"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            <button
              onClick={() => rotateMut.mutate()}
              disabled={rotateMut.isPending}
              className="btn-secondary text-xs gap-2 inline-flex items-center disabled:opacity-50"
            >
              {rotateMut.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  Generate New Secret
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary inline-flex gap-2 items-center disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── TAB 5: LEGAL ───────────────────────────────────────────

function LegalTab({ settings, onSave, isSaving }) {
  const [form, setForm] = useState(settings?.legal || {
    termsOfService: '',
    privacyPolicy: '',
  });

  useEffect(() => {
    setForm({
      termsOfService: settings?.legal?.termsOfService || '',
      privacyPolicy: settings?.legal?.privacyPolicy || '',
    });
  }, [settings]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave('legal', form);
  };

  return (
    <div className="space-y-6">
      {/* Terms of Service */}
      <div>
        <label className="text-sm font-semibold text-[var(--text-muted)] mb-2 block">
          Terms of Service
        </label>
        <RichTextEditor
          value={form.termsOfService ?? ''}
          onChange={(value) => handleChange('termsOfService', value)}
          placeholder="Enter your terms of service..."
        />
        <p className="text-xs text-[var(--text-muted)] mt-2">
          All formatting (bold, italic, size, colors) will be preserved and displayed to users
        </p>
      </div>

      {/* Privacy Policy */}
      <div>
        <label className="text-sm font-semibold text-[var(--text-muted)] mb-2 block">
          Privacy Policy
        </label>
        <RichTextEditor
          value={form.privacyPolicy ?? ''}
          onChange={(value) => handleChange('privacyPolicy', value)}
          placeholder="Enter your privacy policy..."
        />
        <p className="text-xs text-[var(--text-muted)] mt-2">
          All formatting (bold, italic, size, colors) will be preserved and displayed to users
        </p>
      </div>

      {/* Save Button */}
      <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary inline-flex gap-2 items-center disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── MAIN SETTINGS PAGE ──────────────────────────────────────

export default function SettingsPage() {
  const { admin } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('branding');
  const errorShownRef = useRef(false);

  // Check permission - SuperAdmin only
  if (admin?.role !== 'superadmin') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
          <h2 className="text-lg font-bold text-[var(--text)] mb-2">Access Denied</h2>
          <p className="text-[var(--text-muted)]">
            You don't have permission to access platform settings.
          </p>
        </div>
      </div>
    );
  }

  // Fetch settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const r = await adminApi.get('/settings');
      return r.data.data.settings;
    },
    onError: (error) => {
      // Show error toast only once to avoid duplicate messages
      if (!errorShownRef.current) {
        errorShownRef.current = true;
        toast.error(error?.response?.data?.message || 'Failed to load settings');
      }
    },
    retry: 1, // Retry once on failure
  });

  // Save settings mutation
  const saveMut = useMutation({
    mutationFn: ({ section, data }) =>
      adminApi.put(`/settings/${section}`, data),
    onSuccess: () => {
      toast.success('Settings saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
    },
    onError: (e) =>
      toast.error(e?.response?.data?.message || 'Failed to save settings'),
  });

  const handleSaveTab = (section, data) => {
    saveMut.mutate({ section, data });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Platform Settings</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Manage system-wide configuration and integrations
        </p>
      </div>

      {/* Tabs */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-[var(--border)] overflow-x-auto">
          {[
            { id: 'branding', label: 'Branding', icon: Palette },
            { id: 'operations', label: 'Operations', icon: SettingsIcon },
            { id: 'integrations', label: 'Integrations', icon: Zap },
            { id: 'security', label: 'Security', icon: Lock },
            { id: 'legal', label: 'Legal', icon: FileText },
          ].map(tab => {
            const IconComp = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${
                  activeTab === tab.id
                    ? 'text-primary-400 border-b-primary-400'
                    : 'text-[var(--text-muted)] border-b-transparent hover:text-[var(--text)]'
                }`}
              >
                <IconComp className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'branding' && (
              <motion.div
                key="branding"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <BrandingTab
                  settings={settings}
                  onSave={handleSaveTab}
                  isSaving={saveMut.isPending}
                />
              </motion.div>
            )}

            {activeTab === 'operations' && (
              <motion.div
                key="operations"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <OperationsTab
                  settings={settings}
                  onSave={handleSaveTab}
                  isSaving={saveMut.isPending}
                />
              </motion.div>
            )}

            {activeTab === 'integrations' && (
              <motion.div
                key="integrations"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <IntegrationsTab
                  settings={settings}
                  onSave={handleSaveTab}
                  isSaving={saveMut.isPending}
                />
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div
                key="security"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <SecurityTab
                  settings={settings}
                  onSave={handleSaveTab}
                  isSaving={saveMut.isPending}
                />
              </motion.div>
            )}

            {activeTab === 'legal' && (
              <motion.div
                key="legal"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <LegalTab
                  settings={settings}
                  onSave={handleSaveTab}
                  isSaving={saveMut.isPending}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
