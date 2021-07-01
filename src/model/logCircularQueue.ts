export class LogCircularQueue<T> {
  private maxSize: number;
  private data: T[];
  private head: number;
  private tail: number;

  constructor(k: number) {
    this.data = [];
    this.maxSize = k;
    this.head = 0;
    this.tail = -1;
  }

  enQueue(element: T): boolean {
    if (this.isFull()) this.deQueue();
    this.tail = (this.tail + 1) % this.maxSize;
    this.data[this.tail] = element;
    return true;
  }

  deQueue(): boolean {
    if (this.isEmpty()) return false;
    if (this.head === this.tail) (this.head = 0), (this.tail = -1);
    else this.head = (this.head + 1) % this.maxSize;
    return true;
  }

  front(): T | -1 {
    return this.isEmpty() ? -1 : this.data[this.head];
  }

  rear(): T | -1 {
    return this.isEmpty() ? -1 : this.data[this.tail];
  }

  isEmpty(): boolean {
    return this.tail === -1;
  }

  isFull(): boolean {
    return !this.isEmpty() && (this.tail + 1) % this.maxSize === this.head;
  }

  getQueue(): T[] {
    return this.data;
  }
}
