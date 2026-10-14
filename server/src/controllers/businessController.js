import { Business } from '../models/Business.js';
import path from 'path';

export const getBusiness = async (req, res, next) => {
  try {
    const business = await Business.findOne({ userId: req.user._id });
    res.json({ success: true, business });
  } catch (error) {
    next(error);
  }
};

export const updateBusiness = async (req, res, next) => {
  try {
    const currentBiz = await Business.findOne({ userId: req.user._id });
    const updateData = { ...req.body };
    if (req.body.bankDetails && currentBiz?.bankDetails) {
      updateData.bankDetails = {
        ...currentBiz.bankDetails.toObject(),
        ...req.body.bankDetails,
      };
    }

    const business = await Business.findOneAndUpdate(
      { userId: req.user._id },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    res.json({ success: true, message: 'Business settings updated', business });
  } catch (error) {
    next(error);
  }
};

export const uploadAsset = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'Image size must be less than 5MB' });
    }

    const { type } = req.body; // 'logo' | 'signature' | 'stamp' | 'qrCode' | 'upiQr' | 'bankQr'

    // Serverless-safe asset storage: convert buffer to base64 data URI
    let fileUrl = '';
    if (req.file.buffer) {
      const mime = req.file.mimetype || 'image/png';
      fileUrl = `data:${mime};base64,${req.file.buffer.toString('base64')}`;
    } else if (req.file.filename) {
      fileUrl = `/uploads/${req.file.filename}`;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid file upload data' });
    }

    const updateData = {};
    let label = 'Image';

    if (type === 'logo') {
      updateData.logo = fileUrl;
      label = 'Logo';
    } else if (type === 'signature') {
      updateData.signature = fileUrl;
      label = 'Signature';
    } else if (type === 'stamp') {
      updateData.stamp = fileUrl;
      label = 'Stamp';
    } else if (type === 'qrCode' || type === 'upiQr' || type === 'bankQr') {
      updateData['bankDetails.qrCode'] = fileUrl;
      updateData['bankDetails.qrType'] = 'custom';
      label = 'Bank & UPI QR Code';
    } else {
      updateData.logo = fileUrl;
      label = 'Logo';
    }

    const business = await Business.findOneAndUpdate(
      { userId: req.user._id },
      { $set: updateData },
      { new: true }
    );

    res.json({
      success: true,
      message: `${label} uploaded successfully`,
      fileUrl,
      business,
    });
  } catch (error) {
    next(error);
  }
};

export const completeOnboarding = async (req, res, next) => {
  try {
    const data = {
      ...req.body,
      isOnboarded: true,
    };

    const business = await Business.findOneAndUpdate(
      { userId: req.user._id },
      { $set: data },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Onboarding completed successfully! Welcome to BillFlow.',
      business,
    });
  } catch (error) {
    next(error);
  }
};
