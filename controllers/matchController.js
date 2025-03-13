const JobPost = require('../models/jobpostModel');
const Hunter = require('../models/hunterModel');
const Provider = require('../models/providerModel');

exports.getMatchedData = async (req, res) => {
    try {
        const { jobPostId, hunterId, providerId } = req.body;
        
        if (!jobPostId || !hunterId || !providerId) {
            return res.status(400).json({ message: "All three IDs are required.", status: false, data: [] });
        }

        // Fetch documents from DB
        const jobPost = await JobPost.findById(jobPostId);
        const hunter = await Hunter.findById(hunterId);
        const provider = await Provider.findById(providerId);

        if (!jobPost || !hunter || !provider) {
            return res.status(404).json({ message: "One or more records not found.", status: false,  });
        }

        // Send the response
        res.status(200).json({
            message: "Data fetched successfully.",
            status: true,
            data: {
                jobPost,
                hunter,
                provider
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error.", status: false, data: [] });
    }
};