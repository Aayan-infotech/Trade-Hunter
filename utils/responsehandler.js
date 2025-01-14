const apiResponse = {
    success: (res, message, data = null, statusCode = 200) => {
      const response = {
        statusCode,
        success: true,
        message
        
      };
      if (data !== null) {
        response.data = data;
      }
      res.status(statusCode).json(response);
    },
  
    error: (res, message, statusCode = 500, data = null) => {
      const response = {
        statusCode,
        success: false,
        message
      };
      if (data !== null) {
        response.data = data;
      }
      res.status(statusCode).json(response);
    },
  };
  
  module.exports = apiResponse;
  