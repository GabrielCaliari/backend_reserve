export interface IAPIToken {
  create?(data: any): Promise<any>;
  get(): Promise<any>;
}
