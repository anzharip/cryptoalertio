export class LogStack<T> {
  private maxLength: number;
  data: T[];

  constructor(maxLength: number) {
    this.data = [];
    this.maxLength = maxLength;
  }

  push(element: T): boolean {
    if (this.data.length >= this.maxLength) {
      this.data = this.data.slice(1, this.data.length);
      this.data.push(element);
    } else {
      this.data.push(element);
    }
    return true;
  }

  getQueue(): T[] {
    return this.data;
  }
}
