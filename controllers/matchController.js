const JobPost = require('../models/jobpostModel');
const Hunter = require('../models/hunterModel');
const Provider = require('../models/providerModel');

// jobPostId
//senderId   Hunter/Provider
//receiverId  Hunter/Provider
exports.getMatchedData = async (req, res) => {
    try {
        const { jobPostId, senderId, receiverId } = req.body;
        
        if (!jobPostId || !senderId || !receiverId) {
            return res.status(400).json({ message: "All three IDs are required.", status: false, data: {} });
        }

        // Fetch documents from DB
        const jobPost = await JobPost.findById(jobPostId);
        
        const senderHunter = await Hunter.findById(senderId);
        const senderProvider = await Provider.findById(senderId);
        const receiverHunter = await Hunter.findById(receiverId);
        const receiverProvider = await Provider.findById(receiverId);

        const sender = senderHunter || senderProvider;
        const receiver = receiverHunter || receiverProvider;

        if (!jobPost || !sender || !receiver) {
            return res.status(404).json({ message: "One or more records not found.", status: false, data: {} });
        }

        // Determine sender and receiver roles
        const senderType = senderHunter ? "hunter" : "provider";
        const receiverType = receiverHunter ? "hunter" : "provider";

        // Send the response
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