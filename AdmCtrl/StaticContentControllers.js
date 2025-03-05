const StaticContent = require('../models/StaticContentModel');

// Get content by section
exports.getContent = async (req, res) => {
  try {
    const { section } = req.params;
    const content = await StaticContent.findOne({ section });
    if (!content) {
      return res.status(404).json({ message: 'Content not found' });
    }
    res.json(content);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// Create or update content
exports.upsertContent = async (req, res) => {
  try {
    const { section, content } = req.body;
    const updatedContent = await StaticContent.findOneAndUpdate(
      { section },
      { content, updatedAt: Date.now() },
      { new: true, upsert: true }
    );
    res.json(updatedContent);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};



// wab
exports.getStaticContent = async (req, res) => {
  try {
    const { section } = req.params;

    // Map short section names to full names
    const sectionMap = {
      "About": "about",
      "Conditions": "terms",
      "Policy": "privacy"
    };

    const fullSectionName = sectionMap[section];

    if (!fullSectionName) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Invalid section name",
      });
    }

    const content = await StaticContent.findOne({ section: fullSectionName });

    if (!content) {
      return res.status(200).json({
        status: 200,
        success: true,
        message: "No data available for this search",
        data: {}
      });
    }

    res.json({
      status: 200,
      success: true,
      message: "Content retrieved successfully",
      data: {
        section: content.section,
        content: content.content
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      success: false,
      message: "Server error",
      error
    });
  }
};
