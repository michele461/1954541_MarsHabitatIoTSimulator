FROM node:20-alpine AS ingestion-service-build
WORKDIR /workspace
ENV CI=true
RUN npm install -g pnpm
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter common.types build
RUN pnpm --filter common.constants build
RUN pnpm --filter common.functions build
RUN pnpm --filter driver.rabbit build
RUN pnpm --filter ingestion-service build

FROM node:20-alpine AS ingestion-service
WORKDIR /workspace
COPY --from=ingestion-service-build /workspace/node_modules ./node_modules
COPY --from=ingestion-service-build /workspace/common/common.constants/package.json ./common/common.constants/package.json
COPY --from=ingestion-service-build /workspace/common/common.constants/dist ./common/common.constants/dist
COPY --from=ingestion-service-build /workspace/common/common.constants/node_modules ./common/common.constants/node_modules
COPY --from=ingestion-service-build /workspace/common/common.types/package.json ./common/common.types/package.json
COPY --from=ingestion-service-build /workspace/common/common.types/dist ./common/common.types/dist
COPY --from=ingestion-service-build /workspace/common/common.types/node_modules ./common/common.types/node_modules
COPY --from=ingestion-service-build /workspace/common/common.functions/package.json ./common/common.functions/package.json
COPY --from=ingestion-service-build /workspace/common/common.functions/dist ./common/common.functions/dist
COPY --from=ingestion-service-build /workspace/common/common.functions/node_modules ./common/common.functions/node_modules
COPY --from=ingestion-service-build /workspace/common/driver.rabbit/package.json ./common/driver.rabbit/package.json
COPY --from=ingestion-service-build /workspace/common/driver.rabbit/dist ./common/driver.rabbit/dist
COPY --from=ingestion-service-build /workspace/common/driver.rabbit/node_modules ./common/driver.rabbit/node_modules
COPY --from=ingestion-service-build /workspace/apps/ingestion-service/package.json ./apps/ingestion-service/package.json
COPY --from=ingestion-service-build /workspace/apps/ingestion-service/dist ./apps/ingestion-service/dist
COPY --from=ingestion-service-build /workspace/apps/ingestion-service/node_modules ./apps/ingestion-service/node_modules
WORKDIR /workspace/apps/ingestion-service
CMD ["node", "dist/index.js"]