// ----------------------------------------------------------------
// SUCCESS RESPONSE
// ----------------------------------------------------------------
const successResponse = (res, { message = "Success", data = null, statusCode = 200 } = {}) => {
  const response = {
    success: true,
    message,
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

// ----------------------------------------------------------------
// ERROR RESPONSE
// ----------------------------------------------------------------
const errorResponse = (res, { message = "Something went wrong", statusCode = 500, errors = null } = {}) => {
  const response = {
    success: false,
    message,
  };

  if (errors !== null) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

// ----------------------------------------------------------------
// VALIDATION ERROR RESPONSE
// ----------------------------------------------------------------
const validationErrorResponse = (res, errors) => {
  return res.status(400).json({
    success: false,
    message: "Bad request",
    errors,
  });
};

// ----------------------------------------------------------------
// NOT FOUND RESPONSE
// ----------------------------------------------------------------
const notFoundResponse = (res, message = "Resource not found") => {
  return res.status(404).json({
    success: false,
    message,
  });
};

// ----------------------------------------------------------------
// UNAUTHORIZED RESPONSE
// ----------------------------------------------------------------
const unauthorizedResponse = (res, message = "Unauthorized") => {
  return res.status(401).json({
    success: false,
    message,
  });
};

// ----------------------------------------------------------------
// FORBIDDEN RESPONSE
// ----------------------------------------------------------------
const forbiddenResponse = (res, message = "Access denied") => {
  return res.status(403).json({
    success: false,
    message,
  });
};

module.exports = {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
};