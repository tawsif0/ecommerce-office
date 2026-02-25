const PaymentMethod = require("../models/PaymentMethod");

// Get all payment methods (public)
exports.getPaymentMethods = async (req, res) => {
  try {
    const paymentMethods = await PaymentMethod.find({ isActive: true })
      .select("type accountNo createdAt")
      .sort({ createdAt: -1 });

    res.json(paymentMethods);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all payment methods (admin)
exports.getAllPaymentMethods = async (req, res) => {
  try {
    const user = req.user;
    if (user.userType !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const paymentMethods = await PaymentMethod.find().sort({ createdAt: -1 });

    res.json(paymentMethods);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add new payment method
exports.addPaymentMethod = async (req, res) => {
  try {
    const user = req.user;
    if (user.userType !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { type, accountNo } = req.body;

    if (!type || !accountNo) {
      return res
        .status(400)
        .json({ error: "Type and account number are required" });
    }

    const paymentMethod = new PaymentMethod({
      type: type.trim(),
      accountNo: accountNo.trim(),
      createdBy: user._id,
    });

    await paymentMethod.save();
    res.status(201).json(paymentMethod);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update payment method
exports.updatePaymentMethod = async (req, res) => {
  try {
    const user = req.user;
    if (user.userType !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { id } = req.params;
    const { type, accountNo, isActive } = req.body;

    const paymentMethod = await PaymentMethod.findById(id);
    if (!paymentMethod) {
      return res.status(404).json({ error: "Payment method not found" });
    }

    if (type !== undefined) paymentMethod.type = type.trim();
    if (accountNo !== undefined) paymentMethod.accountNo = accountNo.trim();
    if (isActive !== undefined) paymentMethod.isActive = isActive;

    paymentMethod.updatedBy = user._id;
    paymentMethod.updatedAt = new Date();

    await paymentMethod.save();
    res.json(paymentMethod);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete payment method
exports.deletePaymentMethod = async (req, res) => {
  try {
    const user = req.user;
    if (user.userType !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { id } = req.params;

    const paymentMethod = await PaymentMethod.findById(id);
    if (!paymentMethod) {
      return res.status(404).json({ error: "Payment method not found" });
    }

    await paymentMethod.deleteOne();
    res.json({ message: "Payment method deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
