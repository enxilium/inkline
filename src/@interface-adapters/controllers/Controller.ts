export interface Controller<TArgs extends unknown[], TResult> {
    handle(...args: TArgs): Promise<TResult>;
}
