declare module "pear-bridge";
declare module "pear-electron";

declare type PearUpdate = {
  app?: boolean;
  version?: {
    fork?: number;
    length?: number;
  };
};

declare const Pear: {
  updates(fn: (update: PearUpdate) => void): void;
  exit(): void;
  restart(opts?: { platform?: boolean }): void;
  reload(): void;
};

declare module "pear-updates" {
  export default function updates(fn: (update: any) => void): void;
}

declare module "pear-ipc" {
  export default function ipc(
    channel: string,
    callback: (event: any, ...args: any[]) => void,
  ): void;
}
