class HttpError extends Error {
  constructor(message, errorcode) {
    super(message);
    this.code = errorcode;
  }
}

module.exports = HttpError;
