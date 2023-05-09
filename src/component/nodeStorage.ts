import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  DataSource,
  Index,
  LessThanOrEqual,
} from "typeorm";

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
      type: "sqlite",
      database: "nodeStore.sqlite",
      entities: [RpcNodes],
      synchronize: true,
    });

    await this.data.initialize();
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

  async upsert(node: RpcNodes): Promise<void> {
    try {
      await this.data.manager.insert(RpcNodes, node);
    } catch (error) {
      await this.data.manager.update(
        RpcNodes,
        { rpcAddress: node.rpcAddress },
        {
          latency: node.latency,
          errorCount: node.errorCount,
          rateLimit: node.rateLimit,
        }
      );
    }
  }
}
