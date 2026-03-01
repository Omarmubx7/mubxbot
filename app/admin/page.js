"use client";

import React, { useState } from "react";
import { Plus, Edit2, Trash2, Search, ArrowLeft, Mail, MapPin, School, User } from "lucide-react";
import { useDoctors } from "../../components/Providers.jsx";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const Modal = ({ title, isOpen, onClose, children }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
        >
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
          </div>
          <div className="px-6 py-6 overflow-y-auto max-h-[80vh]">
            {children}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export default function AdminPage() {
  const { instructors, setInstructors, loading } = useDoctors();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDoctor, setCurrentDoctor] = useState(null);
  const [isDeleting, setIsDeleting] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    school: "School of Computing and Informatics",
    department: "",
    email: "",
    office: "",
    office_hours: {
      Monday: "",
      Tuesday: "",
      Wednesday: "",
      Thursday: "",
      Friday: ""
    }
  });

  const handleOpenAdd = () => {
    setCurrentDoctor(null);
    setFormData({
      name: "",
      school: "School of Computing and Informatics",
      department: "",
      email: "",
      office: "",
      office_hours: {
        Monday: "",
        Tuesday: "",
        Wednesday: "",
        Thursday: "",
        Friday: ""
      }
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (doc) => {
    setCurrentDoctor(doc);
    setFormData({ ...doc });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (currentDoctor) {
      setInstructors(prev => prev.map(d => d.name === currentDoctor.name ? formData : d));
    } else {
      setInstructors(prev => [...prev, formData]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (name) => {
    setInstructors(prev => prev.filter(d => d.name !== name));
    setIsDeleting(null);
  };

  const filtered = instructors.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <Link href="/" className="inline-flex items-center text-sm font-medium text-[var(--primary)] hover:underline mb-2 gap-1">
              <ArrowLeft size={14} /> Back to Chat
            </Link>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Admin Dashboard</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage School of Computing Directory</p>
          </div>
          <button 
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 bg-[var(--primary)] text-white px-6 py-3 rounded-2xl font-bold hover:brightness-110 shadow-lg shadow-[var(--primary)]/20 transition-all active:scale-95"
          >
            <Plus size={20} /> Add Instructor
          </button>
        </div>

        {/* Search & Stats */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search by name or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-[var(--primary)]/30 transition-all"
              />
            </div>
            <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">
              {filtered.length} Instructors Found
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Instructor</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Department</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Contact</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Office</th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {filtered.map((doc) => (
                  <tr key={doc.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 dark:text-white">{doc.name}</div>
                      <div className="text-[11px] text-slate-500">{doc.school}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-[var(--primary)]/10 text-[var(--primary)] text-[10px] font-black uppercase px-2.5 py-1 rounded-full whitespace-nowrap">
                        {doc.department}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                        <Mail size={14} className="opacity-50" /> {doc.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300">
                      {doc.office}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenEdit(doc)}
                          className="p-2 text-slate-400 hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 rounded-xl transition-all"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => setIsDeleting(doc.name)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="py-20 text-center">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">No instructors found</h3>
              <p className="text-slate-500">Try adjusting your search filters</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal 
        title={currentDoctor ? "Edit Instructor" : "Add New Instructor"} 
        isOpen={isModalOpen} 
        onClose={handleCloseModal}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Full Name</label>
            <input 
              required
              className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">Department</label>
              <input 
                required
                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                value={formData.department}
                onChange={(e) => setFormData({...formData, department: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">Office</label>
              <input 
                required
                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                value={formData.office}
                onChange={(e) => setFormData({...formData, office: e.target.value})}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Email Address</label>
            <input 
              required
              type="email"
              className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl p-3 outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>
          
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-3">Office Hours</label>
            <div className="space-y-2">
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(day => (
                <div key={day} className="flex items-center gap-2">
                  <span className="w-24 text-sm font-bold text-slate-500">{day}</span>
                  <input 
                    className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-xl p-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                    placeholder="e.g. 10:00 AM - 12:00 PM"
                    value={formData.office_hours[day]}
                    onChange={(e) => setFormData({
                      ...formData, 
                      office_hours: { ...formData.office_hours, [day]: e.target.value }
                    })}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-6">
            <button 
              type="button"
              onClick={handleCloseModal}
              className="flex-1 px-4 py-3 rounded-2xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:brightness-95 transition-all text-sm"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 px-4 py-3 rounded-2xl font-bold bg-[var(--primary)] text-white hover:brightness-110 shadow-lg shadow-[var(--primary)]/20 transition-all text-sm"
            >
              {currentDoctor ? "Update Instructor" : "Save Instructor"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        title="Confirm Deletion" 
        isOpen={!!isDeleting} 
        onClose={() => setIsDeleting(null)}
      >
        <div className="space-y-6 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <Trash2 size={32} />
          </div>
          <div>
            <p className="text-slate-600 dark:text-slate-300">
              Are you sure you want to delete <span className="font-bold text-slate-900 dark:text-white">{isDeleting}</span>? 
              This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsDeleting(null)}
              className="flex-1 px-4 py-3 rounded-2xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:brightness-95 transition-all text-sm"
            >
              Cancel
            </button>
            <button 
              onClick={() => handleDelete(isDeleting)}
              className="flex-1 px-4 py-3 rounded-2xl font-bold bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all text-sm"
            >
              Delete Permanently
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
