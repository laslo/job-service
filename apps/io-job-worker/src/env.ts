export interface IoWorkerEnv {
  readonly smtpHost: string;
  readonly smtpPort: number;
  readonly from: string;
}

const DEFAULT_SMTP_HOST = "localhost";
const DEFAULT_SMTP_PORT = 1025;
const DEFAULT_FROM = "jobs@local.dev";

export function readIoWorkerEnv(env: NodeJS.ProcessEnv = process.env): IoWorkerEnv {
  const smtpHost = env.SMTP_HOST?.trim() || DEFAULT_SMTP_HOST;
  const rawPort = env.SMTP_PORT?.trim();
  const smtpPort = rawPort ? Number.parseInt(rawPort, 10) : DEFAULT_SMTP_PORT;
  if (!Number.isInteger(smtpPort) || smtpPort <= 0 || smtpPort > 65_535) {
    throw new Error(`Invalid SMTP_PORT=${String(env.SMTP_PORT)}`);
  }
  const from = env.SMTP_FROM?.trim() || DEFAULT_FROM;
  return { smtpHost, smtpPort, from };
}

