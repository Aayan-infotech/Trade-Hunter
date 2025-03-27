const Blog = require('../models/blogModel');

// Create a new blog post with optional image upload
exports.createBlog = async (req, res) => {
    try {
      const { title, content } = req.body;
      const image = req.files && req.files.length > 0 ? req.files[0].location : "";
      const newBlog = new Blog({ title, content, image });
      const savedBlog = await newBlog.save();
      res.status(201).json(savedBlog);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  
exports.getBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find();
    res.status(200).json(blogs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });
    res.status(200).json(blog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateBlog = async (req, res) => {
    try {
      const { title, content } = req.body;
      
      // Debug logs to check incoming file data
      // console.log("req.file:", req.file);
      // console.log("req.files:", req.files);
      
      let imageUrl = "";
      // Check if req.file exists (if using single file upload)
      if (req.file && req.file.location) {
        imageUrl = req.file.location;
      }
      // If using .any() and multiple files are returned, check req.files
      else if (req.files && req.files.length > 0 && req.files[0].location) {
        imageUrl = req.files[0].location;
      }
      
      // Build the update object – only update image if a new file is provided
      const updateFields = { title, content };
      if (imageUrl) {
        updateFields.image = imageUrl;
      }
      
      const updatedBlog = await Blog.findByIdAndUpdate(
        req.params.id,
        updateFields,
        { new: true }
      );
      
      if (!updatedBlog) {
        return res.status(404).json({ message: "Blog not found" });
      }
      
      res.status(200).json(updatedBlog);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  
  
  

exports.deleteBlog = async (req, res) => {
  try {
    const deletedBlog = await Blog.findByIdAndDelete(req.params.id);
    if (!deletedBlog) return res.status(404).json({ message: "Blog not found" });
    res.status(200).json({ message: "Blog deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
