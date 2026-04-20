import React, { useState } from 'react';
import { Mail, Phone, ArrowRight, ShieldCheck } from 'lucide-react';

const SessionSetup = ({ onComplete }) => {
  const [formData, setFormData] = useState({
    motherEmail: '',
    motherPhone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill from existing localStorage config on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('smart_cradle_config');
      if (saved) {
        const config = JSON.parse(saved);
        setFormData({
          motherEmail: config.motherEmail || '',
          motherPhone: config.motherPhone || '',
        });
      }
    } catch (err) {}
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const config = {
      motherEmail: formData.motherEmail,
      motherPhone: formData.motherPhone,
    };

    // Save directly to localStorage
    localStorage.setItem('smart_cradle_config', JSON.stringify(config));
    localStorage.setItem('smart_cradle_setup_done', 'true');
    onComplete(config);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
      <div className="w-full max-w-md bg-[#0f111a] border border-white/5 rounded-[2rem] overflow-hidden shadow-[0_0_50px_rgba(79,70,229,0.15)] animate-in fade-in zoom-in duration-500">
        <div className="p-10 pb-6 text-center">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 items-center justify-center mb-6">
            <ShieldCheck className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Alert Setup</h1>
          <p className="text-slate-500 text-sm">Enter where to send emergency alerts</p>
        </div>

        <form onSubmit={handleSubmit} className="px-10 pb-10 space-y-5">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl text-center">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Mother's Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
                <input
                  type="email"
                  required
                  placeholder="mother@gmail.com"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all text-sm"
                  value={formData.motherEmail}
                  onChange={(e) => setFormData({ ...formData, motherEmail: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Mother's Phone (WhatsApp)</label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
                <input
                  type="tel"
                  required
                  placeholder="e.g. 917995424390"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all text-sm"
                  value={formData.motherPhone}
                  onChange={(e) => setFormData({ ...formData, motherPhone: e.target.value })}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-2xl shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 group transition-all"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Start Monitoring
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SessionSetup;
