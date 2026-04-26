import { Global, Module } from "@nestjs/common";

import { JobServiceDbClient } from "./db.client.js";

@Global()
@Module({
  providers: [JobServiceDbClient],
  exports: [JobServiceDbClient],
})
export class DbModule {}
