# Kafka (local development)

Single-broker [Apache Kafka 3.9](https://kafka.apache.org/) in **KRaft** mode (no ZooKeeper), defined as a service in [`../docker-compose.dev.yml`](../docker-compose.dev.yml). Production posture (managed Kafka or Strimzi) is captured in [ADR-0001](../../docs/adr/0001-use-kafka-for-job-events-and-worker-scaling.md).

## Bootstrap URL

| Where the client runs                           | Bootstrap URL    |
| ----------------------------------------------- | ---------------- |
| Host (the API, workers, kafkajs CLI, this repo) | `localhost:9092` |

The advertised listener intentionally points at `localhost`; container-to-broker traffic is out of scope until workers move into compose in a later stage. Override the host port with `KAFKA_PORT` (and the matching `KAFKA_BOOTSTRAP_BROKERS`) in `.env` if 9092 collides locally.

## Lifecycle

```bash
pnpm kafka:up         # start the broker, wait for healthcheck
pnpm kafka:topics     # converge topic state (idempotent)
pnpm kafka:down       # stop the broker; the volume is preserved
pnpm stack:down       # tear everything down (Postgres + Kafka)
```

The named volume `job-service-dev_kafka-data` keeps log segments across restarts so consumer-group offsets survive `kafka:down`. Remove it manually with `docker volume rm job-service-dev_kafka-data` if you need a clean slate.

## Topics

The source of truth is [`packages/kafka/src/topics.ts`](../../packages/kafka/src/topics.ts). The current registry:

| Topic          | Partitions | Replication | Retention | Producer           | Consumer groups                                                     |
| -------------- | ---------- | ----------- | --------- | ------------------ | ------------------------------------------------------------------- |
| `jobs.created` | 3          | 1           | 7 days    | `apps/job-service` | `job-events-logger` (logger), `cpu-job-worker` (CPU stub processor) |

Auto-creation is **disabled** on the broker so typos surface as connection errors instead of silently spawning unconfigured single-partition topics. Add or change a topic by editing `topics.ts` and running `pnpm kafka:topics`.

## Turning Kafka off

For Stage 1–3 dev loops where the broker is unnecessary, set `KAFKA_ENABLED=false` in `.env`:

- The API logs a warning at startup and skips the producer; `POST /v1/jobs` still works against Postgres.
- `pnpm worker:logger` and `pnpm worker:cpu` exit 0 with a notice.
- `pnpm kafka:topics` exits 0 with a notice (safe to call from CI / pre-flight scripts).

## Operator helpers

```bash
# List topics from inside the broker container.
docker exec -it job-service-kafka /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 --list

# Describe a single topic.
docker exec -it job-service-kafka /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 --describe --topic jobs.created

# Tail messages with the bundled console consumer.
docker exec -it job-service-kafka /opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 --topic jobs.created --from-beginning
```
