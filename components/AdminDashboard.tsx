
import React, { useEffect, useState } from 'react';
import { getAllProfiles, updateProfileAdmin } from '../services/authService';
import { UserProfile } from '../types';

const AdminDashboard: React.FC = () => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const data = await getAllProfiles();
      setProfiles(data);
    } catch (e) {
      console.error("Gagal ambil profil:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleUpdateLimit = async (userId: string, field: 'video_limit' | 'image_limit', value: string) => {
    const numValue = parseInt(value);
    if (isNaN(numValue)) return;
    try {
      await updateProfileAdmin(userId, { [field]: numValue });
    } catch (e) {
      alert("Gagal update limit.");
    }
  };

  const handleAction = async (userId: string, updates: Partial<UserProfile>) => {
    try {
      await updateProfileAdmin(userId, updates);
      fetchProfiles();
    } catch (e) {
      alert("Gagal kemaskini status.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#020617] p-4 md:p-12 overflow-y-auto custom-scrollbar">
      <div className="max-w-7xl mx-auto w-full">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">
              Admin <span className="text-cyan-500">Control</span>
            </h2>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
              Urus User Approval, ID, Email & Had Penjanaan
            </p>
          </div>
          <button 
            onClick={fetchProfiles}
            className="px-6 py-3 bg-slate-900 border border-slate-800 rounded-xl text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-white transition-all"
          >
            Refresh List
          </button>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
              <thead className="bg-slate-950 border-b border-slate-800">
                <tr>
                  <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">User Details</th>
                  <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Security ID</th>
                  <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Password</th>
                  <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                  <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Video (Limit)</th>
                  <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Image (Limit)</th>
                  <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {profiles.map(profile => (
                  <tr key={profile.id} className="hover:bg-cyan-500/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="text-xs font-bold text-white mb-1">{profile.email}</div>
                      <div className="text-[8px] font-mono text-slate-500 uppercase">Joined: {new Date(profile.created_at).toLocaleDateString()}</div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="text-[8px] font-mono text-slate-600 uppercase break-all max-w-[100px] mx-auto leading-tight">
                        {profile.id}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="text-[10px] text-slate-800 font-mono tracking-tighter" title="Passwords are encrypted for security">
                        ●●●●●●●●
                      </span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={`inline-flex px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${profile.is_approved ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                        {profile.is_approved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-center">
                       <div className="flex flex-col items-center gap-2">
                         <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shadow-inner">
                           <span className="px-2 text-[9px] font-bold text-slate-600 border-r border-slate-800 bg-slate-900">{profile.videos_used}</span>
                           <input 
                             type="number" 
                             defaultValue={profile.video_limit}
                             onBlur={(e) => handleUpdateLimit(profile.id, 'video_limit', e.target.value)}
                             className="w-12 bg-transparent py-1.5 px-2 text-[10px] text-white text-center outline-none focus:text-cyan-400 transition-all font-black"
                           />
                         </div>
                       </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                       <div className="flex flex-col items-center gap-2">
                         <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shadow-inner">
                           <span className="px-2 text-[9px] font-bold text-slate-600 border-r border-slate-800 bg-slate-900">{profile.images_used}</span>
                           <input 
                             type="number" 
                             defaultValue={profile.image_limit}
                             onBlur={(e) => handleUpdateLimit(profile.id, 'image_limit', e.target.value)}
                             className="w-12 bg-transparent py-1.5 px-2 text-[10px] text-white text-center outline-none focus:text-cyan-400 transition-all font-black"
                           />
                         </div>
                       </div>
                    </td>
                    <td className="px-8 py-6 text-right space-x-2">
                      {!profile.is_admin && (
                        profile.is_approved ? (
                          <button 
                            onClick={() => handleAction(profile.id, { is_approved: false })}
                            className="px-4 py-2 bg-rose-500/10 text-rose-500 text-[8px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                          >
                            Reject
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleAction(profile.id, { is_approved: true })}
                            className="px-4 py-2 bg-cyan-500 text-slate-950 text-[8px] font-black uppercase tracking-widest rounded-xl hover:bg-cyan-400 transition-all"
                          >
                            Approve
                          </button>
                        )
                      )}
                      {profile.is_admin && <span className="text-[8px] font-black text-cyan-500 uppercase tracking-widest opacity-50">Master Admin</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="mt-12 p-8 border-t border-slate-900/50 text-center">
          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.3em] max-w-lg mx-auto leading-relaxed">
            Nota Sekuriti: Kata laluan pengguna di-encrypt secara automatik oleh Supabase Auth (Hashed) dan tidak boleh dilihat oleh sesiapa untuk menjaga privasi.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default AdminDashboard;
