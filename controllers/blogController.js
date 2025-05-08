const Blog = require('../models/blogModel');

exports.createBlog = async (req, res) => {
  try {
    const { title, content } = req.body;
    const image = req.files && req.files.length > 0 ? req.files[0].location : "";
    const newBlog = new Blog({ title, content, image });
    const savedBlog = await newBlog.save();
    res.status(201).json({
      status: 201,
      message: "Blog created successfully",
      blog: savedBlog
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      message: "Server Error",
      error: error.message
    });
  }
};

exports.getBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find();
    res.status(200).json({
      status: 200,
      message: "Blogs retrieved successfully",
      blog: blogs
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      message: "Internal server error",
      error: error.message
    });
  }
};

exports.getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({
        status: 404,
        message: "Blog not found"
      });
    }
    res.status(200).json({
      status: 200,
      message: "Blog retrieved successfully",
      blog: blog
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      message: "Server Error",
      error: error.message
    });
  }
};

exports.updateBlog = async (req, res) => {
  try {
    const { title, content } = req.body;
    
    let imageUrl = "";
    if (req.file && req.file.location) {
      imageUrl = req.file.location;
    } else if (req.files && req.files.length > 0 && req.files[0].location) {
      imageUrl = req.files[0].location;
    }
    
    const updateFields = { title, content };
    if (imageUrl) {
      updateFields.image = imageUrl;
    }
    
    const updatedBlog = await Blog.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    );
    
    if (!updatedBlog) {
      return res.status(404).json({
        status: 404,
        message: "Blog not found"
      });
    }
    
    res.status(200).json({
      status: 200,
      message: "Blog updated successfully",
      blog: updatedBlog
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      message: "Server Error",
      error: error.message
    });
  }
};

exports.deleteBlog = async (req, res) => {
  try {
    const deletedBlog = await Blog.findByIdAndDelete(req.params.id);
    if (!deletedBlog) {
      return res.status(404).json({
        status: 404,
        message: "Blog not found"
      });
    }
    res.status(200).json({
      status: 200,
      message: "Blog deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      message: "Server Error",
      error: error.message
    });
  }
};
