"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

export default function AdminContentPage() {
  const [homeConfig, setHomeConfig] = useState<any>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [sectionContent, setSectionContent] = useState<string>('');

  useEffect(() => {
    fetchHome();
  }, []);

  const fetchHome = async () => {
    try {
      const res = await axios.get('/api/admin/content?type=home');
      setHomeConfig(res.data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load content config");
    }
  };

  const toggleSection = async (id: string, current: boolean) => {
    const newSections = homeConfig.sections.map((s: any) => 
      s.id === id ? { ...s, enabled: !current } : s
    );
    const newConfig = { ...homeConfig, sections: newSections };
    setHomeConfig(newConfig);
    await axios.post('/api/admin/content', { type: 'home', content: newConfig });
  };

  const openEditor = async (id: string) => {
    try {
      const res = await axios.get(`/api/admin/content?type=section&id=${id}`);
      setSectionContent(JSON.stringify(res.data, null, 2));
      setEditingSection(id);
    } catch (e) {
      // If file doesn't exist, start empty
      setSectionContent('{}');
      setEditingSection(id);
    }
  };

  const saveSection = async () => {
    try {
      const parsed = JSON.parse(sectionContent);
      await axios.post('/api/admin/content', { type: 'section', id: editingSection, content: parsed });
      toast.success("Content saved successfully!");
      setEditingSection(null);
    } catch(e) {
      toast.error("Invalid JSON format");
    }
  };

  if (!homeConfig) return <div className="p-10">Loading Admin...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Landing Page Builder</h1>
            <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded text-xs">
                Local Mode: Edits are saved to file system. (Commit to Git to deploy)
            </div>
        </header>
        
        {/* Section List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-700">Page Sections</h2>
            <p className="text-sm text-gray-500">Enable/Disable sections or edit their content.</p>
          </div>
          
          <div className="divide-y">
            {homeConfig.sections.map((section: any) => (
              <div key={section.id} className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${section.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="font-medium text-lg text-gray-800 capitalize">{section.id}</span>
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => openEditor(section.id)}
                    className="px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all font-medium"
                  >
                    Edit Content
                  </button>
                  <button 
                    onClick={() => toggleSection(section.id, section.enabled)}
                    className={`w-20 py-2 text-sm rounded-lg font-medium transition-colors ${section.enabled ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {section.enabled ? 'Active' : 'Hidden'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* JSON Editor Modal */}
        {editingSection && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden">
              <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 capitalize">Edit {editingSection}</h3>
                    <p className="text-xs text-gray-500 mt-1">Modify the JSON configuration below.</p>
                </div>
                <button onClick={() => setEditingSection(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              
              <textarea 
                value={sectionContent}
                onChange={e => setSectionContent(e.target.value)}
                className="flex-1 p-6 font-mono text-sm bg-slate-900 text-slate-200 outline-none resize-none leading-relaxed"
                spellCheck={false}
              />
              
              <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                <button onClick={() => setEditingSection(null)} className="px-6 py-2.5 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-colors">Cancel</button>
                <button onClick={saveSection} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-md transition-all">Save Changes</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
