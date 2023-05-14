# Base image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and yarn.lock
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile --production=true

# Copy the rest of the application code
COPY . .

# Build the TypeScript code
RUN yarn build

# Set the environment variables
ENV NODE_ENV=production

# Expose the application port
EXPOSE 443
EXPOSE 8080

# Start the application
CMD ["yarn", "start"]