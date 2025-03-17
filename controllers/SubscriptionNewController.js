const SubscriptionType = require("../models/SubscriptionTypeModel");

// Controller function to create a new subscription type
exports.createSubscriptionType = async (req, res) => {
    try {
      const { type } = req.body;
  
      if (!type) {
        return res.status(400).json({ message: "Type is required" });
      }
  
      const newSubscriptionType = new SubscriptionType({ type });
      await newSubscriptionType.save();
  
      res.status(201).json({ message: "Subscription Type created successfully", data: newSubscriptionType });
    } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
    }
  };