/**
 * Topic registry — the source of truth for Kafka infrastructure-as-code.
 *
 * Adding or changing a topic here is the only supported way to evolve broker
 * state; `pnpm kafka:topics` reads this file and converges the cluster
 * (idempotent: existing topics are left alone, missing topics are created).
 *
 * Partitions are sized for the worker stage that will consume them:
 *  - `jobs.created` (Stage 4+): partition by `jobId` so per-job ordering is
 *    preserved. 3 partitions is comfortable for the local-dev single-broker
 *    setup and large enough to exercise consumer-group rebalancing in tests.
 *
 * Replication factor is 1 in dev (single broker). Stage 12 swaps in a
 * managed-Kafka manifest with RF >= 3.
 */

export interface TopicSpec {
  readonly name: string;
  readonly partitions: number;
  readonly replicationFactor: number;
  /** Optional broker-side topic configs (e.g. retention, cleanup policy). */
  readonly configEntries?: Readonly<Record<string, string>>;
}

export const Topics = {
  JobsCreated: "jobs.created",
} as const;

export type TopicName = (typeof Topics)[keyof typeof Topics];

export const TOPIC_SPECS: readonly TopicSpec[] = [
  {
    name: Topics.JobsCreated,
    partitions: 3,
    replicationFactor: 1,
    configEntries: {
      // 7 days; long enough for replay during dev, short enough that a
      // forgotten container does not eat the disk.
      "retention.ms": String(7 * 24 * 60 * 60 * 1000),
      "cleanup.policy": "delete",
    },
  },
];

export const ConsumerGroups = {
  /** Stage-4 stub: logs every message to stdout, commits offsets safely. */
  JobEventsLogger: "job-events-logger",
  /**
   * Stage-5 CPU-bound worker. Distinct group id from the logger so both
   * processes receive the full message stream — kafkajs delivers each
   * message to exactly one consumer per group.
   */
  CpuJobWorker: "cpu-job-worker",
} as const;

export type ConsumerGroupId = (typeof ConsumerGroups)[keyof typeof ConsumerGroups];
