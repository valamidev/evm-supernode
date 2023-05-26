import EventEmitter from "node:events";


export class EventHandler extends EventEmitter {
  private static instance: EventHandler;

  private constructor() {
    super();

    this.on('error', (err) => {
      console.error('EventEmitter error: ', err);
    });
  }

  public static getInstance(): EventHandler {
    if (!EventHandler.instance) {
      EventHandler.instance = new EventHandler();
    }
    return EventHandler.instance;
  }

  public EmitBlock(blockData: Record<string, unknown>) {
    this.emit("newBlock", blockData);
  }

  public EmitRpcNodes(rpcNodeData: Record<string, unknown>) {
    this.emit("rpcNode", rpcNodeData);
  }
}
