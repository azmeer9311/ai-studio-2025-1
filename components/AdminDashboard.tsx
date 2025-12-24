
import React, { useEffect, useState } from 'react';
import { getAllProfiles, updateProfileAdmin } from '../services/authService';
import { UserProfile } from '../types';

const AdminDashboard: React.FC = () => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = async () => {
    setLoading(true);
    const data = await getAllProfiles();
    setProfiles(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleUpdateLimit = async (userId: string, field: 'video_limit' | 'image_limit', value: string) => {
    const numValue = parseInt(value);
    if (isNaN(numValue)) return;
    await updateProfileAdmin(userId, { [field]: numValue });
    // Refresh local state or re-fetch
  };

  const handleAction = async (userId: string, updates: Partial<UserProfile>) => {
    await updateProfileAdmin(userId, updates);
    fetchProfiles();
  };

  return (
    <div className="flex flex-col h-full bg-[#020617] p-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-7xl mx-auto w-full">
        <header className="mb-12">
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">
            Admin <span className="text-cyan-500">Control</span>
          </h2>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            Urus User Approval & Had Penjanaan (Limits)
          </p>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="bg-slate-900/40 border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl">
            <table className="w-full text-left">
              <thead className="bg-slate-950 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">User Details</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Status Approval</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Video Limit</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Image Limit</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {profiles.map(profile => (
                  <tr key={profile.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-6 py-6">
                      <div className="text-xs font-bold text-white mb-1">{profile.email}</div>
                      <div className="text-[8px] font-mono text-slate-600 uppercase">UID: {profile.id}</div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${profile.is_approved ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                        {profile.is_approved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-center">
                       <div className="flex flex-col items-center gap-1">
                         <input 
                           type="number" 
                           defaultValue={profile.video_limit}
                           onBlur={(e) => handleUpdateLimit(profile.id, 'video_limit', e.target.value)}
                           className="w-16 bg-slate-950 border border-slate-800 rounded-lg py-1 px-2 text-xs text-white text-center outline-none focus:border-cyan-500/50 transition-all"
                         />
                         <div className="text-[8px] text-slate-600 uppercase font-bold">Guna: {profile.videos_used}</div>
                       </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                       <div className="flex flex-col items-center gap-1">
                         <input 
                           type="number" 
                           defaultValue={profile.image_limit}
                           onBlur={(e) => handleUpdateLimit(profile.id, 'image_limit', e.target.value)}
                           className="w-16 bg-slate-950 border border-slate-800 rounded-lg py-1 px-2 text-xs text-white text-center outline-none focus:border-cyan-500/50 transition-all"
                         />
                         <div className="text-[8px] text-slate-600 uppercase font-bold">Guna: {profile.images_used}</div>
                       </div>
                    </td>
                    <td className="px-6 py-6 text-right space-x-2">
                      {!profile.is_admin && (
                        profile.is_approved ? (
                          <button 
                            onClick={() => handleAction(profile.id, { is_approved: false })}
                            className="px-4 py-2 bg-rose-500/10 text-rose-500 text-[8px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                          >
                            Reject User
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleAction(profile.id, { is_approved: true })}
                            className="px-4 py-2 bg-cyan-500 text-slate-950 text-[8px] font-black uppercase tracking-widest rounded-xl hover:bg-cyan-400 transition-all"
                          >
                            Approve User
                          </button>
                        )
                      )}
                      {profile.is_admin && <span className="text-[8px] font-black text-slate-600 uppercase">Super Admin</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
