import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  DataSource,
  Index,
  LessThanOrEqual,
} from "typeorm";

import Database from "better-sqlite3";

@Entity()
@Index(["rpcAddress"], { unique: true })
export class RpcNodes {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column()
  chainName: string;

  @Column()
  chainId: number;

  @Column()
  rpcAddress: string;

  @Column()
  latency: number;

  @Column()
  errorCount: number;

  @Column()
  rateLimit: number;
}

export class NodeStorageRepository {
  private static instance: NodeStorageRepository;
  private data: DataSource;
  private nativeDb: any;

  private constructor() {}

  public static async init(): Promise<NodeStorageRepository> {
    if (!NodeStorageRepository.instance) {
      NodeStorageRepository.instance = new NodeStorageRepository();

      await NodeStorageRepository.instance.connect();
    }
    return NodeStorageRepository.instance;
  }

  public static getInstance(): NodeStorageRepository {
    if (!NodeStorageRepository.instance) {
      NodeStorageRepository.instance = new NodeStorageRepository();

      NodeStorageRepository.instance.connect();
    }
    return NodeStorageRepository.instance;
  }

  public async connect() {
    this.data = new DataSource({
      type: "better-sqlite3",
      database: "nodeStore.sqlite",
      entities: [RpcNodes],
      synchronize: true,
    });

    await this.data.initialize();

    this.nativeDb = new Database("nodeStore.sqlite");
  }

  async findStartNodes(chainId: number): Promise<RpcNodes[]> {
    return this.data.manager.find(RpcNodes, {
      where: {
        chainId,
        errorCount: 0,
        rateLimit: 0,
        latency: LessThanOrEqual(1000),
      },
      order: { latency: "ASC" },
    });
  }

  async findAll(): Promise<RpcNodes[]> {
    return this.data.manager.find(RpcNodes);
  }

  async upsert(node: RpcNodes, update = 0): Promise<void> {
    try {
      if (update === 0) {
        const insertQuery = this.nativeDb.prepare(`
        REPLACE INTO rpc_nodes (chainName, chainId, rpcAddress, latency, errorCount, rateLimit)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

        await insertQuery.run(
          node.chainName,
          node.chainId,
          node.rpcAddress,
          node.latency,
          node.errorCount,
          node.rateLimit
        );
      }
    } catch (error) {
      console.log("Node Upsert error", error);

      throw error;
    }
  }
}
