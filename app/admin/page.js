"use client";

import React, { useState } from "react";
import { Plus, Edit2, Trash2, Search, ArrowLeft, Mail, MapPin, Clock } from "lucide-react";
import { useDoctors } from "../../components/Providers.jsx";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const Modal = ({ title, isOpen, onClose, children }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-md"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg glass-surface rounded-[32px] shadow-2xl overflow-hidden border border-white/20"
        >
          <div className="px-8 py-6 border-b border-black/[0.03] dark:border-white/[0.05] flex items-center justify-between bg-white/20 dark:bg-black/20">
            <h3 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">{title}</h3>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-[var(--text-tertiary)]">✕</button>
          </div>
          <div className="px-8 py-8 overflow-y-auto max-h-[70vh] no-scrollbar">
            {children}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export default function AdminPage() {
  const { instructors, setInstructors, loading } = useDoctors() || { instructors: [], loading: true };
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDoctor, setCurrentDoctor] = useState(null);
  const [isDeleting, setIsDeleting] = useState(null);

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

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (currentDoctor) {
        // If the name changed, delete the old record then create the new one
        if (formData.name !== currentDoctor.name) {
          const del = await fetch('/api/admin/doctors', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: currentDoctor.name })
          });
          if (!del.ok) throw new Error(await del.text());

          const post = await fetch('/api/admin/doctors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
          });
          if (!post.ok) throw new Error(await post.text());
        } else {
          const res = await fetch('/api/admin/doctors', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
          });
          if (!res.ok) throw new Error(await res.text());
        }
      } else {
        const res = await fetch('/api/admin/doctors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (!res.ok) throw new Error(await res.text());
      }

      // Refresh list from server
      const r = await fetch('/api/doctors');
      if (r.ok) {
        const data = await r.json();
        setInstructors(data);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save: ' + (err.message || err));
    }
  };

  const handleDelete = async (name) => {
    if (!confirm(`Delete ${name}?`)) { setIsDeleting(null); return; }
    try {
      const res = await fetch('/api/admin/doctors', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (!res.ok) throw new Error(await res.text());

      const r = await fetch('/api/doctors');
      if (r.ok) {
        const data = await r.json();
        setInstructors(data);
      }
      setIsDeleting(null);
    } catch (err) {
      console.error(err);
      alert('Failed to delete: ' + (err.message || err));
      setIsDeleting(null);
    }
  };

  const filtered = instructors.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return null;

  return (
    <div className="h-[100dvh] max-h-[100dvh] overflow-y-auto no-scrollbar relative font-sans">
      {/* Premium Apple Header */}
      <div className="sticky top-0 z-50 px-6 md:px-12 py-6 glass-surface border-b border-black/[0.03] dark:border-white/[0.05] pt-safe backdrop-blur-3xl">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <Link href="/" className="inline-flex items-center text-[13px] font-bold text-[var(--primary)] hover:opacity-70 mb-2 transition-all group">
              <ArrowLeft size={16} className="mr-1 group-hover:-translate-x-1 transition-transform" /> Back to MUBXBot
            </Link>
            <h1 className="text-[32px] font-black tracking-tighter leading-tight text-[var(--text-primary)]">Control Center</h1>
          </div>
          <button onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 bg-gradient-to-br from-[#DC2626] to-[#B91C1C] text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-[#DC2626]/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Plus size={20} strokeWidth={2.5} /> New Instructor
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 md:p-12 space-y-8 pb-32">
        {/* Spotlight Search */}
        <div className="glass-card rounded-[28px] border-black/[0.03] dark:border-white/[0.05] p-3 shadow-sm focus-within:ring-4 focus-within:ring-[var(--primary)]/10 transition-all">
          <div className="flex items-center gap-4 px-4">
            <Search className="text-[var(--text-tertiary)]" size={22} />
            <input type="text" placeholder="Search directory..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent border-none min-h-[48px] text-[18px] font-medium text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none"
            />
            <div className="px-4 py-1.5 bg-black/5 dark:bg-white/10 rounded-full text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
              {filtered.length} FOUND
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="glass-surface rounded-[32px] border-black/[0.03] dark:border-white/[0.05] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
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
                        <Mail size={12} /> <span className="text-[13px] font-medium">{doc.email}</span>
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
            <div className="py-24 text-center">
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
            <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--text-tertiary)] px-1">Full Identity</label>
            <input required className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-[var(--primary)]/30 transition-all font-medium text-[var(--text-primary)]"
              value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--text-tertiary)] px-1">Department</label>
              <input required className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-[var(--primary)]/30 transition-all font-medium text-[var(--text-primary)]"
                value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} placeholder="Dept." />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--text-tertiary)] px-1">Office</label>
              <input required className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-[var(--primary)]/30 transition-all font-medium text-[var(--text-primary)]"
                value={formData.office} onChange={(e) => setFormData({...formData, office: e.target.value})} placeholder="Room" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--text-tertiary)] px-1">Digital Address</label>
            <input required type="email" className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-[var(--primary)]/30 transition-all font-medium text-[var(--text-primary)]"
              value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="Email" />
          </div>
          <div className="flex gap-4 pt-4">
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
          <div className="flex gap-4">
            <button onClick={() => setIsDeleting(null)} className="flex-1 px-6 py-4 rounded-2xl font-bold bg-black/5 dark:bg-white/5 hover:bg-black/10 transition-all text-[var(--text-primary)]">Keep</button>
            <button onClick={() => handleDelete(isDeleting)} className="flex-1 px-6 py-4 rounded-2xl font-bold bg-[#FF3B30] text-white shadow-lg shadow-[#FF3B30]/20 hover:scale-[1.02] active:scale-95 transition-all">Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
