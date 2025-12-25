
import React, { useEffect, useState } from 'react';
import { getAllProfiles, updateProfileAdmin, deleteProfileAdmin } from '../services/authService';
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
      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, [field]: numValue } : p));
    } catch (e) {
      alert("Gagal update limit.");
    }
  };

  const handleAction = async (userId: string, updates: Partial<UserProfile>) => {
    try {
      await updateProfileAdmin(userId, updates);
      await fetchProfiles();
    } catch (e) {
      alert("Gagal kemaskini status.");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Hampa betul ke nak padam akaun ni terus? Akaun ni akan hilang terus dari sistem.")) return;
    try {
      await deleteProfileAdmin(userId);
      await fetchProfiles();
    } catch (e) {
      alert("Gagal memadam profil.");
    }
  };

  const approvedProfiles = profiles.filter(p => p.is_approved);
  const pendingProfiles = profiles.filter(p => !p.is_approved);

  const renderUserTable = (list: UserProfile[], title: string, colorClass: string) => (
    <div className="mb-16">
      <div className="flex items-center gap-4 mb-6">
        <h3 className={`text-sm font-black uppercase tracking-[0.3em] ${colorClass}`}>{title}</h3>
        <div className="flex-1 h-[1px] bg-slate-800/50"></div>
        <span className="text-[10px] font-bold text-slate-500 uppercase">{list.length} Users</span>
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl overflow-x-auto">
        <table className="w-full text-left min-w-[1100px]">
          <thead className="bg-slate-950 border-b border-slate-800">
            <tr>
              <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">User ID</th>
              <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Email</th>
              <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Phone</th>
              <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Password</th>
              <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Usage (Limit)</th>
              <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {list.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-8 py-10 text-center text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                  Tiada pengguna dalam senarai ini.
                </td>
              </tr>
            ) : (
              list.map(profile => (
                <tr key={profile.id} className="hover:bg-white/[0.01] transition-colors group">
                  <td className="px-8 py-6">
                    <div className="text-xs font-bold text-white mb-1">{profile.username}</div>
                    <div className="text-[8px] font-mono text-slate-500 uppercase">Joined: {new Date(profile.created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-xs font-medium text-slate-300">{profile.email}</div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-xs font-bold text-cyan-400">{profile.phone || '-'}</div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-xs font-mono text-slate-400 bg-white/5 px-2 py-1 rounded inline-block">{profile.password}</div>
                  </td>
                  <td className="px-8 py-6 text-center">
                     <div className="flex flex-col items-center gap-2">
                       <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
                         <span className="px-2 text-[9px] font-bold text-slate-600 border-r border-slate-800 bg-slate-900" title="Videos used">V: {profile.videos_used}</span>
                         <input 
                           type="number" 
                           defaultValue={profile.video_limit}
                           onBlur={(e) => handleUpdateLimit(profile.id, 'video_limit', e.target.value)}
                           className="w-16 bg-transparent py-1.5 px-2 text-[10px] text-white text-center outline-none focus:text-cyan-400 transition-all font-black"
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
                          Suspend
                        </button>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleAction(profile.id, { is_approved: true })}
                            className="px-4 py-2 bg-cyan-500 text-slate-950 text-[8px] font-black uppercase tracking-widest rounded-xl hover:bg-cyan-400 transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(profile.id)}
                            className="px-4 py-2 bg-rose-500/10 text-rose-500 text-[8px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      )
                    )}
                    {profile.is_admin && <span className="text-[8px] font-black text-cyan-500 uppercase tracking-widest opacity-50 px-4">Master Account</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#020617] p-4 md:p-12 overflow-y-auto custom-scrollbar">
      <div className="max-w-7xl mx-auto w-full">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">
              Admin <span className="text-cyan-500">Dashboard</span>
            </h2>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
              Monitor Usage & Urus Kelulusan Pengguna (REAL DB)
            </p>
          </div>
          <button 
            onClick={fetchProfiles}
            className="px-6 py-3 bg-slate-900 border border-slate-800 rounded-xl text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-white transition-all"
          >
            Sync All Users
          </button>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {renderUserTable(pendingProfiles, "Pending / New Requests", "text-rose-500")}
            {renderUserTable(approvedProfiles, "Approved Users", "text-cyan-500")}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
