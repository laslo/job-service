import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { useContainer } from "class-validator";

import { AppModule } from "./app.module.js";
import { GlobalExceptionFilter } from "./common/exception.filter.js";
import { buildValidationPipe } from "./common/validation.js";
import { readApiEnv } from "./env.js";

const API_PREFIX = "v1";

async function bootstrap(): Promise<void> {
  const env = readApiEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix(API_PREFIX, {
    exclude: ["healthz", "readyz"],
  });
  app.useGlobalPipes(buildValidationPipe());
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.enableShutdownHooks();
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  const config = new DocumentBuilder()
    .setTitle("Job Service API")
    .setDescription("Create and fetch background jobs.")
    .setVersion("0.1.0")
    .addServer(`http://localhost:${env.port}`)
    .addTag("jobs")
    .addTag("health")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document, {
    jsonDocumentUrl: "docs/openapi.json",
    yamlDocumentUrl: "docs/openapi.yaml",
  });

  await app.listen(env.port, env.host);
  new Logger("Bootstrap").log(
    `Job service listening on http://${env.host}:${env.port} (docs: /docs)`,
  );
}

bootstrap().catch((err: unknown) => {
  process.stderr.write(
    `Failed to start job service: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`,
  );
  process.exit(1);
});
