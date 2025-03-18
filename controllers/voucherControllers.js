const Voucher = require('../models/voucherModels');


// Apply a voucher
exports.applyVoucher = async (req, res) => {
    try {
        const { code } = req.body;
        const voucher = await Voucher.findOne({ code });

        if (!voucher) {
            return res.status(404).json({ status: 404, success: false, message: "Voucher not found", data: null });
        }

        if (!voucher.isValid()) {
            return res.status(400).json({ status: 400, success: false, message: "Voucher is not valid or expired", data: null });
        }

        voucher.usedCount += 1;
        if (voucher.usedCount >= voucher.usageLimit) {
            voucher.isActive = false;
        }

        await voucher.save();
        return res.status(200).json({ status: 200, success: true, message: "Voucher applied successfully", data: voucher });
    } catch (error) {
        return res.status(500).json({ status: 500, success: false, message: "Server error", data: error.message });
    }
};

// Create a new voucher
exports.createVoucher = async (req, res) => {
    try {
        const { code, startDate, endDate, usageLimit } = req.body;
        const existingVoucher = await Voucher.findOne({ code });

        if (existingVoucher) {
            return res.status(400).json({ status: 400, success: false, message: "Voucher code already exists", data: null });
        }

        const newVoucher = new Voucher({ code, startDate, endDate, usageLimit });
        await newVoucher.save();
        return res.status(201).json({ status: 201, success: true, message: "Voucher created successfully", data: newVoucher });
    } catch (error) {
        return res.status(500).json({ status: 500, success: false, message: "Server error", data: error.message });
    }
};

// Get all vouchers
exports.getVouchers = async (req, res) => {
    try {
        const vouchers = await Voucher.find();
        return res.status(200).json({ status: 200, success: true, message: "Vouchers retrieved successfully", data: vouchers });
    } catch (error) {
        return res.status(500).json({ status: 500, success: false, message: "Server error", data: error.message });
    }
};

// Delete a voucher
exports.deleteVoucher = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedVoucher = await Voucher.findByIdAndDelete(id);

        if (!deletedVoucher) {
            return res.status(404).json({ status: 404, success: false, message: "Voucher not found", data: null });
        }

        return res.status(200).json({ status: 200, success: true, message: "Voucher deleted successfully", data: deletedVoucher });
    } catch (error) {
        return res.status(500).json({ status: 500, success: false, message: "Server error", data: error.message });
    }
};


//update voucher 

exports.updateVoucher = async (req, res) => {
    try {
      const { id } = req.params;
      const { code, startDate, endDate, usageLimit } = req.body;

      const voucher = await Voucher.findById(id);
      if (!voucher) {
        return res.status(404).json({
          status: 404,
          success: false,
          message: "Voucher not found",
          data: null,
        });
      }
  
      if (code && code !== voucher.code) {
        const existingVoucher = await Voucher.findOne({ code });
        if (existingVoucher) {
          return res.status(400).json({
            status: 400,
            success: false,
            message: "Voucher code already exists",
            data: null,
          });
        }
        voucher.code = code;
      }
  
      voucher.startDate = startDate || voucher.startDate;
      voucher.endDate = endDate || voucher.endDate;
      voucher.usageLimit = usageLimit || voucher.usageLimit;
  
      await voucher.save();
  
      return res.status(200).json({
        status: 200,
        success: true,
        message: "Voucher updated successfully",
        data: voucher,
      });
    } catch (error) {
      return res.status(500).json({
        status: 500,
        success: false,
        message: "Server error",
        data: error.message,
      });
    }
  };
  