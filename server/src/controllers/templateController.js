import mongoose from 'mongoose';
import { InvoiceTemplate } from '../models/InvoiceTemplate.js';
import { Business } from '../models/Business.js';

export const SYSTEM_TEMPLATES = [
  {
    slug: 'classic',
    name: 'Classic Corporate',
    description: 'Timeless business layout with clear borders and traditional header.',
    pageSize: 'A4',
    styles: {
      primaryColor: '#2563EB',
      textColor: '#0F172A',
      fontFamily: 'Inter',
      headerStyle: 'standard',
      borderStyle: 'clean',
    },
    isSystem: true,
  },
  {
    slug: 'modern',
    name: 'Modern Slate',
    description: 'Sleek design with rounded containers, bold totals, and accent badges.',
    pageSize: 'A4',
    styles: {
      primaryColor: '#0EA5E9',
      textColor: '#0F172A',
      fontFamily: 'Poppins',
      headerStyle: 'banner',
      borderStyle: 'rounded',
    },
    isSystem: true,
  },
  {
    slug: 'minimal',
    name: 'Minimal Clean',
    description: 'High whitespace, zero clutter, elegant typography for designers.',
    pageSize: 'A4',
    styles: {
      primaryColor: '#1E293B',
      textColor: '#334155',
      fontFamily: 'Roboto',
      headerStyle: 'minimal',
      borderStyle: 'none',
    },
    isSystem: true,
  },
  {
    slug: 'professional',
    name: 'Professional Emerald',
    description: 'Deep forest green theme built for consulting and legal services.',
    pageSize: 'A4',
    styles: {
      primaryColor: '#059669',
      textColor: '#064E3B',
      fontFamily: 'Montserrat',
      headerStyle: 'standard',
      borderStyle: 'boxed',
    },
    isSystem: true,
  },
  {
    slug: 'gst-standard',
    name: 'GST Tax Standard',
    description: 'Comprehensive tax layout featuring explicit CGST, SGST, IGST columns.',
    pageSize: 'A4',
    styles: {
      primaryColor: '#4F46E5',
      textColor: '#0F172A',
      fontFamily: 'Inter',
      headerStyle: 'standard',
      borderStyle: 'boxed',
    },
    isSystem: true,
  },
  {
    slug: 'retail',
    name: 'Retail Storefront',
    description: 'Dynamic layout with prominent product descriptions and discount callouts.',
    pageSize: 'A4',
    styles: {
      primaryColor: '#D97706',
      textColor: '#1C1917',
      fontFamily: 'Open Sans',
      headerStyle: 'banner',
      borderStyle: 'rounded',
    },
    isSystem: true,
  },
  {
    slug: 'service',
    name: 'Service Agency',
    description: 'Hours & milestone breakdown design for tech firms and agencies.',
    pageSize: 'A4',
    styles: {
      primaryColor: '#7C3AED',
      textColor: '#1E1B4B',
      fontFamily: 'Poppins',
      headerStyle: 'banner',
      borderStyle: 'clean',
    },
    isSystem: true,
  },
  {
    slug: 'compact',
    name: 'Compact Thermal (POS)',
    description: '80mm POS receipt format optimized for fast billing and thermal printing.',
    pageSize: 'Thermal',
    styles: {
      primaryColor: '#18181B',
      textColor: '#09090B',
      fontFamily: 'Roboto',
      headerStyle: 'receipt',
      borderStyle: 'dashed',
    },
    isSystem: true,
  },
];

/**
 * Resolve any template by slug or ID (system or custom).
 * Falls back to business default custom template or 'classic'.
 */
export const resolveTemplate = async (templateId, businessId) => {
  if (!templateId) {
    if (businessId) {
      const defaultCustom = await InvoiceTemplate.findOne({ businessId, isDefault: true });
      if (defaultCustom) return defaultCustom;
    }
    return SYSTEM_TEMPLATES[0]; // 'classic'
  }

  // 1. Check system templates by slug
  const system = SYSTEM_TEMPLATES.find((t) => t.slug === templateId);
  if (system) return system;

  // 2. Check custom templates by _id
  if (businessId && mongoose.isValidObjectId(templateId)) {
    const customById = await InvoiceTemplate.findOne({ _id: templateId, businessId });
    if (customById) return customById;
  }

  // 3. Check custom templates by slug
  if (businessId) {
    const customBySlug = await InvoiceTemplate.findOne({ slug: templateId, businessId });
    if (customBySlug) return customBySlug;
  }

  // 4. Fallback to business default or classic
  if (businessId) {
    const defaultCustom = await InvoiceTemplate.findOne({ businessId, isDefault: true });
    if (defaultCustom) return defaultCustom;
  }

  return SYSTEM_TEMPLATES[0];
};

export const getTemplates = async (req, res, next) => {
  try {
    const customTemplates = await InvoiceTemplate.find({
      businessId: req.business._id,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      systemTemplates: SYSTEM_TEMPLATES,
      customTemplates,
    });
  } catch (error) {
    next(error);
  }
};

export const getTemplateById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check system templates first
    const system = SYSTEM_TEMPLATES.find((t) => t.slug === id);
    if (system) {
      return res.json({ success: true, template: system });
    }

    const template = await InvoiceTemplate.findOne({
      _id: id,
      businessId: req.business._id,
    });

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    res.json({ success: true, template });
  } catch (error) {
    next(error);
  }
};

export const createTemplate = async (req, res, next) => {
  try {
    const { name, description, pageSize, styles, elements } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Template name is required' });
    }

    const template = await InvoiceTemplate.create({
      businessId: req.business._id,
      slug: `custom-${Date.now()}`,
      name,
      description: description || '',
      pageSize: pageSize || 'A4',
      styles: styles || {},
      elements: elements || [],
      isDefault: Boolean(req.body.isDefault),
    });

    if (req.body.isDefault) {
      await InvoiceTemplate.updateMany(
        { businessId: req.business._id, _id: { $ne: template._id } },
        { isDefault: false }
      );
      if (styles?.primaryColor) {
        await Business.findByIdAndUpdate(req.business._id, {
          primaryColor: styles.primaryColor,
          defaultFont: styles.fontFamily || 'Inter',
          defaultTemplateId: template._id.toString(),
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Custom template saved successfully',
      template,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTemplate = async (req, res, next) => {
  try {
    const template = await InvoiceTemplate.findOneAndUpdate(
      { _id: req.params.id, businessId: req.business._id },
      { $set: req.body },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    res.json({ success: true, message: 'Template updated successfully', template });
  } catch (error) {
    next(error);
  }
};

export const duplicateTemplate = async (req, res, next) => {
  try {
    const original = await InvoiceTemplate.findOne({
      _id: req.params.id,
      businessId: req.business._id,
    });

    if (!original) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    const duplicate = await InvoiceTemplate.create({
      businessId: req.business._id,
      slug: `custom-${Date.now()}`,
      name: `${original.name} (Copy)`,
      description: original.description,
      pageSize: original.pageSize,
      styles: original.styles,
      elements: original.elements,
      isDefault: false,
    });

    res.status(201).json({ success: true, message: 'Template duplicated', template: duplicate });
  } catch (error) {
    next(error);
  }
};

export const deleteTemplate = async (req, res, next) => {
  try {
    const template = await InvoiceTemplate.findOneAndDelete({
      _id: req.params.id,
      businessId: req.business._id,
    });

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    res.json({ success: true, message: 'Template deleted' });
  } catch (error) {
    next(error);
  }
};

export const setDefaultTemplate = async (req, res, next) => {
  try {
    await InvoiceTemplate.updateMany({ businessId: req.business._id }, { isDefault: false });
    const template = await InvoiceTemplate.findOneAndUpdate(
      { _id: req.params.id, businessId: req.business._id },
      { isDefault: true },
      { new: true }
    );

    if (template?.styles?.primaryColor) {
      await Business.findByIdAndUpdate(req.business._id, {
        primaryColor: template.styles.primaryColor,
        defaultFont: template.styles.fontFamily || 'Inter',
        defaultTemplateId: template._id.toString(),
      });
    }

    res.json({ success: true, message: 'Default template updated', template });
  } catch (error) {
    next(error);
  }
};
