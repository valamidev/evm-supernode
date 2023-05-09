import { EventEmitter } from "eventemitter3";

export class EventHandler extends EventEmitter {
  private static instance: EventHandler;

  private constructor() {
    super();
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
}
