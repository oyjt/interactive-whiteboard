/** 保存当前页面的快照与撤销位置，默认最多保留 50 次编辑及初始状态。 */
export class SnapshotHistory {
  private states: string[];
  private index = 0;
  private limit: number;

  constructor(initial: string, limit = 50) {
    this.states = [initial];
    this.limit = limit;
  }

  get current() {
    return this.states[this.index];
  }
  get canUndo() {
    return this.index > 0;
  }
  get canRedo() {
    return this.index < this.states.length - 1;
  }

  /**
   * 提交快照；重复内容不会占用历史，撤销后编辑会截断重做分支。
   * @param state 序列化后的画布状态。
   * @returns 是否写入了新的历史记录。
   */
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
