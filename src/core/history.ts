/** Snapshot history. Keep at most 50 edits plus the initial state. */
export class SnapshotHistory {
  private states: string[];
  private index = 0;
  private limit: number;

  constructor(initial: string, limit = 50) {
    this.states = [initial];
    this.limit = limit;
  }

  get current() { return this.states[this.index]; }
  get canUndo() { return this.index > 0; }
  get canRedo() { return this.index < this.states.length - 1; }

  push(state: string) {
    if (state === this.current) return false;
    this.states.splice(this.index + 1);
    this.states.push(state);
    if (this.states.length > this.limit + 1) this.states.shift();
    this.index = this.states.length - 1;
    return true;
  }

  peek(direction: -1 | 1) {
    return this.states[this.index + direction];
  }

  move(direction: -1 | 1) {
    if (this.peek(direction) !== undefined) this.index += direction;
  }
}
