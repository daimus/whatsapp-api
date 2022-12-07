import _ from 'lodash';

export default class R {
  public data: any;
  public httpCode: number;
  public page: any;
  public message: string;

  constructor({ data = null, page = null, message = null, httpCode = 200 }) {
    this.data = data;
    this.httpCode = httpCode;
    this.page = page;
    this.message = message;

    if (this.httpCode === 200 && this.message === null) {
      if (_.isEmpty(data)) {
        this.httpCode = 404;
      }
    }
  }
}
