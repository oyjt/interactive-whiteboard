/** 保存当前页面的快照与撤销位置，默认最多保留 50 次编辑及初始状态。 */
export class SnapshotHistory {
  private states: string[];
  private index = 0;
  private limit: number;

  /** 以初始快照建立页面历史，并设置编辑数量上限。 */
  constructor(initial: string, limit = 50) {
    this.states = [initial];
    this.limit = limit;
  }

  /** 读取当前历史位置的快照。 */
  get current() {
    return this.states[this.index];
  }
  /** 当前是否存在可撤销的快照。 */
  get canUndo() {
    return this.index > 0;
  }
  /** 当前是否存在可重做的快照。 */
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

  /** 预览相邻快照，不改变历史位置。 */
  peek(direction: -1 | 1) {
    return this.states[this.index + direction];
  }

  /** 在目标快照存在时移动历史位置。 */
  move(direction: -1 | 1) {
    if (this.peek(direction) !== undefined) this.index += direction;
  }
}
