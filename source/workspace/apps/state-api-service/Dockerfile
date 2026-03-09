FROM node:20-alpine AS state-api-service-build
WORKDIR /workspace
ENV CI=true
RUN npm install -g pnpm
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter common.types build
RUN pnpm --filter common.constants build
RUN pnpm --filter common.functions build
RUN pnpm --filter driver.mongo build
RUN pnpm --filter driver.rabbit build
RUN pnpm --filter state-api-service build

FROM node:20-alpine AS state-api-service
WORKDIR /workspace
COPY --from=state-api-service-build /workspace/node_modules ./node_modules
COPY --from=state-api-service-build /workspace/common/common.constants/package.json ./common/common.constants/package.json
COPY --from=state-api-service-build /workspace/common/common.constants/dist ./common/common.constants/dist
COPY --from=state-api-service-build /workspace/common/common.constants/node_modules ./common/common.constants/node_modules
COPY --from=state-api-service-build /workspace/common/common.types/package.json ./common/common.types/package.json
COPY --from=state-api-service-build /workspace/common/common.types/dist ./common/common.types/dist
COPY --from=state-api-service-build /workspace/common/common.types/node_modules ./common/common.types/node_modules
COPY --from=state-api-service-build /workspace/common/common.functions/package.json ./common/common.functions/package.json
COPY --from=state-api-service-build /workspace/common/common.functions/dist ./common/common.functions/dist
COPY --from=state-api-service-build /workspace/common/common.functions/node_modules ./common/common.functions/node_modules
COPY --from=state-api-service-build /workspace/common/driver.mongo/package.json ./common/driver.mongo/package.json
COPY --from=state-api-service-build /workspace/common/driver.mongo/dist ./common/driver.mongo/dist
COPY --from=state-api-service-build /workspace/common/driver.mongo/node_modules ./common/driver.mongo/node_modules
COPY --from=state-api-service-build /workspace/common/driver.rabbit/package.json ./common/driver.rabbit/package.json
COPY --from=state-api-service-build /workspace/common/driver.rabbit/dist ./common/driver.rabbit/dist
COPY --from=state-api-service-build /workspace/common/driver.rabbit/node_modules ./common/driver.rabbit/node_modules
COPY --from=state-api-service-build /workspace/apps/state-api-service/package.json ./apps/state-api-service/package.json
COPY --from=state-api-service-build /workspace/apps/state-api-service/dist ./apps/state-api-service/dist
COPY --from=state-api-service-build /workspace/apps/state-api-service/node_modules ./apps/state-api-service/node_modules
WORKDIR /workspace/apps/state-api-service
CMD ["node", "dist/server.js"]