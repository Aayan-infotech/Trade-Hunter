const JobPost = require('../models/jobpostModel');
const Hunter = require('../models/hunterModel');
const Provider = require('../models/providerModel');

exports.getMatchedData = async (req, res) => {
    try {
        const { jobPostId, senderId, receiverId } = req.body;
        
        if (  !senderId || !receiverId) {
            return res.status(400).json({ message: "All three IDs are required.", status: false, data: {} });
        }

        const jobPost = await JobPost.findById(jobPostId);
        
        const senderHunter = await Hunter.findById(senderId);
        const senderProvider = await Provider.findById(senderId);
        const receiverHunter = await Hunter.findById(receiverId);
        const receiverProvider = await Provider.findById(receiverId);

        const sender = senderHunter || senderProvider;
        const receiver = receiverHunter || receiverProvider;

        if ( !sender || !receiver) {
            return res.status(404).json({ message: "One or more records not found.", status: false, data: {} });
        }

        const senderType = senderHunter ? "hunter" : "provider";
        const receiverType = receiverHunter ? "hunter" : "provider";

        res.status(200).json({
            message: "Data fetched successfully.",
            status: true,
            data: {
                jobPost,
                sender: { ...sender.toObject(), type: senderType },
                receiver: { ...receiver.toObject(), type: receiverType }
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error.", status: false, data: {} });
    }
};


exports.getMatchedDataNotification = async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;

    if (!senderId || !receiverId) {
      return res.status(400).json({ 
        message: "Both senderId and receiverId are required.", 
        status: false, 
        data: {} 
      });
    }

    const senderHunter = await Hunter.findById(senderId);
    const senderProvider = await Provider.findById(senderId);
    const receiverHunter = await Hunter.findById(receiverId);
    const receiverProvider = await Provider.findById(receiverId);

    const sender = senderHunter || senderProvider;
    const receiver = receiverHunter || receiverProvider;

    if (!sender || !receiver) {
      return res.status(404).json({ 
        message: "One or more records not found.", 
        status: false, 
        data: {} 
      });
    }

    const senderType = senderHunter ? "hunter" : "provider";
    const receiverType = receiverHunter ? "hunter" : "provider";
    
    res.status(200).json({
      message: "Data fetched successfully.",
      status: true,
      data: {
        sender: { ...sender.toObject(), type: senderType },
        receiver: { ...receiver.toObject(), type: receiverType }
      }
    });
  } catch (error) {
    console.error("Error in getMatchedDataNotification:", error);
    res.status(500).json({ 
      message: "Internal Server Error.", 
      status: false, 
      data: {} 
    });
  }
};
