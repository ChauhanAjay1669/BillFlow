import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useNotification } from '../../context/NotificationContext';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  LayoutTemplate,
  Plus,
  Eye,
  Check,
  Copy,
  Trash2,
  Palette,
  CheckCircle2,
} from 'lucide-react';

export const TemplateGallery = () => {
  const [systemTemplates, setSystemTemplates] = useState([]);
  const [customTemplates, setCustomTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  const { success, error: showError } = useNotification();
  const navigate = useNavigate();

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await api.get('/templates');
      if (res.data.success) {
        setSystemTemplates(res.data.systemTemplates || []);
        setCustomTemplates(res.data.customTemplates || []);
      }
    } catch (err) {
      showError(err.message || 'Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSetDefault = async (tmpl) => {
    try {
      if (tmpl.isSystem) {
        await api.put('/business', {
          primaryColor: tmpl.styles?.primaryColor,
          defaultFont: tmpl.styles?.fontFamily,
          defaultTemplateId: tmpl.slug,
        });
      } else {
        await api.post(`/templates/${tmpl._id}/set-default`);
      }
      success(`"${tmpl.name}" set as your default template!`);
      fetchTemplates();
    } catch (err) {
      showError('Failed to set default template');
    }
  };

  const handleDuplicate = async (tmpl) => {
    try {
      const res = await api.post(`/templates/${tmpl._id}/duplicate`);
      if (res.data.success) {
        success('Template duplicated');
        fetchTemplates();
      }
    } catch (err) {
      showError('Failed to duplicate');
    }
  };

  const handleDelete = async (tmpl) => {
    try {
      const res = await api.delete(`/templates/${tmpl._id}`);
      if (res.data.success) {
        success('Custom template deleted');
        fetchTemplates();
      }
    } catch (err) {
      showError('Failed to delete template');
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading template library..." size="lg" />;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Invoice Templates
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Choose from 8 distinct layout designs or create a bespoke template in the designer.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={Palette}
          onClick={() => navigate('/designer')}
        >
          Open Visual Designer
        </Button>
      </div>

      {/* System Templates Gallery */}
      <div className="space-y-4">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Standard Built-in Templates (8 Styles)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {systemTemplates.map((tmpl) => (
            <div
              key={tmpl.slug}
              className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between interactive-card group"
            >
              <div className="p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: tmpl.styles?.primaryColor || '#2563EB' }}
                  />
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    {tmpl.pageSize}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {tmpl.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {tmpl.description}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setPreviewTemplate(tmpl)}
                  className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 rounded-lg hover:bg-white flex items-center gap-1 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" /> Preview
                </button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/designer')}
                >
                  Customize
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom User Templates */}
      {customTemplates.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-slate-200">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Your Custom Saved Templates ({customTemplates.length})
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {customTemplates.map((tmpl) => (
              <div
                key={tmpl._id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between"
              >
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: tmpl.styles?.primaryColor || '#2563EB' }}
                    />
                    {tmpl.isDefault && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Default
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{tmpl.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{tmpl.description || 'Custom template'}</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDuplicate(tmpl)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(tmpl)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleSetDefault(tmpl)}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Set Default
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <Modal
        isOpen={!!previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        title={`Template Preview: ${previewTemplate?.name}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <span className="font-bold text-sm" style={{ color: previewTemplate?.styles?.primaryColor }}>
                Apex Enterprises
              </span>
              <span className="font-black text-sm uppercase">TAX INVOICE</span>
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <div><b>Font:</b> {previewTemplate?.styles?.fontFamily || 'Inter'}</div>
              <div><b>Format:</b> {previewTemplate?.pageSize || 'A4'}</div>
              <div><b>Style:</b> {previewTemplate?.description}</div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="md" onClick={() => setPreviewTemplate(null)}>
              Close
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setPreviewTemplate(null);
                navigate('/designer');
              }}
            >
              Open in Designer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
