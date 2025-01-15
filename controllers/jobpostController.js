const JobPost = require('../models/jobpostModel');

const createJobPost = async (req, res) => {
    try {
      const { title, location, estimatedBudget, radius, serviceType, service, timeframe, requirements } = req.body;
      
      let documentUrl = null;
      
      if (req.file) {
        const params = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: req.file.filename,
          Body: req.file.buffer
        };
  
        const uploadedFile = await s3.upload(params).promise();
        documentUrl = uploadedFile.Location;
      }
  
      const newJobPost = new JobPost({
        title,
        location,
        estimatedBudget,
        radius,
        serviceType,
        service,
        timeframe,
        document: documentUrl,
        requirements
      });
  
      await newJobPost.save();
  
      res.status(201).json({ message: 'Job post created successfully', newJobPost });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  

  const getAllJobPosts = async (req, res) => {
    try {
      const jobPosts = await JobPost.find({});
      res.status(200).json(jobPosts);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  
  const getJobPostById = async (req, res) => {
    try {
      const jobPostId = req.params.id;
      const jobPost = await JobPost.findById(jobPostId);
  
      if (!jobPost) {
        return res.status(404).json({ message: 'Job post not found' });
      }
  
      res.status(200).json(jobPost);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  

  const updateJobPost = async (req, res) => {
    try {
      const jobPostId = req.params.id;
      const updatedData = req.body;
  
      const updatedJobPost = await JobPost.findByIdAndUpdate(jobPostId, updatedData, {
        new: true,
        runValidators: true
      });
  
      if (!updatedJobPost) {
        return res.status(404).json({ message: 'Job post not found' });
      }
  
      res.status(200).json({ message: 'Job post updated successfully', updatedJobPost });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  const deleteJobPost = async (req, res) => {
    try {
      const jobPostId = req.params.id;
      const deletedJobPost = await JobPost.findByIdAndDelete(jobPostId);
  
      if (!deletedJobPost) {
        return res.status(404).json({ message: 'Job post not found' });
      }
  
      res.status(200).json({ message: 'Job post deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  
  module.exports = {
    createJobPost,
    getAllJobPosts,
    getJobPostById,
    updateJobPost,
    deleteJobPost
  };