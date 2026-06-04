export class ExecutionContext {
  public executionId: string;
  public variables: Record<string, any>;
  public lastResult: any;

  constructor(executionId: string) {
    this.executionId = executionId;
    this.variables = {};
    this.lastResult = null;
  }

  set(key: string, value: any) {
    this.variables[key] = value;
  }

  get(key: string) {
    return this.variables[key];
  }

  setLast(result: any) {
    this.lastResult = result;
  }

  getLast() {
    return this.lastResult;
  }
}
