import { sendError } from '../utils/response.js';

export function validate(schema, property = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[property]);
    if (!result.success) {
      const firstIssue = result.error.issues[0]?.message || 'Invalid input data';
      return sendError(res, firstIssue, 400);
    }
    req[property] = result.data;
    return next();
  };
}
