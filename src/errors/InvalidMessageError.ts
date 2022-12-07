export default class InvalidMessageError extends Error {
  private status: number;

  constructor(message = '') {
    super(message ? message : `Invalid Message`);
    this.name = 'InvalidMessageError';
    this.status = 400;
  }
}
