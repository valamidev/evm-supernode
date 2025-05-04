FROM node:22-alpine
WORKDIR /app
COPY package.json yarn.lock ./
COPY src ./src
COPY tsconfig.json ./tsconfig.json
RUN ls -a
RUN yarn install --frozen-lockfile
RUN yarn build

## this is stage two , where the app actually runs
FROM node:22-alpine
WORKDIR /app
COPY package.json yarn.lock ./
COPY assets ./assets
COPY config.default.json ./config.default.json
RUN yarn install --frozen-lockfile --production=true
COPY --from=0 /app/dist ./dist
EXPOSE 443
EXPOSE 8080
CMD ["yarn", "start:docker"]