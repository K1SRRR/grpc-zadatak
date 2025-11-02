FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY server/package*.json ./

# Install dependencies
RUN npm install

# Copy shared proto files
COPY proto ../proto

# Copy server code
COPY server/server.js ./

# Expose gRPC port
EXPOSE 50051

# Start the server
CMD ["npm", "start"]
