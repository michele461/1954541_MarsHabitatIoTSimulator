FROM node:20-alpine AS automation-engine-build
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
RUN pnpm --filter automation-engine build

FROM node:20-alpine AS automation-engine
WORKDIR /workspace
COPY --from=automation-engine-build /workspace/node_modules ./node_modules
COPY --from=automation-engine-build /workspace/common/common.constants/package.json ./common/common.constants/package.json
COPY --from=automation-engine-build /workspace/common/common.constants/dist ./common/common.constants/dist
COPY --from=automation-engine-build /workspace/common/common.constants/node_modules ./common/common.constants/node_modules
COPY --from=automation-engine-build /workspace/common/common.types/package.json ./common/common.types/package.json
COPY --from=automation-engine-build /workspace/common/common.types/dist ./common/common.types/dist
COPY --from=automation-engine-build /workspace/common/common.types/node_modules ./common/common.types/node_modules
COPY --from=automation-engine-build /workspace/common/common.functions/package.json ./common/common.functions/package.json
COPY --from=automation-engine-build /workspace/common/common.functions/dist ./common/common.functions/dist
COPY --from=automation-engine-build /workspace/common/common.functions/node_modules ./common/common.functions/node_modules
COPY --from=automation-engine-build /workspace/common/driver.mongo/package.json ./common/driver.mongo/package.json
COPY --from=automation-engine-build /workspace/common/driver.mongo/dist ./common/driver.mongo/dist
COPY --from=automation-engine-build /workspace/common/driver.mongo/node_modules ./common/driver.mongo/node_modules
COPY --from=automation-engine-build /workspace/common/driver.rabbit/package.json ./common/driver.rabbit/package.json
COPY --from=automation-engine-build /workspace/common/driver.rabbit/dist ./common/driver.rabbit/dist
COPY --from=automation-engine-build /workspace/common/driver.rabbit/node_modules ./common/driver.rabbit/node_modules
COPY --from=automation-engine-build /workspace/apps/automation-engine/package.json ./apps/automation-engine/package.json
COPY --from=automation-engine-build /workspace/apps/automation-engine/dist ./apps/automation-engine/dist
COPY --from=automation-engine-build /workspace/apps/automation-engine/node_modules ./apps/automation-engine/node_modules
WORKDIR /workspace/apps/automation-engine
CMD ["node", "dist/index.js"]