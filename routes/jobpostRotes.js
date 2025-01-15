const express = require('express');
const router = express.Router();
const jobPostController = require('../controllers/jobpostController');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/job-posts', upload.single('document'), jobPostController.createJobPost);
router.get('/job-posts', jobPostController.getAllJobPosts);
router.get('/job-posts/:id', jobPostController.getJobPostById);
router.put('/job-posts/:id', upload.single('document'), jobPostController.updateJobPost);
router.delete('/job-posts/:id', jobPostController.deleteJobPost);


module.exports = router;