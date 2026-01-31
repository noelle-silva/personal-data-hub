class HttpError extends Error {
  /**
   * @param {number} statusCode HTTP 状态码
   * @param {string} message 面向用户/接口返回的错误信息
   * @param {string|null} code 稳定的错误码（可选）
   * @param {object|null} details 附加信息（可选）
   */
  constructor(statusCode, message, code = null, details = null) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

module.exports = HttpError;

