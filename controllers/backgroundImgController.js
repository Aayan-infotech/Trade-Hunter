const BackgroundImg = require("../models/backgroundImgModel");



exports.uploadBackgroundImg = async (req, res) => {
    try {
      const { userType, userId } = req.body;
      
      // Validate required fields
      if (!userType || !userId) {
        return res.status(400).json({ 
          status: 400, 
          success: false, 
          message: "userType and userId are required", 
          data: [] 
        });
      }
      
      // Validate file upload
      if (!req.fileLocations || req.fileLocations.length === 0) {
        return res.status(400).json({ 
          status: 400, 
          success: false, 
          message: "No image uploaded", 
          data: [] 
        });
      }
      
      const imageUrl = req.fileLocations[0];
      
      let backgroundImgRecord = await BackgroundImg.findOne({ userType, userId });
      
      if (backgroundImgRecord) {
        backgroundImgRecord.backgroundImg = imageUrl;
        await backgroundImgRecord.save();
        return res.status(200).json({ 
          status: 200, 
          success: true, 
          message: "Background image updated successfully", 
          data: [backgroundImgRecord] 
        });
      } else {
        const newBackgroundImg = new BackgroundImg({
          backgroundImg: imageUrl,
          userType,
          userId
        });
        await newBackgroundImg.save();
        return res.status(201).json({ 
          status: 201, 
          success: true, 
          message: "Background image uploaded successfully", 
          data: [newBackgroundImg] 
        });
      }
    } catch (error) {
      return res.status(500).json({ 
        status: 500, 
        success: false, 
        message: error.message, 
        data: [] 
      });
    }
  };
  

  exports.getBackgroundImg = async (req, res) => {
    try {
        const { userId } = req.params;
        const backgroundImg = await BackgroundImg.findOne({ userId });

        if (!backgroundImg) {
            return res.status(201).json({
                status: 201,
                success: true,
                message: "No background image found for this user",
                data: []
            });
        }

        return res.status(200).json({
            status: 200,
            success: true,
            message: "Background image retrieved successfully",
            data: [backgroundImg]
        });
    } 
    catch (error) {
        return res.status(500).json({
            status: 500,
            success: false,
            message: error.message,
            data: []
        });
    }
};
