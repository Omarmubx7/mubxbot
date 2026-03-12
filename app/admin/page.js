"use client";

import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Plus, Edit2, Trash2, Search, ArrowLeft, Mail, RefreshCw } from "lucide-react";
import { useDoctors } from "../../components/Providers.jsx";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { AdminHeader } from '../../components/AdminHeader.jsx';
import { useAutoSync, AutoSyncControls } from '../../components/AutoSyncControls.jsx';

const DOCTORS_CACHE_KEY = 'mubx_doctors_cache_v1';

const Modal = ({ title, isOpen, onClose, children }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-md"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg glass-surface rounded-t-[28px] sm:rounded-[32px] shadow-2xl overflow-hidden border border-white/20 max-h-[92dvh]"
        >
          <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-black/[0.03] dark:border-white/[0.05] flex items-center justify-between bg-white/20 dark:bg-black/20">
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--text-primary)]">{title}</h3>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-[var(--text-tertiary)]">✕</button>
          </div>
          <div className="px-4 sm:px-8 py-5 sm:py-8 overflow-y-auto max-h-[calc(92dvh-88px)] no-scrollbar">
            {children}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

Modal.propTypes = {
  title: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired
};

function ClickableEmail({ email, className = '' }) {
  return (
    <a href={`mailto:${email}`} className={className}>
      {email}
    </a>
  );
}

ClickableEmail.propTypes = {
  email: PropTypes.string.isRequired,
  className: PropTypes.string
};

export default function AdminPage() {
  const { instructors, setInstructors, loading } = useDoctors() || { instructors: [], loading: true };
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDoctor, setCurrentDoctor] = useState(null);
  const [isDeleting, setIsDeleting] = useState(null);

  const refreshInstructors = async () => {
    const response = await fetch('/api/doctors');
    if (!response.ok) return;

    const data = await response.json();
    setInstructors(data);
    try {
      globalThis.localStorage.setItem(DOCTORS_CACHE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Storage write disabled', e);
    }
  };

  const {
    autoSyncEnabled,
    setAutoSyncEnabled,
    syncIntervalSec,
    setSyncIntervalSec,
    syncCountdown,
    lastSyncedAt,
    syncing,
    performSync
  } = useAutoSync(refreshInstructors, 15);

  const [formData, setFormData] = useState({
    name: "", school: "School of Computing and Informatics", department: "", email: "", office: "",
    office_hours: { Monday: "", Tuesday: "", Wednesday: "", Thursday: "", Friday: "" }
  });

  const handleOpenAdd = () => {
    setCurrentDoctor(null);
    setFormData({
      name: "", school: "School of Computing and Informatics", department: "", email: "", office: "",
      office_hours: { Monday: "", Tuesday: "", Wednesday: "", Thursday: "", Friday: "" }
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (doc) => {
    setCurrentDoctor(doc);
    setFormData({ ...doc });
    setIsModalOpen(true);
  };

  const persistInstructorsLocally = (nextInstructors) => {
    setInstructors(nextInstructors);
    globalThis.localStorage.setItem(DOCTORS_CACHE_KEY, JSON.stringify(nextInstructors));
  };

  const upsertDoctorInList = (doctors, doctor) => {
    const key = String(doctor?.name || '').trim().toLowerCase();
    if (!key) return doctors;

    const filtered = doctors.filter(item => String(item?.name || '').trim().toLowerCase() !== key);
    return [...filtered, doctor];
  };

  const removeDoctorFromList = (doctors, doctorName) => {
    const key = String(doctorName || '').trim().toLowerCase();
    if (!key) return doctors;
    return doctors.filter(item => String(item?.name || '').trim().toLowerCase() !== key);
  };

  const requestDoctorMutation = async (method, payload) => {
    const response = await fetch('/api/admin/doctors', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let message = 'Request failed';

      try {
        const body = await response.json();
        message = body?.error || body?.details || message;
      } catch {
        message = await response.text();
      }

      throw new Error(message || 'Request failed');
    }

    return response;
  };

  const saveExistingDoctor = async () => {
    const nameChanged = formData.name === currentDoctor.name;

    if (nameChanged) {
      await requestDoctorMutation('PUT', formData);
      return;
    }

    await requestDoctorMutation('DELETE', { name: currentDoctor.name });
    await requestDoctorMutation('POST', formData);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (currentDoctor) {
        await saveExistingDoctor();
      } else {
        await requestDoctorMutation('POST', formData);
      }

      await refreshInstructors();
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      const message = String(err?.message || err || '');

      if (/read-only/i.test(message)) {
        let nextInstructors = instructors;

        if (currentDoctor && String(currentDoctor.name).trim().toLowerCase() !== String(formData.name).trim().toLowerCase()) {
          nextInstructors = removeDoctorFromList(nextInstructors, currentDoctor.name);
        }

        nextInstructors = upsertDoctorInList(nextInstructors, formData);
        persistInstructorsLocally(nextInstructors);
        setIsModalOpen(false);
        alert('Saved locally in this browser. Server storage is read-only in this deployment.');
        return;
      }

      alert('Failed to save: ' + (err.message || err));
    }
  };

  const handleDelete = async (name) => {
    if (!confirm(`Delete ${name}?`)) { setIsDeleting(null); return; }
    try {
      await requestDoctorMutation('DELETE', { name });
      await refreshInstructors();
      setIsDeleting(null);
    } catch (err) {
      console.error(err);
      const message = String(err?.message || err || '');

      if (/read-only/i.test(message)) {
        const nextInstructors = removeDoctorFromList(instructors, name);
        persistInstructorsLocally(nextInstructors);
        setIsDeleting(null);
        alert('Deleted locally in this browser. Server storage is read-only in this deployment.');
        return;
      }

      alert('Failed to delete: ' + (err.message || err));
      setIsDeleting(null);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error(error);
    }

    globalThis.location.href = '/admin-login';
  };

  const filtered = instructors.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    performSync();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  if (loading) {
    return (
      <div className="min-h-dvh w-full flex items-center justify-center bg-[#F2F2F7] dark:bg-[#000000] px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-red-500/20 border-t-red-500 animate-spin" />
          <p className="text-[var(--text-secondary)] font-medium animate-pulse tracking-tight">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh w-full overflow-y-auto no-scrollbar relative font-sans bg-[#F2F2F7] dark:bg-[#000000]">
      {/* Premium Apple Header */}
      <div className="sticky top-0 z-50 px-4 sm:px-6 md:px-10 py-4 sm:py-6 glass-surface border-b border-black/[0.03] dark:border-white/[0.05] pt-safe backdrop-blur-3xl">
        <div className="max-w-6xl mx-auto">
          <AdminHeader title="Control Center" onLogout={handleLogout} />
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-10 space-y-6 sm:space-y-8 pb-20 sm:pb-32">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            {/* Spotlight Search */}
            <div className="glass-card rounded-[24px] sm:rounded-[28px] border-black/[0.03] dark:border-white/[0.05] p-2 sm:p-3 shadow-sm focus-within:ring-4 focus-within:ring-[var(--primary)]/10 transition-all">
              <div className="flex items-center gap-3 px-3">
                <Search className="text-[var(--text-tertiary)]" size={20} />
                <input type="text" placeholder="Search directory..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 bg-transparent border-none min-h-[40px] text-[15px] font-medium text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none"
                />
                <div className="px-3 py-1.5 bg-black/5 dark:bg-white/10 rounded-full text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-widest hidden sm:block">
                  {filtered.length}
                </div>
              </div>
            </div>
          </div>
          
          <button onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 bg-gradient-to-br from-[#DC2626] to-[#B91C1C] text-white px-6 py-4 rounded-[24px] sm:rounded-[28px] font-bold shadow-lg shadow-[#DC2626]/20 hover:scale-[1.02] active:scale-95 transition-all w-full sm:w-auto"
          >
            <Plus size={20} strokeWidth={2.5} /> New Instructor
          </button>
        </div>

        {/* Sync Controls */}
        <AutoSyncControls
          autoSyncEnabled={autoSyncEnabled}
          setAutoSyncEnabled={setAutoSyncEnabled}
          syncIntervalSec={syncIntervalSec}
          setSyncIntervalSec={setSyncIntervalSec}
          syncCountdown={syncCountdown}
          lastSyncedAt={lastSyncedAt}
          syncing={syncing}
          onRefresh={performSync}
        />

        {/* Table View */}
        <div className="glass-surface rounded-[24px] sm:rounded-[32px] border-black/[0.03] dark:border-white/[0.05] overflow-hidden shadow-2xl">
          <div className="sm:hidden p-4 space-y-3">
            {filtered.map((doc) => (
              <div key={doc.name} className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/40 dark:bg-black/20 p-4 space-y-3">
                <div>
                  <div className="font-bold text-[16px] text-[var(--text-primary)] leading-tight">{doc.name}</div>
                  <div className="flex items-center gap-2 mt-2 opacity-70 text-[var(--text-primary)] break-all">
                    <Mail size={12} /> <ClickableEmail email={doc.email} className="text-[12px] font-medium underline decoration-transparent hover:decoration-current" />
                  </div>
                </div>
                <div>
                  <span className="bg-[var(--primary)]/10 text-[var(--primary)] text-[12px] font-bold px-3 py-1 rounded-full inline-flex">
                    {doc.department}
                  </span>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleOpenEdit(doc)} className="flex-1 min-h-11 rounded-2xl bg-white/60 dark:bg-white/10 hover:bg-[var(--primary)] text-[var(--text-primary)] hover:text-white flex items-center justify-center gap-2 transition-all shadow-sm"><Edit2 size={16} /> Edit</button>
                  <button onClick={() => setIsDeleting(doc.name)} className="flex-1 min-h-11 rounded-2xl bg-white/60 dark:bg-white/10 hover:bg-[#FF3B30] text-[var(--text-primary)] hover:text-white flex items-center justify-center gap-2 transition-all shadow-sm"><Trash2 size={16} /> Delete</button>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
                  <th className="px-8 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Instructor</th>
                  <th className="px-8 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Department</th>
                  <th className="px-8 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-tertiary)] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.03] dark:divide-white/[0.05]">
                {filtered.map((doc) => (
                  <tr key={doc.name} className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="font-bold text-[16px] text-[var(--text-primary)] leading-tight">{doc.name}</div>
                      <div className="flex items-center gap-2 mt-1.5 opacity-60 text-[var(--text-primary)]">
                        <Mail size={12} /> <ClickableEmail email={doc.email} className="text-[13px] font-medium underline decoration-transparent hover:decoration-current" />
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="bg-[var(--primary)]/10 text-[var(--primary)] text-[12px] font-bold px-3 py-1 rounded-full whitespace-nowrap">
                        {doc.department}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenEdit(doc)} className="w-10 h-10 rounded-full bg-white/50 dark:bg-white/10 hover:bg-[var(--primary)] text-[var(--text-primary)] hover:text-white flex items-center justify-center transition-all shadow-sm"><Edit2 size={16} /></button>
                        <button onClick={() => setIsDeleting(doc.name)} className="w-10 h-10 rounded-full bg-white/50 dark:bg-white/10 hover:bg-[#FF3B30] text-[var(--text-primary)] hover:text-white flex items-center justify-center transition-all shadow-sm"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="py-16 sm:py-24 text-center px-4">
              <div className="w-20 h-20 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto mb-6">
                <Search size={32} className="text-[var(--text-tertiary)] opacity-30" />
              </div>
              <h3 className="text-[20px] font-bold text-[var(--text-primary)]">No matching results</h3>
              <p className="text-[15px] text-[var(--text-secondary)] mt-2 font-medium">Try adjusting your filters or adding a new entry.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal title={currentDoctor ? "Edit Instructor" : "Add New Instructor"} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="doctor-name" className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--text-tertiary)] px-1">Full Identity</label>
            <input id="doctor-name" required className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-[var(--primary)]/30 transition-all font-medium text-[var(--text-primary)]"
              value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Name" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="doctor-department" className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--text-tertiary)] px-1">Department</label>
              <input id="doctor-department" required className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-[var(--primary)]/30 transition-all font-medium text-[var(--text-primary)]"
                value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} placeholder="Dept." />
            </div>
            <div className="space-y-2">
              <label htmlFor="doctor-office" className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--text-tertiary)] px-1">Office</label>
              <input id="doctor-office" required className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-[var(--primary)]/30 transition-all font-medium text-[var(--text-primary)]"
                value={formData.office} onChange={(e) => setFormData({...formData, office: e.target.value})} placeholder="Room" />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="doctor-email" className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--text-tertiary)] px-1">Digital Address</label>
            <input id="doctor-email" required type="email" className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-[var(--primary)]/30 transition-all font-medium text-[var(--text-primary)]"
              value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="Email" />
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-4 rounded-2xl font-bold bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all text-[var(--text-primary)]">Cancel</button>
            <button type="submit" className="flex-1 px-6 py-4 rounded-2xl font-bold bg-[#DC2626] text-white shadow-lg shadow-[#DC2626]/20 hover:scale-[1.02] active:scale-95 transition-all">{currentDoctor ? "Update" : "Save"}</button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal title="Warning" isOpen={!!isDeleting} onClose={() => setIsDeleting(null)}>
        <div className="space-y-8 text-center py-4">
          <div className="w-20 h-20 bg-[#FF3B30]/10 text-[#FF3B30] rounded-full flex items-center justify-center mx-auto shadow-sm">
            <Trash2 size={36} strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-[17px] font-medium opacity-80 leading-relaxed text-[var(--text-primary)]">
              Are you sure you want to remove <span className="font-bold">{isDeleting}</span> from the directory?
            </p>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4">
            <button onClick={() => setIsDeleting(null)} className="flex-1 px-6 py-4 rounded-2xl font-bold bg-black/5 dark:bg-white/5 hover:bg-black/10 transition-all text-[var(--text-primary)]">Keep</button>
            <button onClick={() => handleDelete(isDeleting)} className="flex-1 px-6 py-4 rounded-2xl font-bold bg-[#FF3B30] text-white shadow-lg shadow-[#FF3B30]/20 hover:scale-[1.02] active:scale-95 transition-all">Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
